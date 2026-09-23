/* ---------- Villes ----------
   D'où viennent les chiffres :
   - avg  : prix moyen d'un appartement vendu, Bureau central des statistiques (CBS), T4 2025 (via ynet).
            null = ville absente de ce classement. Donnée publiée, fiable.
   - m2   : prix au m² ESTIMÉ (prix moyen CBS ÷ surface type). ⚠ À FAIRE VALIDER par l'équipe.
   - rent : loyer au m² par mois, ESTIMATION. ⚠ À FAIRE VALIDER par l'équipe.
   - Notes de 0 à 3 (franco, sec, trad, dati, haredi, sea, hosp, tech, jer, urban, calm, nature, neuf, house) :
            appréciations de l'équipe. ⚠ À FAIRE VALIDER. Elles pilotent le classement du questionnaire.

   Pour ajouter une ville : copier un bloc, changer l'id (il devient l'adresse /villes/<id>) et les valeurs. */

export type Score = 0 | 1 | 2 | 3;

export interface City {
  id: string;
  name: string;
  region: string;
  /** Prix moyen CBS fin 2025, en ₪ (null si non publié). */
  avg: number | null;
  /** Prix au m² estimé, en ₪. */
  m2: number;
  /** Loyer au m² par mois estimé, en ₪. */
  rent: number;
  franco: Score; sec: Score; trad: Score; dati: Score; haredi: Score;
  sea: Score; hosp: Score; tech: Score; jer: Score; urban: Score;
  calm: Score; nature: Score; neuf: Score; house: Score;
  /** Quartiers souvent recherchés. */
  hood: string;
  /** Hôpitaux de référence. */
  hospName: string;
  /** Présentation courte (page de la ville). */
  blurb: string;
}

