/* ---------- Questionnaire « Trouver ma ville » ----------
   Questions, choix et étapes de chaque type de projet. Les libellés des réponses sont aussi
   utilisés par le classement des villes (src/lib/recommend.ts) : si vous renommez un choix,
   renommez-le aussi là-bas. */
import { CITIES } from "./cities";

export type Answers = Record<string, string | string[] | number | undefined>;

export interface Question {
  id: string;
  label: string;
  type: "chips" | "multi" | "range" | "text";
  req?: boolean;
  opts?: string[];
  ph?: string;
  num?: boolean;
  /** La question n'apparaît que si cette fonction renvoie true. */
  show?: (a: Answers) => boolean;
}
export interface Page { title: string; q: Question[] }
export interface Goal { he: string; label: string; sub: string; slug: string; pages: Page[] }
export type GoalId = "olim" | "invest" | "gestion";

export const GOALS: Record<GoalId, Goal> = {
  olim: { he: "עלייה", label: "Je m’installe en Israël", sub: "Achat ou location, avec le choix de la ville", slug: "alyah", pages: [
    { title: "Votre foyer", q: [
      { id: "family", label: "Situation", type: "chips", req: true, opts: ["Seul(e)", "En couple", "Famille avec enfants", "Parent seul avec enfants"] },
      { id: "kids", label: "Âge des enfants (plusieurs choix possibles)", type: "multi", opts: ["Pas d’enfants", "Moins de 6 ans", "6 à 12 ans", "13 à 18 ans", "Plus de 18 ans"], show: (a) => /enfants/.test(String(a.family || "")) },
      { id: "age", label: "Votre âge", type: "chips", req: true, opts: ["Moins de 35 ans", "35 à 55 ans", "55 à 70 ans", "Plus de 70 ans"] },
      { id: "when", label: "Où en est votre alyah ?", type: "chips", opts: ["Déjà en Israël", "Dans moins d’un an", "Dans 1 à 3 ans", "Je me renseigne"] },
    ]},
    { title: "Votre mode de vie", q: [
      { id: "religion", label: "Pratique religieuse", type: "chips", req: true, opts: ["Laïque", "Traditionaliste", "Religieux (dati)", "Orthodoxe (haredi)"] },
      { id: "franco", label: "Vivre près d’une communauté francophone", type: "chips", req: true, opts: ["Essentiel", "Appréciable", "Peu importe"] },
      { id: "hebrew", label: "Votre niveau d’hébreu", type: "chips", opts: ["Aucun", "Débutant", "Je me débrouille", "Courant"] },
      { id: "vibe", label: "Cadre de vie recherché (plusieurs choix possibles)", type: "multi", opts: ["Grande ville animée", "Ville calme", "Bord de mer", "Proche de la nature"] },
    ]},
    { title: "Travail et santé", q: [
      { id: "job", label: "Votre activité", type: "chips", req: true, opts: ["High‑tech / télétravail", "Médical / paramédical", "Profession libérale", "Commerce / entreprise", "Enseignement", "Retraité(e)", "Autre / en recherche"] },
      { id: "workplace", label: "Où travaillerez‑vous ?", type: "chips", opts: ["Tel Aviv et le Centre", "Jérusalem", "À distance", "Sur place, où j’habite", "Je ne sais pas encore"], show: (a) => a.job !== "Retraité(e)" },
      { id: "health", label: "Besoins de santé", type: "chips", req: true, opts: ["Aucun particulier", "Suivi régulier", "Hôpital proche indispensable"] },
    ]},
    { title: "Le logement", q: [
      { id: "mode", label: "Vous souhaitez", type: "chips", req: true, opts: ["Acheter", "Louer", "Louer puis acheter"] },
      { id: "htype", label: "Type de logement", type: "chips", req: true, opts: ["Appartement", "Appartement avec jardin", "Penthouse / terrasse", "Maison / cottage"] },
      { id: "rooms", label: "Taille", type: "chips", req: true, opts: ["2‑3 pièces", "4 pièces", "5 pièces et +"] },
      { id: "build", label: "Construction", type: "chips", opts: ["Neuf ou sur plan", "Ancien", "Ancien à rénover", "Peu importe"] },
      { id: "budget", label: "Budget", type: "range" },
      { id: "extras", label: "Indispensable pour vous (plusieurs choix possibles)", type: "multi", opts: ["Ascenseur", "Mamad (pièce sécurisée)", "Parking", "Synagogue à pied", "Près de la plage", "Écoles à proximité"] },
    ]},
  ]},
  invest: { he: "השקעה", label: "J’investis", sub: "Acheter pour louer, ou rénover pour revendre", slug: "investissement", pages: [
    { title: "Votre investissement", q: [
      { id: "type", label: "Votre stratégie", type: "chips", req: true, opts: ["Acheter pour louer", "Acheter, rénover et revendre", "Je ne sais pas encore"] },
      { id: "goal", label: "Votre priorité", type: "chips", req: true, opts: ["Rendement", "Plus‑value", "Équilibre"] },
      { id: "capital", label: "Capital disponible", type: "chips", req: true, opts: ["Moins de 500 000 ₪", "500 000 à 1,5 M ₪", "Plus de 1,5 M ₪"] },
      { id: "fin", label: "Financement", type: "chips", opts: ["Comptant", "Avec prêt", "À étudier"] },
    ]},
    { title: "Villes et délais", q: [
      { id: "cities", label: "Villes qui vous intéressent (plusieurs choix possibles)", type: "multi", req: true, opts: [...CITIES.map((c) => c.name), "Aucune préférence"] },
      { id: "horizon", label: "Horizon souhaité", type: "chips", opts: ["Moins de 12 mois", "12 à 24 mois", "Long terme"] },
    ]},
  ]},
  gestion: { he: "ניהול נכס", label: "J’ai un bien à faire gérer", sub: "Rénovation, location, gestion ou revente de votre bien", slug: "gestion", pages: [
    { title: "Votre besoin", q: [
      { id: "situation", label: "Votre situation", type: "chips", req: true, opts: ["Je possède déjà un bien", "Je vais acheter un bien", "Bien hérité ou en indivision"] },
      { id: "services", label: "Ce que vous attendez de nous (plusieurs choix possibles)", type: "multi", req: true, opts: ["Rénovation et travaux", "Trouver des locataires", "Gestion au quotidien", "Revente", "Plans et aménagement"] },
      { id: "where", label: "Vous habitez", type: "chips", opts: ["En Israël", "À l’étranger"] },
    ]},
    { title: "Le bien", q: [
      { id: "city", label: "Ville du bien", type: "chips", req: true, opts: [...CITIES.map((c) => c.name), "Autre ville"] },
      { id: "ptype", label: "Type de bien", type: "chips", opts: ["Appartement", "Appartement avec jardin", "Penthouse / terrasse", "Maison / cottage"] },
      { id: "prooms", label: "Taille", type: "chips", opts: ["2‑3 pièces", "4 pièces", "5 pièces et +"] },
      { id: "state", label: "État actuel", type: "chips", opts: ["Bon état", "À rafraîchir", "Rénovation complète", "Je ne sais pas"] },
    ]},
  ]},
};

/** Lien vers le questionnaire avec un projet déjà choisi, ex. /trouver-ma-ville?projet=alyah */
export const questionnaireLink = (goal?: GoalId) => "/trouver-ma-ville" + (goal ? `?projet=${GOALS[goal].slug}` : "");
