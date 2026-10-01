/* Analyses rédigées par l'IA.
   Montage Vercel officiel : AI SDK (`ai` + `@ai-sdk/google`), clé GEMINI_API_KEY
   ou GOOGLE_GENERATIVE_AI_API_KEY. Si l’appel direct Google échoue, on tente
   la AI Gateway Vercel (`AI_GATEWAY_API_KEY` ou OIDC sur Vercel). */
import type { APIRoute } from "astro";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { sanitizeOlimAnswers } from "../../lib/recommend";
import { ANALYSIS_SCHEMA, analysisPrompt, parseAnalysis } from "../../lib/analyse";
import { SIM_SCHEMA, parseSimAnalysis, sanitizeSimAnswers, simPrompt } from "../../lib/sim-analyse";

export const prerender = false;
export const maxDuration = 60;

const LIMITS = {
  perIpWindow: 4,
  windowMs: 10 * 60_000,
  perIpDay: 12,
  globalDay: 300,
  maxBodyBytes: 4_000,
};

const env = (k: string): string | undefined => {
  const fromProc = process.env[k];
  if (typeof fromProc === "string" && fromProc.trim()) return fromProc.replace(/^['"]|['"]$/g, "").trim();
  const fromAstro = (import.meta.env as Record<string, unknown>)[k];
  if (typeof fromAstro === "string" && fromAstro.trim()) return fromAstro.replace(/^['"]|['"]$/g, "").trim();
  return undefined;
};
const geminiKey = () => env("GEMINI_API_KEY") || env("GOOGLE_GENERATIVE_AI_API_KEY") || env("GOOGLE_API_KEY");
const claudeKey = () => env("ANTHROPIC_API_KEY");
const redact = (s: string) => s.replace(/AQ\.[A-Za-z0-9_-]+/g, "[key]").replace(/AIza[^\s"']+/g, "[key]").replace(/key=[^&\s"]+/gi, "key=[key]");

const MODELS = ["gemini-3.1-flash-lite-preview", "gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3.8-flash", "gemini-3-flash-preview"];

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

async function askGemini(key: string, prompt: string): Promise<string> {
  const google = createGoogleGenerativeAI({ apiKey: key });
  const models = [...new Set([env("GEMINI_MODEL"), ...MODELS].filter((m): m is string => !!m))];
  let lastErr = "Gemini : aucun modèle n’a répondu";
  let only429 = true;
  for (const id of models) {
    try {
      const { text } = await generateText({
        model: google(id),
        prompt,
        temperature: 0.3,
      });
      if (text?.trim()) {
        console.info("[api/conseil] Gemini", id, "ok");
        return text;
      }
      only429 = false;
      lastErr = `Gemini ${id} réponse vide`;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      lastErr = `Gemini ${id} ${msg}`;
      console.warn("[api/conseil]", lastErr);
      if (/429|rate limit/i.test(msg)) continue;
      only429 = false;
    }
  }
  if (env("AI_GATEWAY_API_KEY") || process.env.VERCEL) {
    try {
      const { text } = await generateText({
        model: "google/gemini-3.8-flash",
        prompt,
        temperature: 0.3,
      });
      if (text?.trim()) {
        console.info("[api/conseil] AI Gateway ok");
        return text;
      }
    } catch (e) {
      lastErr = e instanceof Error ? `Gateway ${e.message}` : lastErr;
      console.warn("[api/conseil]", lastErr);
    }
  }
  if (only429) throw new RateLimited();
  throw new Error(redact(lastErr));
}

async function askClaude(key: string, prompt: string, schema: Record<string, unknown>): Promise<string> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: key });
  try {
    const msg = await client.beta.messages.create({
      model: "claude-opus-5",
      max_tokens: 16000,
      output_config: { effort: "low", format: { type: "json_schema", schema } },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [{ role: "user", content: prompt }],
    });
    if (msg.stop_reason === "refusal") return "";
    return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new RateLimited();
    throw e;
  }
}

export const GET: APIRoute = async ({ url }) => {
  const gKey = geminiKey(), cKey = claudeKey();
  const enabled = !!(gKey || cKey);
  if (url.searchParams.get("ping") !== "1") return json({ enabled });
  if (!gKey) return json({ enabled, ping: "no-key" }, 503);
  const t0 = Date.now();
  try {
    const text = await askGemini(gKey, 'Réponds uniquement le mot "ok".');
    return json({ enabled, ping: "ok", ms: Date.now() - t0, sample: text.slice(0, 80) });
  } catch (e) {
    const detail = redact(e instanceof Error ? e.message : String(e));
    return json({ enabled, ping: "fail", ms: Date.now() - t0, detail }, 502);
  }
};

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
    const text = gKey ? await askGemini(gKey, job.prompt) : await askClaude(cKey!, job.prompt, job.schema);
    const analysis = job.parse(text);
    if (!analysis) {
      console.error("[api/conseil] réponse illisible :", text.slice(0, 500));
      return json({ error: "default", detail: "réponse illisible" }, 502);
    }
    return json({ analysis });
  } catch (e) {
    if (e instanceof RateLimited) return json({ error: "rate_limited" }, 429);
    const detail = redact(e instanceof Error ? e.message : String(e));
    console.error("[api/conseil]", detail);
    return json({ error: "default", detail }, 502);
  }
};
