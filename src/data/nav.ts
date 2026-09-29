/* Structure du site : utilisée par le menu, le pied de page et les liens « À voir aussi ».
   Pour ajouter une page au menu, ajoutez-la ici. */
import { questionnaireLink } from "./questionnaire";
import { PUBLIC_GALLERY } from "./gallery";

import type { IconName } from "../components/Icon.astro";

export interface NavLink { href: string; title: string; desc?: string; photo?: string; photoAlt?: string; icon?: IconName; tone?: "blue" | "sun" | "mint" | "rose" }

export const SERVICES: NavLink[] = [
  { href: "/alyah", title: "Achat & location", icon: "home", tone: "blue", photo: "interieur-soleil", photoAlt: "Salon lumineux",
    desc: "Pour y vivre : trouver, vérifier et acheter (ou louer) votre logement, que vous soyez en France ou déjà en Israël." },
  { href: "/investissement", title: "Investissement", icon: "chart", tone: "mint", photo: "interieur-blanc", photoAlt: "Appartement blanc et lumineux",
    desc: "Pour que ça rapporte : acheter pour louer, ou acheter un bien à rénover pour le revendre avec une plus‑value." },
  { href: "/gestion", title: "Gestion de votre bien", icon: "key", tone: "sun", photo: "cles", photoAlt: "Remise des clés d’un appartement",
    desc: "Vous avez un bien en Israël : nous le rénovons, trouvons les locataires, le gérons au quotidien ou le revendons." },
];

export const TOOLS: NavLink[] = [
  { href: questionnaireLink("olim"), title: "Trouver ma ville", icon: "pin", tone: "rose", desc: "Un questionnaire sur votre famille, votre pratique, votre travail et votre budget, et les villes qui vous correspondent." },
  { href: "/simulateur", title: "Simulateur de budget", icon: "calc", tone: "blue", desc: "Prix, mensualité, loyer, rendement ou plus‑value : un ordre de grandeur pour chaque ville." },
];

export const AGENCY: NavLink[] = [
  { href: "/agence", title: "Qui sommes‑nous", desc: "Notre équipe, notre méthode et nos engagements." },
  { href: "/partenaires", title: "Nos partenaires", desc: "Agence juive, Qualita, OlimAid : les organismes de l’alyah avec qui nous travaillons." },
  ...(PUBLIC_GALLERY.length ? [{ href: "/realisations", title: "Réalisations", desc: "Chantiers, ventes et avis de nos clients." }] : []),
  { href: "/contact", title: "Contact", desc: "WhatsApp, e‑mail, ou un message en ligne." },
];
