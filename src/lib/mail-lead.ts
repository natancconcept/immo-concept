/* Envoie une demande par Resend si RESEND_API_KEY est défini.
   Sinon l’envoi FormSubmit se fait depuis le navigateur (FormSubmit refuse les appels serveur). */
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

/** `true` si l’e-mail est parti via Resend. `false` si le navigateur doit passer par FormSubmit. */
export async function mailLead(d: LeadDraft) {
  const to = leadInbox();
  const subject = d.title || "Nouvelle demande C.C. Concept";
  const text = leadText(d);
  const key = env("RESEND_API_KEY");
  if (!key) return false;
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
  return true;
}
