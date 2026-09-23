/* Structure du site : utilisée par le menu, le pied de page et les liens « À voir aussi ».
   Pour ajouter une page au menu, ajoutez-la ici. */
import { questionnaireLink } from "./questionnaire";
import { PUBLIC_GALLERY } from "./gallery";

export interface NavLink { href: string; title: string; desc?: string; he?: string; photo?: string; photoAlt?: string }

export const SERVICES: NavLink[] = [
  { href: "/alyah", title: "Achat & location", he: "עלייה", photo: "interieur-soleil", photoAlt: "Salon lumineux",
    desc: "Trouver, vérifier et acheter (ou louer) votre logement, que vous soyez en France ou déjà en Israël." },
  { href: "/investissement", title: "Investissement locatif", he: "השקעה", photo: "interieur-blanc", photoAlt: "Appartement blanc et lumineux",
    desc: "Acheter pour louer, trouver les locataires, gérer sur place, ou vendre un bien que vous possédez." },
  { href: "/renovation-revente", title: "Rénovation & revente", he: "שיפוץ", photo: "cuisine-en-travaux", photoAlt: "Cuisine en travaux",
    desc: "Acheter un bien sous‑évalué, le rénover entièrement avec nos artisans, le revendre avec une plus‑value." },
];

export const TOOLS: NavLink[] = [
  { href: questionnaireLink("olim"), title: "Trouver ma ville", desc: "Un questionnaire sur votre famille, votre pratique, votre travail et votre budget, et les villes qui vous correspondent." },
  { href: "/simulateur", title: "Simulateur de budget", desc: "Prix, mensualité, loyer, rendement ou plus‑value : un ordre de grandeur pour chaque ville." },
];

export const AGENCY: NavLink[] = [
  { href: "/agence", title: "Qui sommes‑nous", desc: "Notre équipe, notre méthode et nos engagements." },
  ...(PUBLIC_GALLERY.length ? [{ href: "/realisations", title: "Réalisations", desc: "Chantiers, ventes et avis de nos clients." }] : []),
  { href: "/contact", title: "Contact", desc: "WhatsApp, e‑mail, ou un message en ligne." },
];
