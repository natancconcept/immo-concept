/* Conseil personnalisé rédigé par l'IA (Claude) à partir des réponses du questionnaire alyah.
   - GET  → { enabled } : le bouton n'est affiché que si une clé ANTHROPIC_API_KEY est configurée.
   - POST → { answers } : renvoie le texte en flux, une ligne JSON par morceau ({"t": "..."} ou {"error": "..."}).
   Protection anti-abus : le prompt est construit ici à partir de réponses vérifiées (impossible d'envoyer
   un texte libre à l'IA), limite de demandes par adresse IP et plafond quotidien. */
import type { APIRoute } from "astro";
import Anthropic from "@anthropic-ai/sdk";
import { advicePrompt, recommend, sanitizeOlimAnswers } from "../../lib/recommend";

export const prerender = false;

const MODEL = "claude-opus-5";
const LIMITS = {
  perIpWindow: 4,          // demandes par adresse IP…
  windowMs: 10 * 60_000,   // …sur 10 minutes
  perIpDay: 12,            // demandes par adresse IP et par jour
  globalDay: 300,          // plafond total par jour (par instance du serveur)
  maxBodyBytes: 4_000,
};

const apiKey = () => process.env.ANTHROPIC_API_KEY || import.meta.env.ANTHROPIC_API_KEY;

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

export const GET: APIRoute = () => json({ enabled: !!apiKey() });

export const POST: APIRoute = async ({ request, clientAddress, url }) => {
  const key = apiKey();
  if (!key) return json({ error: "disabled" }, 503);

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

  const prompt = advicePrompt(answers, recommend(answers));
  const client = new Anthropic({ apiKey: key });
  const enc = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(enc.encode(JSON.stringify(obj) + "\n"));
      const stream = client.beta.messages.stream({
        model: MODEL,
        max_tokens: 8000,
        output_config: { effort: "low" },
        // Si la demande est refusée par les filtres de sécurité, l'API la relance sur un autre modèle.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        messages: [{ role: "user", content: prompt }],
      }, { signal: request.signal });
      try {
        let wrote = false;
        for await (const ev of stream) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") { send({ t: ev.delta.text }); wrote = true }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal" || !wrote) send({ error: "default" });
      } catch (e) {
        if (!request.signal.aborted) {
          console.error("[api/conseil]", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
          send({ error: e instanceof Anthropic.RateLimitError ? "rate_limited" : "default" });
        }
      } finally {
        try { controller.close() } catch {}
      }
    },
  });
  return new Response(body, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
};
