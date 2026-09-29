/* ---------- Partenaires ----------
   Pour ajouter un partenaire : copier un bloc et changer les valeurs.
   - logo : fichier déposé dans public/partenaires/ (ex. "/partenaires/qualita.png"), sinon les initiales s'affichent.
   - Faites valider le texte et le lien par le partenaire. */

export interface Partner {
  name: string;
  /** Initiales affichées tant qu'il n'y a pas de logo. */
  initials: string;
  /** En une ligne : ce qu'est l'organisme. */
  kind: string;
  /** Petit descriptif (2 phrases), affiché sur la page Partenaires. */
  desc: string;
  /** Une ligne, affichée dans le bandeau des partenaires (accueil, Alyah). */
  short: string;
  /** Site officiel. */
  url: string;
  logo?: string;
  tone: "blue" | "sun" | "mint" | "rose";
}

export const PARTNERS: Partner[] = [
  {
    name: "L’Agence juive pour Israël",
    initials: "AJ",
    kind: "L’organisme officiel de l’alyah",
    desc: "En lien avec le gouvernement israélien, elle accompagne les candidats à l’alyah de la décision jusqu’à l’intégration : ouverture du dossier, préparation du départ, aides à l’installation et oulpan.",
    short: "Ouverture du dossier, préparation du départ et aides à l’installation.",
    url: "https://www.jewishagency.org/fr/",
    logo: "/partenaires/agence-juive.svg",
    tone: "blue",
  },
  {
    name: "Qualita",
    initials: "Q",
    kind: "Intégration des olim francophones",
    desc: "Organisation créée en 2015 pour faciliter l’intégration des francophones en Israël : centre des droits, aide à l’emploi, reconnaissance des diplômes, réseau de bénévoles et projets pour les jeunes.",
    short: "Droits, emploi et reconnaissance des diplômes des francophones.",
    url: "https://www.qualita.org.il/",
    logo: "/partenaires/qualita.png",
    tone: "mint",
  },
  {
    name: "OlimAid",
    initials: "OA",
    kind: "Aide aux démarches, en français",
    desc: "Plateforme francophone qui aide les olim dans leurs démarches : guides pratiques et outils gratuits pour les documents, la banque, la santé, l’emploi et les impôts.",
    short: "Aide aux démarches administratives, en français.",
    url: "https://www.olimaid.com/fr",
    logo: "/partenaires/olimaid.png",
    tone: "sun",
  },
];
