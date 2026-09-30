/* Enregistre la demande laissée à la fin du questionnaire ou du simulateur. */
import type { APIRoute } from "astro";
import { parseDraft, saveLead } from "../../lib/leads";

export const prerender = false;

const LIMITS = { perIpWindow: 20, windowMs: 10 * 60_000, perIpDay: 60, maxBodyBytes: 12_000 };
const hits = new Map<string, number[]>();
let day = "";

function allow(ip: string) {
  const now = Date.now(), today = new Date().toISOString().slice(0, 10);
  if (today !== day) { day = today; hits.clear() }
  const list = (hits.get(ip) || []).filter((t) => now - t < 24 * 60 * 60_000);
  if (list.length >= LIMITS.perIpDay) return false;
  if (list.filter((t) => now - t < LIMITS.windowMs).length >= LIMITS.perIpWindow) return false;
  list.push(now); hits.set(ip, list);
  return true;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export const POST: APIRoute = async ({ request, clientAddress, url }) => {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== url.host) return json({ error: "forbidden" }, 403);

  const raw = await request.text();
  if (raw.length > LIMITS.maxBodyBytes) return json({ error: "invalid" }, 413);

  let ip = "inconnue";
  try { ip = clientAddress } catch { ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || ip }
  if (!allow(ip)) return json({ error: "rate_limited" }, 429);

  let draft;
  try { draft = parseDraft(JSON.parse(raw)) } catch { draft = null }
  if (!draft) return json({ error: "invalid" }, 400);

  try {
    const lead = await saveLead(draft);
    return json({ ok: true, id: lead.id });
  } catch (e) {
    console.error("[api/lead]", e instanceof Error ? e.message : e);
    return json({ error: "failed" }, 502);
  }
};
