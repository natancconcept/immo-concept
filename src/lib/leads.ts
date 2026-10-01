/* Demandes laissées à la fin du questionnaire et du simulateur.
   En local : fichier .data/leads.json
   Sur Netlify : Netlify Blobs (rien à configurer)
   Sur Vercel : magasin Blob privé (BLOB_READ_WRITE_TOKEN ou BLOB_STORE_ID) */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { LeadSource } from "./send-lead";

export interface Lead {
  id: string;
  at: string;
  updated: string;
  source: LeadSource;
  title: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  lines: string[];
  /** Suivi par l'agence : "new" (à rappeler) ou "done" (traité). */
  status?: LeadStatus;
}

export type LeadStatus = "new" | "done";

export type LeadDraft = Omit<Lead, "at" | "updated" | "status">;

export const isLeadId = (id: unknown): id is string => typeof id === "string" && UUID.test(id);

const FILE = join(process.cwd(), ".data", "leads.json");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX = 2000;

const env = (k: string): string | undefined => {
  const fromProc = process.env[k];
  if (typeof fromProc === "string" && fromProc.trim()) return fromProc.trim();
  const fromAstro = (import.meta.env as Record<string, unknown>)[k];
  if (typeof fromAstro === "string" && fromAstro.trim()) return fromAstro.trim();
  return undefined;
};

const vercelBlobReady = () => !!(env("BLOB_READ_WRITE_TOKEN") || env("BLOB_STORE_ID"));

const clip = (s: string, max: number) => s.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);

export function adminPassword() {
  return env("ADMIN_PASSWORD") || "";
}

export function passwordsMatch(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export function adminToken(password: string) {
  return createHmac("sha256", password).update("cc-admin-v1").digest("base64url");
}

export function tokenOk(cookie: string | undefined, password: string) {
  if (!cookie || !password) return false;
  return passwordsMatch(cookie, adminToken(password));
}

/** Valide le corps envoyé par le navigateur. `null` si les champs sont inutilisables. */
export function parseDraft(input: unknown): LeadDraft | null {
  if (!input || typeof input !== "object") return null;
  const src = input as Record<string, unknown>;
  const source = src.source === "questionnaire" || src.source === "simulateur" ? src.source : null;
  const id = typeof src.id === "string" && UUID.test(src.id) ? src.id : null;
  if (!source || !id) return null;
  const name = typeof src.name === "string" ? clip(src.name, 80) : "";
  const email = typeof src.email === "string" ? clip(src.email, 120) : "";
  const phone = typeof src.phone === "string" ? clip(src.phone, 40) : "";
  if (name.length < 2 || phone.replace(/\D/g, "").length < 8) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  const title = typeof src.title === "string" ? clip(src.title, 140) : "";
  const message = typeof src.message === "string" ? clip(src.message, 2000) : "";
  const lines = Array.isArray(src.lines)
    ? src.lines.filter((x): x is string => typeof x === "string").map((x) => clip(x, 500)).filter(Boolean).slice(0, 40)
    : [];
  return { id, source, title: title || (source === "questionnaire" ? "Questionnaire" : "Simulateur"), name, email, phone, message, lines };
}

function isLead(v: unknown): v is Lead {
  if (!v || typeof v !== "object") return false;
  const o = v as Lead;
  return typeof o.id === "string" && typeof o.name === "string" && (o.source === "questionnaire" || o.source === "simulateur");
}

const byRecent = (a: Lead, b: Lead) => (a.updated < b.updated ? 1 : a.updated > b.updated ? -1 : 0);

let queue = Promise.resolve();
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(() => undefined, () => undefined);
  return run;
}

async function readFileLeads(): Promise<Lead[]> {
  try {
    const data = JSON.parse(await readFile(FILE, "utf8"));
    return Array.isArray(data) ? data.filter(isLead) : [];
  } catch {
    return [];
  }
}

async function writeFileLeads(leads: Lead[]) {
  await mkdir(join(process.cwd(), ".data"), { recursive: true });
  const tmp = FILE + ".tmp";
  await writeFile(tmp, JSON.stringify(leads));
  await rename(tmp, FILE);
}

