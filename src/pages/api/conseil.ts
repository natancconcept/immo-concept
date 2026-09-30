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

const CLAUDE_MODEL = "claude-opus-5";
const LIMITS = {
  perIpWindow: 4,          // demandes par adresse IP…
  windowMs: 10 * 60_000,   // …sur 10 minutes
  perIpDay: 12,            // demandes par adresse IP et par jour
  globalDay: 300,          // plafond total par jour (par instance du serveur)
  maxBodyBytes: 4_000,
};

const env = (k: string): string | undefined => process.env[k] || import.meta.env[k];
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

/** Gemini (Interactions API de Google AI Studio). On essaie les modèles de gauche à droite ;
    si l’un est indisponible, saturé ou renvoie une réponse vide, on passe au suivant. */
const MODELS = ["gemini-3.1-flash-lite", "gemini-3-flash-preview", "gemini-3.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-flash"];

async function askGemini(key: string, prompt: string, schema: object, signal: AbortSignal): Promise<string> {
  const models = [...new Set([env("GEMINI_MODEL"), ...MODELS].filter((m): m is string => !!m))];
  const call = (model: string, withSchema: boolean) => fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    signal,
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      model,
      input: prompt,
      store: false,
      generation_config: { temperature: 0.3 },
      response_format: { type: "text", mime_type: "application/json", ...(withSchema ? { schema } : {}) },
    }),
  });
  const readText = (data: { steps?: { type?: string; content?: { type?: string; text?: string }[] }[] }) =>
    (data?.steps || []).filter((s) => s.type === "model_output").flatMap((s) => s.content || []).map((c) => c.text || "").join("");
  let lastErr = "Gemini : aucun modèle n’a répondu";
  let only429 = true;
  for (const model of models) {
    if (signal.aborted) throw new Error("aborted");
    try {
      let res = await call(model, true);
      // Certains modèles n'acceptent pas le schéma : on redemande sans (le prompt décrit déjà le format).
      if (res.status === 400) res = await call(model, false);
      if (res.status === 503) {
        await new Promise((r) => setTimeout(r, 1500));
        if (signal.aborted) throw new Error("aborted");
        res = await call(model, true);
      }
      if (res.status === 429) {
        lastErr = `Gemini ${model} 429`;
        console.warn(`[api/conseil] Gemini ${model} quota atteint, essai du modèle suivant`);
        continue;
      }
      only429 = false;
      if (!res.ok) {
        lastErr = `Gemini ${model} ${res.status} ${(await res.text()).slice(0, 200)}`;
        console.warn(`[api/conseil] Gemini ${model} indisponible (${res.status}), essai du modèle suivant`);
        continue;
      }
      const text = readText(await res.json());
      if (text.trim()) {
        console.info(`[api/conseil] Gemini ${model} ok`);
        return text;
      }
      lastErr = `Gemini ${model} réponse vide`;
      console.warn(`[api/conseil] Gemini ${model} réponse vide, essai du modèle suivant`);
    } catch (e) {
      if (signal.aborted || (e as Error).name === "AbortError") throw e;
      only429 = false;
      lastErr = e instanceof Error ? e.message : String(e);
      console.warn(`[api/conseil] Gemini ${model} erreur, essai du modèle suivant :`, lastErr);
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
      // Si la demande est refusée par les filtres de sécurité, l'API la relance sur un autre modèle.
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

  // Seules les pages du site peuvent appeler la route.
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
    const text = gKey ? await askGemini(gKey, job.prompt, job.schema, request.signal) : await askClaude(cKey!, job.prompt, job.schema, request.signal);
    const analysis = job.parse(text);
    if (!analysis) {
      console.error("[api/conseil] réponse illisible :", text.slice(0, 500));
      return json({ error: "default" }, 502);
    }
    return json({ analysis });
  } catch (e) {
    if (e instanceof RateLimited) return json({ error: "rate_limited" }, 429);
    if (!request.signal.aborted) console.error("[api/conseil]", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
    return json({ error: "default" }, 502);
  }
};
