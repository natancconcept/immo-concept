/* Analyses rédigées par l'IA.
   - GET  → { enabled } : l'analyse n'est proposée que si une clé d'IA est configurée.
   - POST → { answers } (questionnaire alyah, voir src/lib/analyse.ts)
            ou { sim } (résultat du simulateur, voir src/lib/sim-analyse.ts) : renvoie { analysis } ou { error }.
   Fournisseur : Gemini (GEMINI_API_KEY, offre gratuite de Google AI Studio) s'il est configuré, sinon Claude (ANTHROPIC_API_KEY).
   Protection anti-abus : le prompt est construit ici à partir de réponses vérifiées (impossible d'envoyer
   un texte libre à l'IA), limite de demandes par adresse IP et plafond quotidien. */
import type { APIRoute } from "astro";
import Anthropic from "@anthropic-ai/sdk";
import { sanitizeOlimAnswers } from "../../lib/recommend";
import { ANALYSIS_SCHEMA, analysisPrompt, parseAnalysis } from "../../lib/analyse";
import { SIM_SCHEMA, parseSimAnalysis, sanitizeSimAnswers, simPrompt } from "../../lib/sim-analyse";

export const prerender = false;
/** Vercel : laisser le temps à Gemini (modèles + retries). */
export const maxDuration = 60;

const CLAUDE_MODEL = "claude-opus-5";
const LIMITS = {
  perIpWindow: 4,
  windowMs: 10 * 60_000,
  perIpDay: 12,
  globalDay: 300,
  maxBodyBytes: 4_000,
};

const env = (k: string): string | undefined => {
  const fromProc = process.env[k];
  if (typeof fromProc === "string" && fromProc.trim()) return fromProc.trim();
  const fromAstro = (import.meta.env as Record<string, unknown>)[k];
  if (typeof fromAstro === "string" && fromAstro.trim()) return fromAstro.trim();
  return undefined;
};
const geminiKey = () => env("GEMINI_API_KEY");
const claudeKey = () => env("ANTHROPIC_API_KEY");

/* Compteurs en mémoire. Sur Netlify / Vercel, chaque instance a les siens : c'est une protection
   de base, suffisante pour un site vitrine. Voir le README pour aller plus loin. */
const hits = new Map<string, number[]>();
let day = "", dayCount = 0;
function allow(ip: string): boolean {
  const now = Date.now(), today = new Date().toISOString().slice(0, 10);
  if (today !== day) { day = today; dayCount = 0; hits.clear() }
  if (dayCount >= LIMITS.globalDay) return false;
  const list = hits.get(ip) || [];
  if (list.length >= LIMITS.perIpDay) return false;
  if (list.filter((t) => now - t < LIMITS.windowMs).length >= LIMITS.perIpWindow) return false;
  list.push(now); hits.set(ip, list); dayCount++;
  return true;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

class RateLimited extends Error {}

/** Ne pas passer request.signal à Gemini : sur Vercel il est souvent déjà aborté → 502 immédiat.
    Les modèles 2.5 ne sont plus proposés aux nouvelles clés. */
const MODELS = ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-3-flash-preview", "gemini-3.5-flash", "gemini-3.8-flash"];
const GEMINI_MS = 28_000;

function readGeminiText(data: Record<string, unknown>): string {
  const steps = Array.isArray(data.steps) ? data.steps as { type?: string; content?: { type?: string; text?: string }[] }[] : [];
  const fromSteps = steps.filter((s) => s.type === "model_output" || s.type === "text").flatMap((s) => s.content || []).map((c) => c.text || "").join("");
  if (fromSteps.trim()) return fromSteps;
  const parts = ((data.candidates as { content?: { parts?: { text?: string }[] } }[] | undefined) || [])
    .flatMap((c) => c.content?.parts || []).map((p) => p.text || "").join("");
  if (parts.trim()) return parts;
  return typeof data.text === "string" ? data.text : "";
}

async function askGemini(key: string, prompt: string, schema: object): Promise<string> {
  const models = [...new Set([env("GEMINI_MODEL"), ...MODELS].filter((m): m is string => !!m))];
  const signal = AbortSignal.timeout(GEMINI_MS);
  const headers = { "content-type": "application/json", "x-goog-api-key": key };
  const interact = (model: string, withSchema: boolean) => fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    signal,
    headers,
    body: JSON.stringify({
      model,
      input: prompt,
      store: false,
      generation_config: { temperature: 0.3 },
      response_format: { type: "text", mime_type: "application/json", ...(withSchema ? { schema } : {}) },
    }),
  });
  const generate = (model: string, withSchema: boolean) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    signal,
    headers,
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, responseMimeType: "application/json", ...(withSchema ? { responseSchema: schema } : {}) },
    }),
  });
  let lastErr = "Gemini : aucun modèle n’a répondu";
  let only429 = true;
  for (const model of models) {
    if (signal.aborted) break;
    for (const call of [interact, generate]) {
      try {
        let res = await call(model, true);
        if (res.status === 400) res = await call(model, false);
        if (res.status === 503) {
          await new Promise((r) => setTimeout(r, 1200));
          if (signal.aborted) break;
          res = await call(model, true);
        }
        if (res.status === 429) {
          lastErr = `Gemini ${model} 429`;
          console.warn(`[api/conseil] Gemini ${model} quota atteint, essai du modèle suivant`);
          break;
        }
        only429 = false;
        if (res.status === 404) {
          lastErr = `Gemini ${model} 404`;
          continue;
        }
        if (!res.ok) {
          lastErr = `Gemini ${model} ${res.status} ${(await res.text()).slice(0, 200)}`;
          console.warn(`[api/conseil] Gemini ${model} indisponible (${res.status})`);
          continue;
        }
        const text = readGeminiText(await res.json());
        if (text.trim()) {
          console.info(`[api/conseil] Gemini ${model} ok`);
          return text;
        }
        lastErr = `Gemini ${model} réponse vide`;
      } catch (e) {
        if ((e as Error).name === "TimeoutError" || (e as Error).name === "AbortError") {
          lastErr = "Gemini délai dépassé";
          break;
        }
        only429 = false;
        lastErr = e instanceof Error ? e.message : String(e);
        console.warn(`[api/conseil] Gemini ${model} erreur :`, lastErr);
      }
    }
  }
  if (only429) throw new RateLimited();
  throw new Error(lastErr);
}

