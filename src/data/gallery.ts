/* ---------- Réalisations et témoignages ----------
   Pour mettre du vrai contenu :
   1. Déposez les fichiers dans public/realisations/ (ex. public/realisations/netanya-avant.jpg).
   2. Renseignez les champs, soit avec le nom d'une photo de src/assets/photos (optimisée
      automatiquement, recommandé), soit avec une adresse commençant par /realisations/ :
        photo    : photo principale (vente, témoignage, affiche de la vidéo)
        before   : photo AVANT travaux      after : photo APRÈS travaux
        videoUrl : vidéo .mp4 (témoignage vidéo)
   3. Retirez `demo: true` : l'élément apparaît sur le site public (les exemples sont masqués).
   Sans photo, une illustration provisoire est dessinée (kind + seed choisissent le dessin).

   Les éléments apparaissent sur la page d'une ville quand `city` ou `from` contient le nom de la ville. */

import { SITE } from "./site";

export type RoomKind = "kitchen" | "living" | "bath";

interface Base {
  /** Dessin provisoire utilisé tant qu'il n'y a pas de photo. */
  kind: RoomKind;
  seed: number;
  /** true = contenu d'exemple, affiche l'étiquette « exemple ». */
  demo?: boolean;
  photo?: string;
}
export interface BeforeAfterItem extends Base {
  type: "ba"; title: string; city: string; works: string; months: number; gain: string;
  before?: string; after?: string;
}
export interface SaleItem extends Base {
  type: "sale"; title: string; city: string; price: string; days: number; profile: string;
}
export interface TestimonialItem extends Base {
  type: "testi"; name: string; from: string; project: string; text: string;
  /** Témoignage vidéo : true, avec videoUrl quand la vraie vidéo est prête. */
  video?: boolean; dur?: string; videoUrl?: string;
}
export type GalleryItem = BeforeAfterItem | SaleItem | TestimonialItem;

export const GALLERY: GalleryItem[] = [
  {type:"ba", title:"Cuisine ouverte, 4 pièces", city:"Netanya", kind:"kitchen", seed:11, works:"390 000 ₪", months:5, gain:"+ 440 000 ₪", demo:true},
  {type:"sale", title:"4 pièces vue mer", city:"Netanya, Ir Yamim", kind:"living", seed:41, price:"2 950 000 ₪", days:38, profile:"Famille olim, Paris", demo:true},
  {type:"testi", name:"Famille L.", from:"Paris → Netanya", project:"Achat résidence principale", video:true, dur:"2:14", seed:51, kind:"living", text:"On a acheté depuis la France sans stress : visites en vidéo, avocat francophone, et les clés le jour de notre arrivée.", demo:true},
  {type:"ba", title:"Rez‑de‑jardin rénové", city:"Jérusalem, Baka", kind:"living", seed:23, works:"340 000 ₪", months:6, gain:"+ 510 000 ₪", demo:true},
  {type:"testi", name:"Michel et Annie S.", from:"Lyon → Ashkelon", project:"Retraite, achat avec jardin", seed:61, kind:"living", text:"À notre âge on voulait du calme, la mer et un hôpital proche. Ils ont trouvé exactement ça, et se sont occupés de tous les papiers.", demo:true},
  {type:"sale", title:"3 pièces rénové", city:"Jérusalem, Katamon", kind:"kitchen", seed:71, price:"3 180 000 ₪", days:52, profile:"Revente coup de fusil", demo:true},
  {type:"ba", title:"Salle de bain complète", city:"Ashdod", kind:"bath", seed:37, works:"85 000 ₪", months:1, gain:"—", demo:true},
  {type:"testi", name:"Yoni B.", from:"Marseille", project:"Investissement locatif à Beer‑Sheva", video:true, dur:"1:32", seed:81, kind:"kitchen", text:"Deux appartements achetés, loués en trois semaines. Je reçois un point chaque mois sur WhatsApp, sans me déplacer.", demo:true},
  {type:"sale", title:"5 pièces avec terrasse", city:"Ashdod, la Marina", kind:"living", seed:91, price:"2 890 000 ₪", days:45, profile:"Famille olim, Sarcelles", demo:true},
  {type:"ba", title:"Duplex refait à neuf", city:"Ra’anana", kind:"kitchen", seed:101, works:"460 000 ₪", months:7, gain:"+ 620 000 ₪", demo:true},
  {type:"testi", name:"Sarah et David M.", from:"Strasbourg → Tel Aviv", project:"Location puis achat", seed:111, kind:"kitchen", text:"On a d’abord loué pour découvrir la ville, puis acheté un an après avec la même équipe. Tout en français, c’est précieux.", demo:true},
  {type:"sale", title:"2 pièces investisseur", city:"Tel Aviv, Vieux Nord", kind:"bath", seed:121, price:"2 640 000 ₪", days:29, profile:"Investisseur, Bruxelles", demo:true},
  {type:"ba", title:"Appartement familial", city:"Haïfa, Carmel", kind:"living", seed:131, works:"290 000 ₪", months:4, gain:"+ 330 000 ₪", demo:true},
  {type:"testi", name:"Nathan K.", from:"Nice", project:"Associé sur un coup de fusil", video:true, dur:"3:05", seed:141, kind:"bath", text:"Achat, plans, chantier, revente : j’ai suivi chaque semaine avec photos. L’opération s’est faite en huit mois.", demo:true},
  {type:"sale", title:"Cottage 6 pièces", city:"Modiin, Buchman", kind:"living", seed:151, price:"4 350 000 ₪", days:61, profile:"Famille olim, Toulouse", demo:true},
  {type:"ba", title:"Cuisine et séjour", city:"Beer‑Sheva", kind:"kitchen", seed:161, works:"180 000 ₪", months:3, gain:"Loué 5 200 ₪/mois", demo:true},
];

/** Éléments visibles sur le site public (sans les exemples si SITE.showExamples est false). */
export const PUBLIC_GALLERY = GALLERY.filter((g) => SITE.showExamples || !g.demo);
export const PUBLIC_PROJECTS = () => PROJECTS.filter((p) => SITE.showExamples || !p.demo);

export const GAL_TYPES = { all: "Tout", ba: "Avant / Après", sale: "Ventes réalisées", testi: "Témoignages", video: "Vidéos" } as const;
export type GalFilter = keyof typeof GAL_TYPES;

export const matchesFilter = (g: GalleryItem, f: GalFilter) =>
  f === "all" || (f === "video" ? g.type === "testi" && !!g.video : g.type === f);

/* ---------- Opérations « coup de fusil » : avant / après de la page /renovation-revente ----------
   Mêmes règles : before / after = photos dans public/realisations/, sinon dessin provisoire. */
export interface FlipProject {
  title: string; city: string; kind: RoomKind; seed: number;
  buy: number; works: number; sale: number; months: number;
  before?: string; after?: string; demo?: boolean;
}
export const PROJECTS: FlipProject[] = [
  {title:"Appartement 4 pièces", city:"Netanya", kind:"kitchen", seed:11, buy:2150000, works:390000, sale:2980000, months:5, demo:true},
  {title:"Rez‑de‑jardin 3 pièces", city:"Jérusalem, Baka", kind:"living", seed:23, buy:2600000, works:340000, sale:3450000, months:6, demo:true},
  {title:"Salle de bain et plomberie", city:"Ashdod", kind:"bath", seed:37, buy:1650000, works:260000, sale:2180000, months:4, demo:true},
];
