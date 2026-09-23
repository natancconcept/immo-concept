/* ---------- Informations de la société ----------
   C'est le SEUL endroit où figurent le nom, le numéro WhatsApp et l'e-mail.
   Tout le site (en-tête, pied de page, liens WhatsApp, balises SEO) les lit ici. */

export const SITE = {
  /** Nom de la société (provisoire). Les initiales du logo en sont tirées automatiquement. */
  name: "C.C. Concept",
  /** Numéro WhatsApp au format international, chiffres seulement (provisoire). */
  whatsapp: "972500000000",
  /** E-mail de contact (provisoire). */
  email: "contact@example.com",
  /** Adresse définitive du site, sans « / » final. Peut aussi être donnée par la variable SITE_URL. */
  url: "https://www.example.com",
  /** Années d'expérience affichées sur le site. */
  years: 15,
  /** Tant que c'est true, les étiquettes « provisoire » s'affichent à côté du nom et du numéro. */
  provisional: true,
  /** Photo de l'accueil (ex. "/realisations/accueil.jpg"). Vide = illustration dessinée. */
  heroPhoto: "",
};

/** Initiales du logo, tirées du nom (ex. « A.B. Immo » → « AB », « Maison Soleil » → « MS »). */
export const logoMark = (() => {
  const first = SITE.name.split(" ")[0].replace(/[^A-Z]/g, "");
  return (first.length >= 2 ? first : SITE.name.split(/\s+/).map((w) => w[0]).join("")).slice(0, 3).toUpperCase();
})();

/** Numéro lisible, ex. "972521234567" → "+972 52‑123‑4567". */
export function phoneDisplay(digits = SITE.whatsapp) {
  if (digits.startsWith("972") && digits.length === 12)
    return `+972 ${digits.slice(3, 5)}‑${digits.slice(5, 8)}‑${digits.slice(8)}`;
  return "+" + digits;
}

/** Lien WhatsApp, avec un message prérempli si besoin. */
export function waLink(text?: string) {
  return `https://wa.me/${SITE.whatsapp}` + (text ? `?text=${encodeURIComponent(text)}` : "");
}
