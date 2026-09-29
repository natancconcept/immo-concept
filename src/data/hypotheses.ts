/* ---------- Hypothèses du simulateur ----------
   Tous les chiffres utilisés par le simulateur sont ici. Ce sont des ordres de grandeur :
   faites-les valider par l'équipe (et l'avocat pour les taxes) et ajustez-les si besoin. */

/** Taxe d'achat (Mas Rechisha). Barèmes gelés du 16/01/2025 au 15/01/2028.
    Chaque tranche : [plafond en ₪, taux]. Le dernier plafond est Infinity. */
export const PURCHASE_TAX: Record<"resident" | "oleh" | "additional", [number, number][]> = {
  // Résident israélien, logement unique
  resident: [[1_978_745, 0], [2_347_040, 0.035], [6_055_070, 0.05], [20_183_565, 0.08], [Infinity, 0.1]],
  // Oleh / olah : logement unique acheté d'un an avant à 7 ans après l'alyah
  oleh: [[1_978_745, 0], [6_055_070, 0.005], [20_183_565, 0.08], [Infinity, 0.1]],
  // Bien supplémentaire (investissement) et la plupart des non-résidents
  additional: [[6_055_070, 0.08], [Infinity, 0.1]],
};

/** Part maximale financée par la banque (règles de la Banque d'Israël). */
export const MAX_LOAN = { oleh: 0.75, resident: 0.75, additional: 0.5, nonresident: 0.5 };

export const LOAN_RATE = 0.045;          // taux moyen du prêt (hypothèse)
export const LOAN_YEARS = [15, 20, 25, 30];
export const VAT = 0.18;                 // TVA israélienne (depuis janvier 2025)

/* Frais à l'achat */
export const LAWYER_RATE = 0.005;        // honoraires d'avocat : 0,5 % + TVA (usage)
export const AGENCY_RATE = 0.02;         // honoraires d'agence : 2 % + TVA (usage, à adapter à vos tarifs)
export const APPRAISER = 2_500;          // expert immobilier (shamaï) pour la banque
export const MISC_FEES = 4_000;          // frais divers : Tabou, dossier bancaire, assurances

/* Location */
export const ARNONA_M2 = 6;              // taxe municipale, ₪ par m² et par mois (varie selon la ville)
export const VAAD_M2 = 3;                // charges d'immeuble, ₪ par m² et par mois

/* Investissement locatif : charges déduites du loyer */
export const VACANCY_MONTHS = 1;         // mois sans locataire par an
export const UPKEEP_RATE = 0.05;         // entretien et assurance, en % du loyer
export const MANAGEMENT_RATE = 0.08;     // gestion locative, en % du loyer (à adapter à vos tarifs)

/* Rénovation et revente */
export const FLIP_DISCOUNT = 0.14;       // décote d'achat d'un bien à rénover
export const FLIP_PREMIUM = 0.06;        // prime de revente d'un bien entièrement refait
export const RENO: Record<"refresh" | "full" | "heavy", { label: string; sub: string; m2: number; months: string }> = {
  refresh: { label: "Rafraîchissement", sub: "Peinture, sols, petites réparations", m2: 1_500, months: "2 à 4 mois" },
  full: { label: "Rénovation complète", sub: "Cuisine, salle de bain, électricité, plomberie, sols", m2: 3_800, months: "6 à 9 mois" },
  heavy: { label: "Rénovation lourde", sub: "Nouveaux plans, redistribution des pièces, gros œuvre", m2: 5_500, months: "9 à 12 mois" },
};
