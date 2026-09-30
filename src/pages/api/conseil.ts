/* Analyse détaillée des villes rédigée par l'IA à partir des réponses du questionnaire alyah.
   - GET  → { enabled } : l'analyse n'est proposée que si une clé d'IA est configurée.
   - POST → { answers } : renvoie { analysis } (voir src/lib/analyse.ts) ou { error }.
   Fournisseur : Gemini (GEMINI_API_KEY, offre gratuite de Google AI Studio) s'il est configuré, sinon Claude (ANTHROPIC_API_KEY).
   Protection anti-abus : le prompt est construit ici à partir de réponses vérifiées (impossible d'envoyer
   un texte libre à l'IA), limite de demandes par adresse IP et plafond quotidien. */
import type { APIRoute } from "astro";
import Anthropic from "@anthropic-ai/sdk";
import { sanitizeOlimAnswers } from "../../lib/recommend";
import { ANALYSIS_SCHEMA, analysisPrompt, parseAnalysis } from "../../lib/analyse";

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

/** Gemini (API REST de Google AI Studio). Modèle modifiable avec GEMINI_MODEL. */
async function askGemini(key: string, prompt: string, signal: AbortSignal): Promise<string> {
  const model = env("GEMINI_MODEL") || "gemini-2.5-flash";
  const call = (withSchema: boolean) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    signal,
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
        ...(withSchema ? { responseJsonSchema: ANALYSIS_SCHEMA } : {}),
      },
    }),
  });
  let res = await call(true);
  // Certains modèles n'acceptent pas le schéma : on redemande sans (le prompt décrit déjà le format).
  if (res.status === 400) res = await call(false);
  if (res.status === 429) throw new RateLimited();
  if (!res.ok) throw new Error(`Gemini ${res.status} ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const parts: { text?: string; thought?: boolean }[] = data?.candidates?.[0]?.content?.parts || [];
  return parts.filter((p) => !p.thought).map((p) => p.text || "").join("");
}

/** Claude (API Anthropic), sortie JSON contrainte par le schéma. */
async function askClaude(key: string, prompt: string, signal: AbortSignal): Promise<string> {
  const client = new Anthropic({ apiKey: key });
  try {
    const msg = await client.beta.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      output_config: { effort: "low", format: { type: "json_schema", schema: ANALYSIS_SCHEMA } },
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
  let answers;
  try { answers = sanitizeOlimAnswers(JSON.parse(raw).answers) } catch { answers = null }
  if (!answers) return json({ error: "invalid" }, 400);

  let ip = "inconnue";
  try { ip = clientAddress } catch { ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || ip }
  if (!allow(ip)) return json({ error: "rate_limited" }, 429);

  const prompt = analysisPrompt(answers);
  try {
    const text = gKey ? await askGemini(gKey, prompt, request.signal) : await askClaude(cKey!, prompt, request.signal);
    const analysis = parseAnalysis(text);
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