type Backend = "file" | "netlify" | "vercel";

function backend(): Backend {
  if (process.env.VERCEL) return "vercel";
  if (process.env.NETLIFY === "true") return "netlify";
  return "file";
}

async function blobs() {
  const { getStore } = await import("@netlify/blobs");
  return getStore({ name: "cc-leads", consistency: "strong" });
}

async function load(id: string): Promise<Lead | null> {
  const where = backend();
  if (where === "file") {
    return (await readFileLeads()).find((l) => l.id === id) || null;
  }
  if (where === "netlify") {
    const data = await (await blobs()).get(id, { type: "json" });
    return isLead(data) ? data : null;
  }
  try {
    const { get } = await import("@vercel/blob");
    const got = await get(`leads/${id}.json`, { access: "private", useCache: false });
    if (!got || got.statusCode !== 200) return null;
    const data = JSON.parse(await new Response(got.stream).text());
    return isLead(data) ? data : null;
  } catch {
    return null;
  }
}

async function store(lead: Lead) {
  const where = backend();
  if (where === "file") {
    const leads = await readFileLeads();
    const i = leads.findIndex((l) => l.id === lead.id);
    if (i >= 0) leads[i] = lead; else leads.push(lead);
    leads.sort(byRecent);
    await writeFileLeads(leads.slice(0, MAX));
    return;
  }
  if (where === "netlify") {
    await (await blobs()).setJSON(lead.id, lead);
    return;
  }
  const { put } = await import("@vercel/blob");
  await put(`leads/${lead.id}.json`, JSON.stringify(lead), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function saveLead(draft: LeadDraft): Promise<Lead> {
  if (backend() === "vercel" && !vercelBlobReady()) {
    throw new Error("unconfigured");
  }
  return exclusive(async () => {
    const prev = await load(draft.id);
    const now = new Date().toISOString();
    const lead: Lead = { ...draft, at: prev?.at || now, updated: now, status: prev?.status || "new" };
    await store(lead);
    return lead;
  });
}

export async function listLeads(): Promise<Lead[]> {
  const where = backend();
  if (where === "file") return (await readFileLeads()).sort(byRecent);
  if (where === "netlify") {
    const store = await blobs();
    const leads: Lead[] = [];
    for await (const page of store.list({ paginate: true })) {
      for (const blob of page.blobs) {
        const data = await store.get(blob.key, { type: "json" });
        if (isLead(data)) leads.push(data);
      }
    }
    return leads.sort(byRecent);
  }
  const { list, get } = await import("@vercel/blob");
  const leads: Lead[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 10; i++) {
    const page = await list({ prefix: "leads/", cursor, limit: 1000 });
    for (const blob of page.blobs) {
      const got = await get(blob.pathname, { access: "private", useCache: false });
      if (!got || got.statusCode !== 200) continue;
      try {
        const data = JSON.parse(await new Response(got.stream).text());
        if (isLead(data)) leads.push(data);
      } catch { /* entrée illisible, ignorée */ }
    }
    if (!page.hasMore || !page.cursor) break;
    cursor = page.cursor;
  }
  return leads.sort(byRecent);
}

/** Change le statut d'une demande (page admin). */
export async function setLeadStatus(id: string, status: LeadStatus): Promise<Lead | null> {
  return exclusive(async () => {
    const lead = await load(id);
    if (!lead) return null;
    const next = { ...lead, status };
    await store(next);
    return next;
  });
}

/** Supprime définitivement une demande (droit à l'effacement). */
export async function deleteLead(id: string): Promise<void> {
  return exclusive(async () => {
    const where = backend();
    if (where === "file") {
      await writeFileLeads((await readFileLeads()).filter((l) => l.id !== id));
      return;
    }
    if (where === "netlify") {
      await (await blobs()).delete(id);
      return;
    }
    const { del } = await import("@vercel/blob");
    const { list } = await import("@vercel/blob");
    const found = await list({ prefix: `leads/${id}.json`, limit: 1 });
    if (found.blobs[0]) await del(found.blobs[0].url);
  });
}
