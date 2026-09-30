/* Analyse détaillée des villes par l'IA (Gemini ou Claude), à la fin du questionnaire alyah.
   Le prompt réunit toutes les réponses cochées et les données de nos fiches villes ; l'IA renvoie
   un JSON (schéma ci‑dessous) qui est vérifié ici avant d'être affiché. */
import { CITIES } from "../data/cities";
import { type Answers } from "../data/questionnaire";
import { fmt, shekK } from "./format";
import { SITE } from "../data/site";
import { isRent, profileText, recommend } from "./recommend";

export interface CityAnalysis {
  id: string;
  pct: number;
  verdict: string;
  forces: string[];
  limites: string[];
  quartiers: string[];
  budget: string;
}
export interface Analysis { synthese: string; villes: CityAnalysis[]; conseils: string[] }

const CITY_IDS = CITIES.map((c) => c.id);
const str = { type: "string" } as const;
const list = { type: "array", items: str } as const;

/** Schéma JSON de la réponse attendue (format JSON Schema, accepté par Claude et Gemini). */
export const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    synthese: str,
    villes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", enum: CITY_IDS },
          pct: { type: "integer" },
          verdict: str,
          forces: list,
          limites: list,
          quartiers: list,
          budget: str,
        },
        required: ["id", "pct", "verdict", "forces", "limites", "quartiers", "budget"],
        additionalProperties: false,
      },
    },
    conseils: list,
  },
  required: ["synthese", "villes", "conseils"],
  additionalProperties: false,
};

const NOTES: [keyof (typeof CITIES)[number], string][] = [
  ["franco", "communauté francophone"], ["sec", "vie laïque"], ["trad", "traditionaliste"], ["dati", "religieux (dati)"],
  ["haredi", "orthodoxe (haredi)"], ["sea", "mer"], ["hosp", "hôpitaux"], ["tech", "emplois high‑tech / Centre"],
  ["jer", "accès à Jérusalem"], ["urban", "vie urbaine animée"], ["calm", "calme"], ["nature", "nature"],
  ["neuf", "programmes neufs"], ["house", "maisons / cottages"],
];

export function analysisPrompt(a: Answers): string {
  const rent = isRent(a), budget = +(a.budget ?? 0) || 0;
  const reco = recommend(a);
  const cities = reco.map((r) => {
    const c = r.c, notes = NOTES.map(([k, l]) => `${l} ${c[k]}/3`).join(", ");
    const cost = rent ? `${fmt(r.est)} ₪ / mois` : shekK(r.est);
    return `### ${c.name} (id: ${c.id}) – ${c.region}
- Coût estimé du logement recherché : ${cost} (le budget représente ${Math.round((budget / r.est) * 100)} % de ce coût)
- Prix moyen ≈ ${fmt(c.m2)} ₪/m² ; loyer ≈ ${c.rent} ₪/m²/mois
- Notes (0 = absent, 3 = excellent) : ${notes}
- Hôpitaux : ${c.hospName} ; quartiers souvent choisis : ${c.hood}
- Présentation : ${c.blurb}
- Score calculé par le site : ${Math.round(r.score * 100)} %`;
  }).join("\n\n");

  return `Tu es le conseiller d'une agence immobilière francophone en Israël qui accompagne les olim depuis ${SITE.years} ans.
Une personne qui prépare son alyah a rempli notre questionnaire. Évalue, pour elle, la compatibilité de chaque ville ci‑dessous et donne une analyse détaillée et fiable.

## Profil (réponses cochées)
${profileText("olim", a).join("\n")}

## Villes (données de l'agence)
${cities}

## Méthode
1. Repère d'abord les critères éliminatoires ou essentiels du profil : budget, pratique religieuse, besoin d'une communauté francophone, santé, lieu de travail, enfants. Puis les préférences (cadre de vie, mer, neuf, indispensables).
2. Pour chaque ville, donne un pourcentage de compatibilité de 0 à 100 :
   - 85 à 100 : correspond à tous les critères essentiels et à la plupart des préférences, dans le budget ;
   - 65 à 84 : bon choix avec un ou deux compromis ;
   - 40 à 64 : compromis importants ;
   - moins de 40 : déconseillée pour ce profil.
   Un budget inférieur à 85 % du coût estimé ou une pratique religieuse mal servie (note 0 ou 1) doivent faire nettement baisser le pourcentage.
   Le score calculé par le site est un repère : tu peux t'en écarter si le profil le justifie, mais le pourcentage doit rester cohérent avec les forces et limites que tu écris.
3. Ne t'appuie que sur les données fournies et sur des faits généraux reconnus sur ces villes. N'invente aucun prix, aucun chiffre, aucun nom d'école : pour les montants, reprends uniquement les estimations fournies en précisant qu'elles sont indicatives.

## Réponse (en français, JSON conforme au schéma)
- "synthese" : 3 à 4 phrases qui résument le profil et la recommandation principale.
- "villes" : les 5 villes les plus adaptées, de la plus compatible à la moins compatible. Pour chacune :
  "id" (identifiant ci‑dessus), "pct" (entier), "verdict" (une phrase), "forces" (2 à 4 points précis liés au profil),
  "limites" (1 à 3 points, compromis ou vigilance), "quartiers" (2 ou 3 quartiers conseillés pour ce profil, parmi ceux connus de la ville),
  "budget" (une phrase sur l'adéquation du budget avec l'estimation fournie).
- "conseils" : 3 ou 4 conseils pratiques pour cette situation (écoles, oulpan, santé, démarches, type de bien).
Écris « vous » en t'adressant à la personne. Phrases courtes et concrètes, sans formules creuses.`;
}

const clean = (v: unknown, max = 400) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const cleanList = (v: unknown, n: number) => (Array.isArray(v) ? v.map((x) => clean(x, 240)).filter(Boolean).slice(0, n) : []);

/** Vérifie et normalise la réponse de l'IA. Renvoie null si elle est inutilisable. */
export function parseAnalysis(raw: string): Analysis | null {
  let j: Record<string, unknown>;
  try { j = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, "")) } catch { return null }
  if (!j || typeof j !== "object" || !Array.isArray(j.villes)) return null;
  const seen = new Set<string>();
  const villes = (j.villes as Record<string, unknown>[]).flatMap((v) => {
    const id = String(v?.id ?? "");
    if (!CITY_IDS.includes(id) || seen.has(id)) return [];
    seen.add(id);
    const pct = Math.round(Math.min(100, Math.max(0, Number(v.pct) || 0)));
    return [{ id, pct, verdict: clean(v.verdict), forces: cleanList(v.forces, 4), limites: cleanList(v.limites, 3), quartiers: cleanList(v.quartiers, 3), budget: clean(v.budget) }];
  }).sort((x, y) => y.pct - x.pct).slice(0, 5);
  if (villes.length < 3) return null;
  return { synthese: clean(j.synthese, 900), villes, conseils: cleanList(j.conseils, 4) };
}
