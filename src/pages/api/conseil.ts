/* Analyses rédigées par l'IA.
   - GET  → { enabled } : l'analyse n'est proposée que si une clé d'IA est configurée.
   - POST → { answers } (questionnaire alyah) ou { sim } (simulateur) : { analysis } ou { error }.
   Gemini d'abord (clé GEMINI_API_KEY), sinon Claude. En ligne, si Vercel est refusé par Google
   (offre gratuite / IP datacenter), le navigateur relance l'appel (voir src/lib/gemini.ts). */
import type { APIRoute } from "astro";
import { generateGeminiJson } from "../../lib/gemini";
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
const geminiKey = () => env("GEMINI_API_KEY") || env("PUBLIC_GEMINI_API_KEY");
const claudeKey = () => env("ANTHROPIC_API_KEY");

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
    const text = gKey ? await generateGeminiJson(gKey, job.prompt, job.schema) : await askClaude(cKey!, job.prompt, job.schema);
    const analysis = job.parse(text);
    if (!analysis) {
      console.error("[api/conseil] réponse illisible :", text.slice(0, 500));
      return json({ error: "default" }, 502);
    }
    return json({ analysis });
  } catch (e) {
    if (e instanceof RateLimited || (e as Error & { rateLimited?: boolean }).rateLimited) return json({ error: "rate_limited" }, 429);
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/conseil]", msg);
    return json({ error: "default" }, 502);
  }
};
