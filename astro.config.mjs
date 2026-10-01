// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import netlify from "@astrojs/netlify";
import vercel from "@astrojs/vercel";
import { SITE } from "./src/data/site.ts";

// Les pages sont générées en HTML statique.
// Tournent côté serveur : /api/conseil (conseil rédigé par l'IA) et /api/lead (demandes).
// L'adaptateur Vercel est choisi automatiquement sur Vercel, Netlify sinon.
export default defineConfig({
  site: process.env.SITE_URL || SITE.url,
  trailingSlash: "never",
  redirects: { "/coup-de-fusil": "/investissement", "/renovation-revente": "/investissement" },
  // Les photos sont optimisées une fois pour toutes à la construction du site (WebP/AVIF).
  adapter: process.env.VERCEL ? vercel({ maxDuration: 60 }) : netlify({ imageCDN: false }),
  integrations: [sitemap({ filter: (page) => !page.includes("/api/") && !page.endsWith("/admin") })],
});
