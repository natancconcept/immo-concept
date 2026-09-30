/* Écran d'attente pendant qu'une analyse IA (Gemini) est rédigée.
   Les chiffres restent masqués : on affiche des étapes et des conseils, puis le résultat d'un bloc. */

import { esc } from "./format";

export const SIM_TIPS = [
  "En Israël, les banques financent en général jusqu’à 75 % du prix pour un premier logement, et 50 % pour un investissement.",
  "La taxe d’achat (Mas Rechisha) dépend de votre statut : oleh, résident, déjà propriétaire. Le barème actuel court jusqu’en janvier 2028.",
  "Les banques demandent souvent que la mensualité ne dépasse pas environ un tiers de vos revenus nets.",
  "À l’achat, prévoyez autour de 0,5 % d’honoraires d’avocat et 2 % d’agence, plus la TVA — à confirmer sur votre dossier.",
  "L’arnona (taxe municipale) et le vaad bayit (charges d’immeuble) s’ajoutent chaque mois au loyer ou aux charges du propriétaire.",
  "Pour un investissement locatif, comptez environ un mois de vacance par an, plus l’entretien et, si besoin, la gestion.",
  "Un oleh peut souvent acheter son premier logement d’un an avant l’alyah jusqu’à sept ans après, avec un barème de taxe d’achat allégé.",
  "Le prix au m² affiché est une moyenne de ville : le quartier, l’état du bien et l’étage font souvent varier le budget.",
  "Un conseiller francophone relit ensuite les chiffres avec vous : prix réels, taux obtenus, taxes calculées par l’avocat de l’agence.",
];

export const OLIM_TIPS = [
  "Netanya, Ashdod et Jérusalem restent les villes les plus demandées par les francophones, chacune pour des raisons différentes.",
  "L’oulpan (cours d’hébreu) pèse souvent autant que le logement dans le choix d’une ville, surtout la première année.",
  "Le climat, les écoles et la présence d’une communauté francophone changent beaucoup d’une ville à l’autre — d’où cette comparaison.",
  "Le budget d’achat affiché sur le site est un ordre de grandeur : le quartier et le type de bien font la vraie différence.",
  "Un conseiller vous accompagne ensuite pour les visites, le dossier bancaire et l’avocat, en français.",
  "Beaucoup de familles commencent par une location de quelques mois, le temps de poser l’oulpan et de visiter sereinement.",
  "Les temps de trajet vers Tel‑Aviv ou Jérusalem varient fortement selon la ville et l’heure — un point que nous vérifions avec vous.",
  "La santé (caisse, spécialistes francophones) et les écoles sont croisées avec vos réponses avant de vous proposer des villes.",
];

export const SIM_WAIT_MS = 40_000;
export const OLIM_WAIT_MS = 50_000;

export function shuffle<T>(xs: readonly T[]): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function simStages(city: string): [string, string, string] {
  return ["Vos chiffres sont calculés", `Lecture du marché à ${city}`, "Rédaction de l’analyse"];
}

export const OLIM_STAGES: [string, string, string] = [
  "Lecture de votre profil",
  "Comparaison des villes",
  "Rédaction de l’analyse",
];

export function aiWaitHTML(opts: {
  kicker: string;
  title: string;
  lead: string;
  stages: [string, string, string];
  firstTip: string;
  compact?: boolean;
}): string {
  const stages = opts.stages
    .map((label, i) => `<li class="${i === 0 ? "is-done" : i === 1 ? "is-on" : ""}"><i></i>${esc(label)}</li>`)
    .join("");
  return `<div class="ai-wait${opts.compact ? " ai-wait-compact" : ""}" id="aiWait" aria-busy="true">
    <p class="kicker">${esc(opts.kicker)}</p>
    <h3 class="${opts.compact ? "ai-wait-title" : "q-title"}">${esc(opts.title)}</h3>
    <p class="q-help">${esc(opts.lead)}</p>
    ${opts.compact ? "" : `<ol class="ai-steps">${stages}</ol>`}
    <figure class="ai-tip">
      <figcaption class="reco-sub">Conseil en attendant</figcaption>
      <p class="ai-tip-text">${esc(opts.firstTip)}</p>
    </figure>
    <div class="ai-loading"><span class="spin" aria-hidden="true"></span><p>Analyse en cours</p></div>
  </div>`;
}

/** Fait défiler les conseils et avancer les étapes. À appeler après insertion du HTML. */
export function bindAiWait(root: ParentNode, tips: string[]): () => void {
  const text = root.querySelector<HTMLElement>(".ai-tip-text");
  const items = [...root.querySelectorAll(".ai-steps li")];
  let i = 0;
  let stage = 1;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tipMs = reduce ? 8000 : 4200;
  const stageMs = reduce ? 5000 : 3000;
  const swap = (next: string) => {
    if (!text) return;
    if (reduce) { text.textContent = next; return }
    text.classList.add("is-swap");
    window.setTimeout(() => { text.textContent = next; text.classList.remove("is-swap") }, 220);
  };
  const tipTimer = window.setInterval(() => {
    if (tips.length < 2) return;
    i = (i + 1) % tips.length;
    swap(tips[i]);
  }, tipMs);
  const stageTimer = items.length
    ? window.setInterval(() => {
        items[stage]?.classList.remove("is-on");
        items[stage]?.classList.add("is-done");
        stage++;
        items[stage]?.classList.add("is-on");
        if (stage >= items.length - 1) window.clearInterval(stageTimer);
      }, stageMs)
    : 0;
  return () => {
    window.clearInterval(tipTimer);
    if (stageTimer) window.clearInterval(stageTimer);
  };
}

/** Synthèse repliée (« Lire la suite ») et une seule section ouverte à la fois sur téléphone. */
export function bindAiRead(root: ParentNode) {
  const p = root.querySelector<HTMLElement>(".ai-synth");
  const btn = root.querySelector<HTMLButtonElement>(".ai-more");
  if (p && btn) {
    const overflow = p.scrollHeight > p.clientHeight + 4;
    btn.hidden = !overflow || p.classList.contains("is-open");
    if (!overflow) p.classList.add("is-open");
    btn.onclick = () => {
      const open = p.classList.toggle("is-open");
      btn.textContent = open ? "Réduire" : "Lire la suite";
      btn.hidden = false;
    };
  }
  const folds = [...root.querySelectorAll<HTMLDetailsElement>("details.ai-fold")];
  folds.forEach((d) => d.addEventListener("toggle", () => {
    if (!d.open || matchMedia("(min-width: 901px)").matches) return;
    folds.forEach((x) => { if (x !== d) x.open = false });
  }));
}

export const deskOpen = () => (matchMedia("(min-width: 901px)").matches ? " open" : "");
