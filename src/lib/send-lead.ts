/* Envoi d'une demande depuis le questionnaire ou le simulateur (navigateur uniquement). */
import { SITE } from "../data/site";

export type LeadSource = "questionnaire" | "simulateur";

export interface LeadPayload {
  id: string;
  source: LeadSource;
  title: string;
  name: string;
  email: string;
  phone: string;
  message?: string;
  lines: string[];
}

/** Message d'erreur si le nom, l'e-mail ou le téléphone est incomplet, sinon une chaîne vide. */
export function contactError(name: string, email: string, phone: string): string {
  if (name.trim().length < 2) return "Indiquez votre nom pour que l’on sache qui rappeler.";
  if (phone.replace(/\D/g, "").length < 8) return "Indiquez un numéro de téléphone complet, avec l’indicatif du pays.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 120) return "Indiquez une adresse e‑mail valide.";
  return "";
}

async function mailViaFormSubmit(payload: LeadPayload, inbox: string): Promise<"ok" | "fail"> {
  const details = payload.lines.join("\n");
  const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(inbox)}`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      _subject: payload.title || "Nouvelle demande C.C. Concept",
      _template: "box",
      _captcha: "false",
      _replyto: payload.email,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      source: payload.source,
      message: payload.message || details,
      details,
    }),
  });
  const body = await res.text();
  let parsed: { success?: string | boolean; message?: string };
  try { parsed = JSON.parse(body) } catch { return "fail" }
  if (parsed.success === true || parsed.success === "true") return "ok";
  const msg = String(parsed.message || "");
  /* Première demande : FormSubmit met le message en file et envoie « Activate Form ». */
  if (/activat/i.test(msg)) return "ok";
  return "fail";
}

export async function sendLead(payload: LeadPayload): Promise<"ok" | "rate" | "fail"> {
  try {
    const res = await fetch("/api/lead", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.status === 429) return "rate";
    if (res.status === 400 || res.status === 403 || res.status === 413) return "fail";
    let mailed = false;
    let inbox = SITE.leadEmail;
    try {
      const data = await res.json() as { mailed?: boolean; inbox?: string };
      mailed = !!data.mailed;
      if (typeof data.inbox === "string" && data.inbox.includes("@")) inbox = data.inbox;
    } catch { /* le navigateur envoie quand même par FormSubmit */ }
    if (mailed) return "ok";
    return await mailViaFormSubmit(payload, inbox);
  } catch {
    return "fail";
  }
}

export const leadFailMessage = (status: "rate" | "fail") =>
  status === "rate"
    ? "Trop de tentatives. Réessayez dans quelques minutes."
    : "Nous n’avons pas pu envoyer vos coordonnées. Réessayez dans un instant.";