export const CITIES: City[] = [
  {id:"jerusalem", name:"Jérusalem", region:"Jérusalem", avg:3330000, m2:37000, rent:85,
   franco:3, sec:1, trad:2, dati:3, haredi:3, sea:0, hosp:3, tech:1, jer:3, urban:3, calm:1, nature:2, neuf:2, house:1,
   hood:"Baka, Katamon, Arnona, Har Homa", hospName:"Hadassah, Shaare Zedek",
   blurb:"Capitale et cœur spirituel du pays, avec une grande communauté francophone et des quartiers pour tous les niveaux de pratique."},
  {id:"beitshemesh", name:"Beit Shemesh", region:"Jérusalem", avg:2470000, m2:22500, rent:55,
   franco:1, sec:0, trad:1, dati:3, haredi:3, sea:0, hosp:1, tech:1, jer:2, urban:1, calm:2, nature:3, neuf:3, house:2,
   hood:"Ramat Beit Shemesh", hospName:"hôpitaux de Jérusalem à 40 min",
   blurb:"Ville en forte croissance entre Jérusalem et la plaine, très prisée des familles religieuses, avec beaucoup de constructions neuves."},
  {id:"telaviv", name:"Tel Aviv", region:"Centre", avg:4160000, m2:52000, rent:115,
   franco:2, sec:3, trad:1, dati:1, haredi:0, sea:3, hosp:3, tech:3, jer:1, urban:3, calm:0, nature:0, neuf:2, house:0,
   hood:"Vieux Nord, Neve Tsedek", hospName:"Ichilov",
   blurb:"Plage, high‑tech et vie culturelle intense : la ville la plus animée du pays, et la plus chère."},
  {id:"ramatgan", name:"Ramat Gan", region:"Centre", avg:3280000, m2:34500, rent:90,
   franco:1, sec:3, trad:2, dati:2, haredi:1, sea:1, hosp:3, tech:3, jer:1, urban:2, calm:1, nature:1, neuf:3, house:0,
   hood:"Ramat Chen, quartier de la Bourse", hospName:"Sheba (Tel HaShomer)",
   blurb:"Aux portes de Tel Aviv : tours modernes, quartier des affaires et le grand hôpital Sheba."},
  {id:"petahtikva", name:"Petah Tikva", region:"Centre", avg:2700000, m2:27000, rent:72,
   franco:1, sec:2, trad:2, dati:2, haredi:2, sea:0, hosp:3, tech:3, jer:0, urban:2, calm:1, nature:1, neuf:3, house:1,
   hood:"Em HaMoshavot, Kfar Ganim", hospName:"Beilinson, Schneider (enfants)",
   blurb:"Grande ville du Centre bien reliée à Tel Aviv, avec de nombreux programmes neufs et des hôpitaux de référence."},
  {id:"modiin", name:"Modiin", region:"Centre", avg:null, m2:25000, rent:65,
   franco:1, sec:2, trad:2, dati:2, haredi:0, sea:0, hosp:1, tech:2, jer:2, urban:1, calm:3, nature:3, neuf:2, house:3,
   hood:"Buchman, Moriah", hospName:"Shamir (Assaf HaRofe) à 20 min",
   blurb:"Ville nouvelle verte et familiale entre Tel Aviv et Jérusalem, avec beaucoup de maisons et de cottages."},
  {id:"raanana", name:"Ra’anana", region:"Sharon", avg:null, m2:30000, rent:82,
   franco:2, sec:2, trad:2, dati:3, haredi:1, sea:1, hosp:2, tech:3, jer:0, urban:1, calm:3, nature:2, neuf:1, house:2,
   hood:"Lev Ra’anana, centre", hospName:"Meir (Kfar Saba)",
   blurb:"Ville résidentielle et calme du Sharon, appréciée des familles francophones et anglophones."},
  {id:"herzliya", name:"Herzliya", region:"Sharon", avg:3970000, m2:38000, rent:95,
   franco:1, sec:3, trad:2, dati:1, haredi:0, sea:3, hosp:2, tech:3, jer:0, urban:2, calm:2, nature:1, neuf:2, house:2,
   hood:"Herzliya Pituah, centre", hospName:"hôpitaux de Tel Aviv à 20 min",
   blurb:"Bord de mer, zone high‑tech de Herzliya Pituah et quartiers résidentiels haut de gamme."},
  {id:"netanya", name:"Netanya", region:"Sharon", avg:2710000, m2:25800, rent:70,
   franco:3, sec:2, trad:3, dati:3, haredi:2, sea:3, hosp:2, tech:2, jer:0, urban:2, calm:2, nature:1, neuf:3, house:1,
   hood:"Ir Yamim, Kiryat Hasharon, Agamim, front de mer", hospName:"Laniado",
   blurb:"La ville des francophones en Israël : front de mer, commerces en français et nombreux programmes neufs."},
  {id:"haifa", name:"Haïfa", region:"Nord", avg:1830000, m2:20300, rent:55,
   franco:1, sec:3, trad:1, dati:1, haredi:1, sea:3, hosp:3, tech:2, jer:0, urban:2, calm:2, nature:3, neuf:1, house:1,
   hood:"Carmel", hospName:"Rambam",
   blurb:"Grande ville du Nord entre mer et mont Carmel, universitaire, mixte et plus abordable que le Centre."},
  {id:"ashdod", name:"Ashdod", region:"Sud", avg:2150000, m2:21500, rent:60,
   franco:3, sec:2, trad:3, dati:3, haredi:3, sea:3, hosp:2, tech:1, jer:1, urban:2, calm:2, nature:1, neuf:3, house:1,
   hood:"la Marina, City, nouveaux quartiers", hospName:"Assuta Ashdod",
   blurb:"Grand port du Sud au bord de la mer, avec une importante communauté francophone et des prix plus doux."},
  {id:"ashkelon", name:"Ashkelon", region:"Sud", avg:1720000, m2:17200, rent:50,
   franco:2, sec:2, trad:3, dati:2, haredi:1, sea:3, hosp:2, tech:1, jer:0, urban:1, calm:3, nature:2, neuf:3, house:2,
   hood:"Barnea, la Marina", hospName:"Barzilai",
   blurb:"Ville côtière calme du Sud, marina et plages, prisée des retraités et des familles francophones."},
  {id:"beersheva", name:"Beer‑Sheva", region:"Sud", avg:1280000, m2:13500, rent:45,
   franco:1, sec:2, trad:3, dati:2, haredi:1, sea:0, hosp:3, tech:1, jer:0, urban:2, calm:2, nature:2, neuf:2, house:2,
   hood:"Ramot, Nahal Beka", hospName:"Soroka",
   blurb:"Capitale du Néguev, avec son université, l’hôpital Soroka et des prix parmi les plus accessibles du pays."},
  {id:"eilat", name:"Eilat", region:"Sud", avg:null, m2:17500, rent:55,
   franco:1, sec:3, trad:1, dati:1, haredi:0, sea:3, hosp:1, tech:0, jer:0, urban:1, calm:2, nature:3, neuf:1, house:1,
   hood:"Shahamon", hospName:"Yoseftal",
   blurb:"Au bord de la mer Rouge, du soleil toute l’année, le tourisme et une zone sans TVA."},
];

/** Les 6 villes mises en avant sur l'accueil. */
export const HOME_CITIES = ["jerusalem", "telaviv", "netanya", "ashdod", "raanana", "haifa"];

export const REGIONS = [...new Set(CITIES.map((c) => c.region))];

export const cityById = (id: string) => CITIES.find((c) => c.id === id);

/** Lignes du profil « La vie à … » sur la page de chaque ville. */
export const PROFILE: [string, keyof City][] = [
  ["Communauté francophone", "franco"], ["Vie laïque", "sec"], ["Vie traditionaliste", "trad"],
  ["Vie religieuse (dati)", "dati"], ["Vie orthodoxe (haredi)", "haredi"], ["Bord de mer", "sea"],
  ["Hôpitaux", "hosp"], ["Emplois high‑tech proches", "tech"], ["Calme", "calm"],
  ["Programmes neufs", "neuf"], ["Maisons et cottages", "house"],
];

/* ---------- Hypothèses du simulateur (à valider) ---------- */
export const RENO_M2 = 3800;        // coût travaux complet / m²
export const FLIP_DISCOUNT = 0.14;  // décote d'achat d'un bien à rénover
export const FLIP_PREMIUM = 0.06;   // prime d'un bien entièrement refait
export const FEES = 0.07;           // frais achat + vente : avocat, taxes, courtage
export const RATE = 0.045;          // taux du prêt
export const YEARS = 25;            // durée du prêt
