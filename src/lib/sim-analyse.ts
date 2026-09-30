/* Analyse du résultat du simulateur par l'IA (Gemini ou Claude).
   Les chiffres sont recalculés ici par compute() à partir de réponses vérifiées : l'IA les commente,
   elle n'en calcule aucun. La réponse JSON est vérifiée avant d'être affichée. */
import { CITIES } from "../data/cities";
import * as H from "../data/hypotheses";
import { SITE } from "../data/site";
import { fmt, shek, shekK } from "./format";
import { SITUATIONS, compute, minApport, pct, sum, type Line, type Mode, type Reno, type Situation } from "./simulate";

export interface SimAnswers { mode: Mode; city: string; surface: number; situation: Situation; apport: number; years: number; reno: Reno }
export interface SimAnalysis { synthese: string; forces: string[]; vigilance: string[]; conseils: string[] }

const MODES: Mode[] = ["achat", "location", "invest", "flip"];
const MODE_LABEL: Record<Mode, string> = {
  achat: "acheter pour y vivre",
  location: "louer un logement pour y vivre",
  invest: "acheter pour louer (investissement locatif)",
  flip: "acheter un bien à rénover pour le revendre",
};

const str = { type: "string" } as const;
const list = { type: "array", items: str } as const;

export const SIM_SCHEMA = {
  type: "object",
  properties: { synthese: str, forces: list, vigilance: list, conseils: list },
  required: ["synthese", "forces", "vigilance", "conseils"],
  additionalProperties: false,
};

/** Ne garde que des réponses possibles dans le simulateur. `null` si le projet est incomplet. */
export function sanitizeSimAnswers(input: unknown): SimAnswers | null {
  if (!input || typeof input !== "object") return null;
  const s = input as Record<string, unknown>;
  const mode = MODES.find((m) => m === s.mode);
  const city = CITIES.find((c) => c.id === s.city)?.id;
  const surface = Number(s.surface);
  if (!mode || !city || !Number.isFinite(surface) || surface < 40 || surface > 220) return null;
  const situation = SITUATIONS.find((x) => x.id === s.situation)?.id || "resident";
  const reno = (Object.keys(H.RENO) as Reno[]).find((r) => r === s.reno) || "full";
  const years = H.LOAN_YEARS.find((y) => y === Number(s.years)) || 25;
  let apport = Number(s.apport);
  if (!Number.isFinite(apport)) apport = 1;
  apport = Math.min(1, Math.max(minApport(situation), Math.round(apport * 100) / 100));
  return { mode, city, surface: Math.round(surface), situation, apport, years, reno };
}

const lines = (l: Line[]) => l.map((x) => `  - ${x.label} : ${shek(x.value)}${x.note ? ` (${x.note})` : ""}`).join("\n");

