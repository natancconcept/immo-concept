/* Envoi d'une demande depuis le questionnaire ou le simulateur (navigateur uniquement). */

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

export async function sendLead(payload: LeadPayload): Promise<"ok" | "rate" | "fail"> {
  try {
    const res = await fetch("/api/lead", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) return "ok";
    if (res.status === 429) return "rate";
    return "fail";
  } catch {
    return "fail";
  }
}

export const leadFailMessage = (status: "rate" | "fail") =>
  status === "rate"
    ? "Trop de tentatives. Réessayez dans quelques minutes."
    : "Nous n’avons pas pu enregistrer vos coordonnées. Réessayez dans un instant.";
