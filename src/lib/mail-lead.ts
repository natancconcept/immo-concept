/* Envoie une demande par e-mail (pas de stockage). Resend si RESEND_API_KEY est défini,
   sinon FormSubmit vers l’adresse de l’agence. */
import { SITE } from "../data/site";
import type { LeadDraft } from "./leads";

const env = (k: string): string | undefined => {
  const fromProc = process.env[k];
  if (typeof fromProc === "string" && fromProc.trim()) return fromProc.trim();
  const fromAstro = (import.meta.env as Record<string, unknown>)[k];
  if (typeof fromAstro === "string" && fromAstro.trim()) return fromAstro.trim();
  return undefined;
};

export function leadInbox() {
  return env("LEAD_EMAIL") || SITE.leadEmail;
}

export function leadText(d: LeadDraft) {
  return [
    `Nouvelle demande — ${d.title}`,
    "",
    `Nom : ${d.name}`,
    `E-mail : ${d.email}`,
    `Téléphone : ${d.phone}`,
    d.message ? `Message : ${d.message}` : "",
    "",
    ...d.lines,
  ].filter((x) => x !== "").join("\n");
}

export async function mailLead(d: LeadDraft, origin: string) {
  const to = leadInbox();
  const subject = d.title || "Nouvelle demande C.C. Concept";
  const text = leadText(d);
  const key = env("RESEND_API_KEY");
  if (key) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: env("RESEND_FROM") || "C.C. Concept <beth.t@example.com>",
        to: [to],
        reply_to: d.email,
        subject,
        text,
      }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status} ${(await res.text()).slice(0, 200)}`);
    return;
  }
  const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      origin,
      referer: origin.endsWith("/") ? origin : origin + "/",
    },
    body: JSON.stringify({
      _subject: subject,
      _template: "box",
      _captcha: "false",
      _replyto: d.email,
      name: d.name,
      email: d.email,
      phone: d.phone,
      source: d.source,
      message: d.message || text,
      details: d.lines.join("\n"),
    }),
  });
  const to = leadInbox();
  const subject = d.title || "Nouvelle demande C.C. Concept";
  const text = leadText(d);
  const key = env("RESEND_API_KEY");
  if (key) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: env("RESEND_FROM") || "C.C. Concept <beth.t@example.com>",
        to: [to],
        reply_to: d.email,
        subject,
        text,
      }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status} ${(await res.text()).slice(0, 200)}`);
    return;
  }
  const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      _subject: subject,
      _template: "box",
      _captcha: "false",
      _replyto: d.email,
      name: d.name,
      email: d.email,
      phone: d.phone,
      source: d.source,
      message: d.message || text,
      details: d.lines.join("\n"),
    }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`FormSubmit ${res.status} ${body.slice(0, 200)}`);
  let parsed: { success?: string | boolean };
  try { parsed = JSON.parse(body) } catch { throw new Error(`FormSubmit réponse illisible ${body.slice(0, 200)}`) }
  if (parsed.success === false || parsed.success === "false") throw new Error(`FormSubmit ${body.slice(0, 200)}`);
}
