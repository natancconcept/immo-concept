/* Classement des villes du questionnaire, repris tel quel de la maquette.
   Utilisé dans le navigateur (résultats) et par /api/conseil (prompt de l'IA). */
import { CITIES, type City } from "../data/cities";
import { GOALS, type Answers, type GoalId } from "../data/questionnaire";
import { fmt, shekK } from "./format";
import { SITE } from "../data/site";

export interface Reco { c: City; score: number; why: string[]; warn: string; est: number }

export const isRent = (a: Answers) => /^Louer$/.test(String(a.mode || ""));
export const budgetRange = (a: Answers) =>
  isRent(a)
    ? { min: 2500, max: 25000, step: 500, def: 7000, unit: " ₪ / mois" }
    : { min: 800000, max: 8000000, step: 50000, def: 2500000, unit: " ₪" };

const ROOMS_M2: Record<string, number> = { "2‑3 pièces": 80, "4 pièces": 100, "5 pièces et +": 125 };
const arr = (v: Answers[string]) => (Array.isArray(v) ? v : []);

export function recommend(a: Answers): Reco[] {
  const rent = isRent(a), house = a.htype === "Maison / cottage";
  const size = (ROOMS_M2[String(a.rooms)] || 100) * (house ? 1.3 : 1);
  const kids = arr(a.kids), vibe = arr(a.vibe), extras = arr(a.extras);
  const family = /enfants/.test(String(a.family || "")) && !kids.every((k) => k === "Pas d’enfants" || k === "Plus de 18 ans");
  return CITIES.map((c) => {
    const F: { w: number; v: number; why: string }[] = [];
    const add = (w: number, v: number, why: string) => { if (w > 0) F.push({ w, v, why }) };
    const rel = ({ "Laïque": "sec", "Traditionaliste": "trad", "Religieux (dati)": "dati", "Orthodoxe (haredi)": "haredi" } as const)[String(a.religion) as "Laïque"];
    if (rel) add(3, c[rel] / 3, { sec: "vie laïque et culturelle très présente", trad: "ambiance traditionaliste, synagogues de toutes origines", dati: "vie communautaire religieuse forte (écoles, synagogues)", haredi: "quartiers et institutions orthodoxes" }[rel]);
    const fw = (({ "Essentiel": 3, "Appréciable": 1.5 } as Record<string, number>)[String(a.franco)] || 0) + (a.hebrew === "Aucun" ? 1 : a.hebrew === "Débutant" ? 0.5 : 0);
    add(fw, c.franco / 3, "communauté francophone importante, commerces et services en français");
    if (vibe.includes("Grande ville animée")) add(1.5, c.urban / 3, "grande ville, vie animée");
    if (vibe.includes("Ville calme")) add(1.5, c.calm / 3, "ville calme et résidentielle");
    if (vibe.includes("Bord de mer") || extras.includes("Près de la plage")) add(2, c.sea / 3, "au bord de la mer");
    if (vibe.includes("Proche de la nature")) add(1.5, c.nature / 3, "nature et espaces verts à proximité");
    if (a.workplace === "Tel Aviv et le Centre" || (a.job === "High‑tech / télétravail" && a.workplace !== "À distance" && a.workplace !== "Jérusalem")) add(2.5, c.tech / 3, "proche des emplois du Centre et de la high‑tech");
    if (a.workplace === "Jérusalem") add(2.5, c.jer / 3, "accès facile à Jérusalem pour le travail");
    if (a.job === "Médical / paramédical") add(1.5, c.hosp / 3, `grand hôpital pour travailler (${c.hospName})`);
    const hw = (a.health === "Hôpital proche indispensable" ? 3 : a.health === "Suivi régulier" ? 1.5 : 0) + (a.age === "Plus de 70 ans" ? 1.5 : a.age === "55 à 70 ans" ? 0.75 : 0);
    add(hw, c.hosp / 3, `soins de qualité à proximité (${c.hospName})`);
    if (a.age === "Plus de 70 ans" || a.job === "Retraité(e)") add(1, c.calm / 3, "rythme de vie tranquille pour la retraite");
    if (family) add(1.5, (c.calm + c.nature) / 6, "cadre adapté aux familles avec enfants");
    if (house) add(2, c.house / 3, "maisons et cottages disponibles");
    if (a.build === "Neuf ou sur plan") add(1.5, c.neuf / 3, "beaucoup de programmes neufs");
    if (extras.includes("Synagogue à pied")) add(1, Math.max(c.trad, c.dati, c.haredi) / 3, "synagogues dans tous les quartiers");
    // budget
    const prem = house ? 1.2 : a.htype === "Penthouse / terrasse" ? 1.25 : a.htype === "Appartement avec jardin" ? 1.1 : 1;
    const est = (rent ? c.rent : c.m2) * size * prem, ratio = (+(a.budget ?? 0) || 0) / est;
    const bv = ratio >= 1 ? 1 : ratio >= 0.85 ? 0.6 : ratio >= 0.7 ? 0.25 : 0;
    add(4, bv, ratio >= 1 ? `dans votre budget (≈ ${rent ? fmt(est) + " ₪ / mois" : shekK(est)} pour ce type de bien)` : "");
    const tw = F.reduce((s, f) => s + f.w, 0), sc = F.reduce((s, f) => s + f.w * f.v, 0) / tw;
    const why = F.filter((f) => f.v >= 0.66 && f.why).sort((x, y) => y.w * y.v - x.w * x.v).slice(0, 4).map((f) => f.why);
    const warn = ratio < 1 ? `Au‑dessus de votre budget : compter environ ${rent ? fmt(est) + " ₪ / mois" : shekK(est)} pour ce bien. Une taille plus petite ou un quartier voisin peut suffire.` : "";
    return { c, score: sc, why, warn, est };
  }).sort((x, y) => y.score - x.score);
}