export function simPrompt(a: SimAnswers): string {
  const c = CITIES.find((x) => x.id === a.city)!;
  const r: any = compute({ ...a, city: c });
  const sit = SITUATIONS.find((s) => s.id === a.situation)!;
  const profile = [`Projet : ${MODE_LABEL[a.mode]}`, `Ville : ${c.name} (${c.region})`, `Surface : ${a.surface} m²`];
  if (a.mode !== "location") profile.push(`Situation : ${sit.label} – ${sit.sub}`);
  if (a.mode === "achat" || a.mode === "invest") profile.push(a.apport >= 1 ? "Financement : achat comptant" : `Financement : apport de ${pct(a.apport)}, prêt sur ${a.years} ans à ${pct(H.LOAN_RATE, 1)}`);
  if (a.mode === "flip") profile.push(`Travaux : ${H.RENO[a.reno].label} (${H.RENO[a.reno].sub}), durée indicative ${H.RENO[a.reno].months}`);

  let figures = "";
  if (a.mode === "location") {
    figures = `- Loyer estimé : ${shek(r.rent)} par mois
- Arnona (taxe municipale, estimation) : ${shek(r.arnona)} par mois
- Vaad bayit (charges d'immeuble, estimation) : ${shek(r.vaad)} par mois
- Total mensuel : ${shek(r.monthTotal)} ; budget annuel : ${shekK(r.year)} (hors garanties)`;
  } else if (a.mode === "flip") {
    figures = `- Prix du marché pour ce bien : ${shekK(r.price)}
- Prix d'achat du bien à rénover : ${shekK(r.buy)} (${pct(H.FLIP_DISCOUNT)} sous le marché)
- Frais d'achat :\n${lines(r.fees)}
- Travaux : ${shekK(r.works)}
- Capital engagé : ${shekK(r.invested)}
- Prix de revente estimé : ${shekK(r.sale)} (${pct(H.FLIP_PREMIUM)} au‑dessus du marché)
- Frais de revente :\n${lines(r.saleFees)}
- Plus‑value avant impôt : ${shekK(r.gain)} ; rentabilité : ${pct(r.ratio)} du capital engagé
- Impôt sur la plus‑value (Mas Shevach) non inclus`;
  } else {
    figures = `- Prix estimé : ${shekK(r.price)} (${fmt(c.m2)} ₪/m²)
- Apport : ${shekK(r.apport)} ; prêt : ${shekK(r.loan)}${r.loan > 0 ? ` ; mensualité : ${shek(r.pay)}` : ""}
- Frais d'achat (total ${shekK(sum(r.fees))}) :\n${lines(r.fees)}
- À prévoir de sa poche : ${shekK(r.cash)}`;
    if (r.loan > 0) figures += `\n- Revenus nets conseillés par les banques (mensualité ≤ un tiers) : au moins ${shek(r.pay * 3)} par mois`;
    if (a.mode === "invest") {
      figures += `
- Loyer estimé : ${shek(r.rent)} par mois (${shekK(r.yearRent)} par an)
- Charges annuelles :\n${lines(r.charges)}
- Revenu net annuel : ${shekK(r.net)}
- Rendement brut : ${pct(r.gross, 1)} ; rendement net : ${pct(r.netYield, 1)}
- Cash‑flow mensuel : ${r.cashflow >= 0 ? "+" : "−"} ${shek(Math.abs(r.cashflow))}
- Impôt sur les loyers non inclus`;
    }
  }

  return `Tu es le conseiller d'une agence immobilière francophone en Israël, active depuis ${SITE.years} ans.
Une personne vient d'utiliser notre simulateur. Commente son résultat de façon utile, honnête et concrète.

## Son projet
${profile.join("\n")}

## Résultat calculé par le simulateur (chiffres indicatifs)
${figures}

## La ville (données de l'agence)
- Prix moyen ≈ ${fmt(c.m2)} ₪/m² ; loyer ≈ ${c.rent} ₪/m²/mois${c.avg ? ` ; prix moyen d'un appartement (CBS fin 2025) : ${shekK(c.avg)}` : ""}
- Quartiers souvent recherchés : ${c.hood}
- Présentation : ${c.blurb}

## Règles
1. N'invente aucun chiffre. Tu peux reprendre les montants ci‑dessus, sans en calculer de nouveaux, et rappeler qu'ils sont indicatifs.
2. Juge le projet : un rendement net sous 3 %, un cash‑flow négatif, une plus‑value faible ou négative, ou un apport au minimum légal sont des points de vigilance à dire clairement.
3. Reste sur des faits généraux reconnus pour Israël (taxes, banques, marché locatif, démarches). Pas de conseil fiscal définitif : renvoie vers l'avocat de l'agence quand c'est nécessaire.

## Réponse (en français, JSON conforme au schéma)
- "synthese" : 2 phrases maximum qui résument le résultat.
- "forces" : 2 ou 3 points favorables, chacun une seule phrase courte (moins de 110 caractères).
- "vigilance" : 2 ou 3 risques, chacun une seule phrase courte (moins de 110 caractères).
- "conseils" : 3 actions concrètes, chacune une seule phrase courte (moins de 110 caractères).
Écris « vous ». Pas de paragraphe long, pas de formule creuse.`;
}

const clean = (v: unknown, max = 400) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const cleanList = (v: unknown, n: number) => (Array.isArray(v) ? v.map((x) => clean(x, 140)).filter(Boolean).slice(0, n) : []);

export function parseSimAnalysis(raw: string): SimAnalysis | null {
  let j: Record<string, unknown>;
  try { j = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, "")) } catch { return null }
  if (!j || typeof j !== "object") return null;
  const out = { synthese: clean(j.synthese, 320), forces: cleanList(j.forces, 3), vigilance: cleanList(j.vigilance, 3), conseils: cleanList(j.conseils, 3) };
  return out.synthese && (out.forces.length || out.vigilance.length) ? out : null;
}
