/* Calculs du simulateur (achat, location, investissement, rénovation-revente). */
import type { City } from "../data/cities";
import * as H from "../data/hypotheses";

export type Mode = "achat" | "location" | "invest" | "flip";
export type Situation = "oleh" | "resident" | "additional" | "nonresident";
export type Reno = keyof typeof H.RENO;

export const SITUATIONS: { id: Situation; label: string; sub: string }[] = [
  { id: "oleh", label: "Oleh / olah", sub: "Alyah prévue ou faite il y a moins de 7 ans, premier logement en Israël" },
  { id: "resident", label: "Résident israélien", sub: "C’est votre seul logement" },
  { id: "additional", label: "J’ai déjà un logement", sub: "Achat d’un bien supplémentaire" },
  { id: "nonresident", label: "Non‑résident", sub: "Vous vivez à l’étranger, sans alyah prévue" },
];

/** Taxe d'achat calculée par tranches. */
export function purchaseTax(price: number, sit: Situation) {
  const table = H.PURCHASE_TAX[sit === "nonresident" ? "additional" : sit];
  let tax = 0, floor = 0;
  for (const [cap, rate] of table) {
    if (price > floor) tax += (Math.min(price, cap) - floor) * rate;
    floor = cap;
  }
  return tax;
}

export const minApport = (sit: Situation) => 1 - H.MAX_LOAN[sit];

export function monthly(principal: number, years: number) {
  if (principal <= 0) return 0;
  const r = H.LOAN_RATE / 12, n = years * 12;
  return principal * r / (1 - Math.pow(1 + r, -n));
}

export interface Line { label: string; value: number; note?: string; strong?: boolean; neg?: boolean }

/** Frais d'achat détaillés. */
export function buyFees(price: number, sit: Situation, withAgency = true): Line[] {
  const lines: Line[] = [
    { label: "Taxe d’achat (Mas Rechisha)", value: purchaseTax(price, sit), note: SITUATIONS.find((s) => s.id === sit)!.label },
    { label: "Avocat", value: price * H.LAWYER_RATE * (1 + H.VAT), note: `${pct(H.LAWYER_RATE, 1)} + TVA` },
  ];
  if (withAgency) lines.push({ label: "Honoraires d’agence", value: price * H.AGENCY_RATE * (1 + H.VAT), note: `${pct(H.AGENCY_RATE)} + TVA` });
  lines.push({ label: "Expert immobilier (shamaï)", value: H.APPRAISER }, { label: "Frais divers", value: H.MISC_FEES, note: "Tabou, dossier bancaire, assurances" });
  return lines;
}

export const sum = (l: Line[]) => l.reduce((s, x) => s + x.value, 0);
export const pct = (x: number, d = 0) => (x * 100).toFixed(d).replace(".", ",") + " %";

export interface Input { mode: Mode; city: City; surface: number; situation: Situation; apport: number; years: number; reno: Reno }

export function compute(i: Input) {
  const price = i.city.m2 * i.surface, rent = i.city.rent * i.surface;
  if (i.mode === "location") {
    const arnona = H.ARNONA_M2 * i.surface, vaad = H.VAAD_M2 * i.surface, monthTotal = rent + arnona + vaad;
    return { price, rent, arnona, vaad, monthTotal, year: monthTotal * 12 };
  }
  if (i.mode === "flip") {
    const buy = price * (1 - H.FLIP_DISCOUNT), sale = price * (1 + H.FLIP_PREMIUM);
    const fees = buyFees(buy, i.situation, false);
    const works = H.RENO[i.reno].m2 * i.surface;
    const saleFees: Line[] = [
      { label: "Honoraires d’agence à la revente", value: sale * H.AGENCY_RATE * (1 + H.VAT), note: `${pct(H.AGENCY_RATE)} + TVA` },
      { label: "Avocat à la revente", value: sale * H.LAWYER_RATE * (1 + H.VAT), note: `${pct(H.LAWYER_RATE, 1)} + TVA` },
    ];
    const invested = buy + sum(fees) + works;
    const gain = sale - invested - sum(saleFees);
    return { price, buy, sale, fees, works, saleFees, invested, gain, ratio: gain / invested };
  }
  // achat et investissement
  const apport = price * i.apport, loan = price - apport;
  const pay = monthly(loan, i.years);
  const fees = buyFees(price, i.situation);
  const cash = apport + sum(fees);
  const base = { price, apport, loan, pay, fees, cash, rent, lowApport: i.apport < minApport(i.situation) - 1e-9 };
  if (i.mode === "achat") return base;
  const yearRent = rent * 12;
  const charges: Line[] = [
    { label: "Vacance locative", value: rent * H.VACANCY_MONTHS, note: `${H.VACANCY_MONTHS} mois par an`, neg: true },
    { label: "Entretien et assurance", value: yearRent * H.UPKEEP_RATE, note: pct(H.UPKEEP_RATE), neg: true },
    { label: "Gestion locative", value: yearRent * H.MANAGEMENT_RATE, note: pct(H.MANAGEMENT_RATE), neg: true },
  ];
  const net = yearRent - sum(charges);
  return { ...base, yearRent, charges, net, gross: yearRent / price, netYield: net / (price + sum(fees)), cashflow: net / 12 - pay };
}