/** Claude (API Anthropic), sortie JSON contrainte par le schéma. */
async function askClaude(key: string, prompt: string, schema: Record<string, unknown>, signal: AbortSignal): Promise<string> {
  const client = new Anthropic({ apiKey: key });
  try {
    const msg = await client.beta.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      output_config: { effort: "low", format: { type: "json_schema", schema } },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [{ role: "user", content: prompt }],
    }, { signal });
    if (msg.stop_reason === "refusal") return "";
    return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new RateLimited();
    throw e;
  }
}

export const GET: APIRoute = () => json({ enabled: !!(geminiKey() || claudeKey()) });

export const POST: APIRoute = async ({ request, clientAddress, url }) => {
  const gKey = geminiKey(), cKey = claudeKey();
  if (!gKey && !cKey) return json({ error: "disabled" }, 503);

  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== url.host) return json({ error: "forbidden" }, 403);

  const raw = await request.text();
  if (raw.length > LIMITS.maxBodyBytes) return json({ error: "invalid" }, 413);
  let body: Record<string, unknown> = {};
  try { body = JSON.parse(raw) || {} } catch { body = {} }
  let job: { prompt: string; schema: Record<string, unknown>; parse: (t: string) => unknown } | null = null;
  if (body.sim !== undefined) {
    const sim = sanitizeSimAnswers(body.sim);
    if (sim) job = { prompt: simPrompt(sim), schema: SIM_SCHEMA, parse: parseSimAnalysis };
  } else {
    const answers = sanitizeOlimAnswers(body.answers);
    if (answers) job = { prompt: analysisPrompt(answers), schema: ANALYSIS_SCHEMA, parse: parseAnalysis };
  }
  if (!job) return json({ error: "invalid" }, 400);

  let ip = "inconnue";
  try { ip = clientAddress } catch { ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || ip }
  if (!allow(ip)) return json({ error: "rate_limited" }, 429);

  try {
    const text = gKey ? await askGemini(gKey, job.prompt, job.schema) : await askClaude(cKey!, job.prompt, job.schema, AbortSignal.timeout(GEMINI_MS));
    const analysis = job.parse(text);
    if (!analysis) {
      console.error("[api/conseil] réponse illisible :", text.slice(0, 500));
      return json({ error: "default" }, 502);
    }
    return json({ analysis });
  } catch (e) {
    if (e instanceof RateLimited) return json({ error: "rate_limited" }, 429);
    console.error("[api/conseil]", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
    return json({ error: "default" }, 502);
  }
};