/** Réponses lisibles, une ligne par question (résumé WhatsApp et prompt de l'IA). */
export function profileText(goal: GoalId, a: Answers): string[] {
  const lines: string[] = [];
  GOALS[goal].pages.forEach((pg) => pg.q.forEach((q) => {
    if (q.show && !q.show(a)) return;
    let v = a[q.id];
    if (v == null || v === "" || (Array.isArray(v) && !v.length)) return;
    if (Array.isArray(v)) v = v.join(", ");
    if (q.type === "range") v = fmt(+v) + (isRent(a) ? " ₪ / mois" : " ₪");
    else if (q.id === "budget") v = v + " ₪";
    lines.push(`${q.label.replace(/ \(plusieurs choix possibles\)/, "")} : ${v}`);
  }));
  return lines;
}

/** Prompt du « Conseil personnalisé », identique à la maquette. */
export function advicePrompt(a: Answers, reco: Reco[]): string {
  const cityFacts = reco.slice(0, 6).map((r) => `- ${r.c.name} (compatibilité ${Math.round(r.score * 100)} %) : prix moyen estimé ${fmt(r.c.m2)} ₪/m², loyer estimé ${r.c.rent} ₪/m²/mois, hôpital : ${r.c.hospName}, quartiers : ${r.c.hood}. Points forts calculés : ${r.why.join("; ") || "aucun"}.${r.warn ? " " + r.warn : ""}`).join("\n");
  return `Tu es conseiller d'une agence immobilière francophone en Israël qui accompagne les olim depuis ${SITE.years} ans (avocats, travaux, recherche de logement).
Rédige en français un conseil personnalisé, chaleureux et concret (220 mots maximum, sans titre, 3 courts paragraphes) pour cette famille qui prépare son alyah :
1) quelle ville et quels quartiers privilégier et pourquoi, en t'appuyant sur leur profil ;
2) une alternative et le compromis qu'elle implique ;
3) 2 ou 3 conseils pratiques pour leur situation (écoles, oulpan, santé, démarches, type de bien), sans chiffres inventés.
N'invente aucun prix : utilise uniquement les estimations fournies et précise qu'elles sont indicatives. Termine en proposant d'en parler avec un conseiller sur WhatsApp.

Profil :
${profileText("olim", a).join("\n")}

Villes classées par le site :
${cityFacts}`;
}

/** Ne garde que les réponses valides du parcours alyah (utilisé côté serveur). */
export function sanitizeOlimAnswers(input: unknown): Answers | null {
  if (!input || typeof input !== "object") return null;
  const src = input as Record<string, unknown>, out: Answers = {};
  for (const pg of GOALS.olim.pages) for (const q of pg.q) {
    const v = src[q.id];
    if (q.type === "chips" && typeof v === "string" && q.opts!.includes(v)) out[q.id] = v;
    else if (q.type === "multi" && Array.isArray(v)) out[q.id] = [...new Set(v.filter((x): x is string => typeof x === "string" && q.opts!.includes(x)))];
    else if (q.type === "range" && typeof v === "number" && Number.isFinite(v)) out[q.id] = v;
  }
  if (typeof out.budget === "number") {
    const r = budgetRange(out);
    out.budget = Math.min(r.max, Math.max(r.min, out.budget));
  }
  const missing = GOALS.olim.pages.some((pg) => pg.q.some((q) => q.req && (!q.show || q.show(out)) && !out[q.id]));
  return missing ? null : out;
}
