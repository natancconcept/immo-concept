// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import netlify from "@astrojs/netlify";
import vercel from "@astrojs/vercel";
import { SITE } from "./src/data/site.ts";

// Toutes les pages sont générées en HTML statique.
// Seule la route /api/conseil (conseil rédigé par l'IA) tourne côté serveur :
// l'adaptateur Vercel est choisi automatiquement sur Vercel, Netlify sinon.
export default defineConfig({
  site: process.env.SITE_URL || SITE.url,
  trailingSlash: "never",
  adapter: process.env.VERCEL ? vercel() : netlify(),
  integrations: [sitemap({ filter: (page) => !page.includes("/api/") })],
});
