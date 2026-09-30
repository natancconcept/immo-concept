/* Liste des demandes, réservée à l'agence (mot de passe ADMIN_PASSWORD). */
import type { APIRoute } from "astro";
import { adminPassword, adminToken, deleteLead, isLeadId, listLeads, passwordsMatch, setLeadStatus, tokenOk } from "../../lib/leads";

export const prerender = false;

const COOKIE = "cc_admin";
const hits = new Map<string, number[]>();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

function cookieOpts() {
  return { httpOnly: true, sameSite: "lax" as const, path: "/", secure: import.meta.env.PROD, maxAge: 60 * 60 * 24 * 30 };
}

function ipOf(request: Request, clientAddress: string | undefined) {
  try { return clientAddress || "inconnue" } catch { return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "inconnue" }
}

function limited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 10 * 60_000);
  if (list.length >= 8) return true;
  list.push(now); hits.set(ip, list);
  return false;
}

export const GET: APIRoute = async ({ cookies }) => {
  const password = adminPassword();
  if (!password) return json({ error: "unconfigured" }, 503);
  if (!tokenOk(cookies.get(COOKIE)?.value, password)) return json({ error: "auth" }, 401);
  try {
    return json({ leads: await listLeads() });
  } catch (e) {
    console.error("[api/leads]", e instanceof Error ? e.message : e);
    return json({ error: "failed" }, 502);
  }
};

export const POST: APIRoute = async ({ request, cookies, clientAddress, url }) => {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== url.host) return json({ error: "forbidden" }, 403);
  const password = adminPassword();
  if (!password) return json({ error: "unconfigured" }, 503);
  let ip = "inconnue";
  try { ip = clientAddress } catch { ip = ipOf(request, undefined) }
  if (limited(ip)) return json({ error: "rate_limited" }, 429);
  let given = "";
  try { given = String((await request.json()).password || "") } catch { given = "" }
  if (!passwordsMatch(given, password)) return json({ error: "auth" }, 401);
  cookies.set(COOKIE, adminToken(password), cookieOpts());
  return json({ ok: true });
};

/** Suivi d'une demande : { id, status: "new" | "done" }. */
export const PATCH: APIRoute = async ({ request, cookies, url }) => {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== url.host) return json({ error: "forbidden" }, 403);
  const password = adminPassword();
  if (!password || !tokenOk(cookies.get(COOKIE)?.value, password)) return json({ error: "auth" }, 401);
  let body: { id?: unknown; status?: unknown } = {};
  try { body = await request.json() } catch {}
  if (!isLeadId(body.id) || (body.status !== "new" && body.status !== "done")) return json({ error: "invalid" }, 400);
  const lead = await setLeadStatus(body.id, body.status);
  return lead ? json({ ok: true, lead }) : json({ error: "not_found" }, 404);
};

/** Avec { id } : supprime la demande. Sans corps : se déconnecte. */
export const DELETE: APIRoute = async ({ request, cookies, url }) => {
  let body: { id?: unknown } = {};
  try { body = await request.json() } catch {}
  if (body.id === undefined) {
    cookies.delete(COOKIE, { path: "/" });
    return json({ ok: true });
  }
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== url.host) return json({ error: "forbidden" }, 403);
  const password = adminPassword();
  if (!password || !tokenOk(cookies.get(COOKIE)?.value, password)) return json({ error: "auth" }, 401);
  if (!isLeadId(body.id)) return json({ error: "invalid" }, 400);
  try {
    await deleteLead(body.id);
    return json({ ok: true });
  } catch (e) {
    console.error("[api/leads] suppression", e instanceof Error ? e.message : e);
    return json({ error: "failed" }, 502);
  }
};
