# Site de l’agence : immobilier en Israël, en français

Site vitrine construit avec [Astro](https://astro.build) à partir de la maquette. Toutes les pages sont générées en HTML statique (rapide et bien référencé par Google). Une seule fonction tourne sur un serveur : `/api/conseil`, le conseil personnalisé rédigé par l’IA à la fin du questionnaire.

## Pages

| Adresse | Contenu |
|---|---|
| `/` | Accueil |
| `/alyah` | Acheter ou louer pour son alyah, parcours, FAQ, questionnaire |
| `/investissement` | Investir : acheter pour louer, ou acheter, rénover et revendre (« coup de fusil »). Simulateur, rendement par ville, avant/après, formulaire |
| `/gestion` | Gestion de votre bien : rénovation, mise en location, gestion au quotidien, revente. Estimation du loyer, FAQ, formulaire |
| `/villes` et `/villes/<ville>` | Les 14 villes, une page par ville (ex. `/villes/netanya`) |
| `/realisations` | Galerie filtrable : avant/après, ventes, témoignages, vidéos |
| `/simulateur` | Simulateur complet. Accepte `?ville=haifa&mode=invest` |
| `/trouver-ma-ville` | Le questionnaire. `?projet=alyah`, `investissement` ou `gestion` ouvre directement le bon parcours. Les anciennes adresses `/coup-de-fusil` et `/renovation-revente` redirigent vers `/investissement` |
| `/agence` | Qui sommes‑nous : l’équipe, la méthode, les engagements, les villes |
| `/partenaires` | Nos partenaires (Agence juive, Qualita, OlimAid), avec lien vers leur site officiel |
| `/contact` | WhatsApp, e‑mail et formulaire (le message s’ouvre dans WhatsApp) |
| `/mentions-legales` | Mentions légales (à compléter dans `site.ts`) |

Toutes les pages sont reliées entre elles : menu déroulant (Services, Villes, Outils, L’agence), menu complet sur téléphone, bloc « À voir aussi » en bas des pages, et plan du site dans le pied de page.

Le site génère aussi `sitemap-index.xml`, `robots.txt`, un titre, une meta description et des balises Open Graph pour chaque page.

## Lancer le site sur votre ordinateur

Il faut [Node.js](https://nodejs.org) version 22 ou plus récente.

```bash
npm install        # une seule fois
npm run dev        # puis ouvrir http://localhost:4321
```

Les modifications apparaissent tout de suite dans le navigateur.

Autres commandes :

```bash
npm run check      # vérifie le code (erreurs de frappe, types)
npm run build      # fabrique la version en ligne dans le dossier dist/
```

Pour tester le conseil de l’IA en local, copiez `.env.example` en `.env` et renseignez `ANTHROPIC_API_KEY`. Sans clé, le bouton « Obtenir le conseil de l’IA » est simplement masqué ; le classement des villes fonctionne quand même.

## Où changer quoi

| Pour changer… | Fichier |
|---|---|
| **Nom de la société, numéro WhatsApp, e‑mail**, adresse du site, années d’expérience, mentions légales | `src/data/site.ts` (le seul endroit où ils figurent) |
| Partenaires (nom, descriptif, lien, logo) | `src/data/partners.ts` |
| Menu, pied de page et liens « À voir aussi » (titres et descriptions des services et outils) | `src/data/nav.ts` |
| Les villes : prix, loyers, notes, quartiers, hôpitaux, présentation | `src/data/cities.ts` |
| Les villes mises en avant sur l’accueil | `HOME_CITIES` dans `src/data/cities.ts` |
| Hypothèses du simulateur (taux, durée du prêt, coût des travaux…) | bas de `src/data/cities.ts` |
| Réalisations, ventes, témoignages, vidéos | `src/data/gallery.ts` |
| Photos du site (accueil, villes, pages) | `src/assets/photos/` (liste et sources dans `SOURCES.md`) |
| Opérations avant/après de la page Investissement | `PROJECTS` dans `src/data/gallery.ts` |
| Questions et réponses du questionnaire | `src/data/questionnaire.ts` |
| Calcul de compatibilité des villes et prompt de l’IA | `src/lib/recommend.ts` |
| Textes d’une page | `src/pages/<page>.astro` (ex. `src/pages/alyah.astro`) |
| En‑tête, pied de page, bouton WhatsApp flottant | `src/components/Header.astro`, `Footer.astro`, `WhatsAppFloat.astro` |
| Couleurs, polices, espacements | `src/styles/global.css` (variables en haut du fichier). Titres en Frank Ruhl Libre, texte en Figtree |
| Image de partage (WhatsApp, Facebook…) | `public/og.png` (1200 × 630 px) |
| Photo de chaque ville | champ `photo` de la ville dans `src/data/cities.ts` |
| Icône de l’onglet | `public/favicon.svg` |

### Nom et numéro définitifs

Dans `src/data/site.ts` :

1. remplacez `name`, `whatsapp` (chiffres seulement, avec l’indicatif : `9725…`), `email` et `url` ;
2. passez `provisional` à `false` : les étiquettes « coordonnées provisoires » disparaissent ;
3. remplissez `legal` (raison sociale, adresse, numéro d’enregistrement, licence d’agent immobilier, responsable de la publication) : ils s’affichent sur la page Mentions légales.

Les initiales du logo sont tirées du nom automatiquement.

### Villes

Les prix moyens (`avg`) viennent du Bureau central des statistiques (fin 2025). Les prix au m², les loyers et les notes de 0 à 3 sont des **estimations à faire valider** par l’équipe (un commentaire le rappelle en haut de `cities.ts`). Les notes pilotent le classement du questionnaire : changer une note change les villes recommandées.

Pour ajouter une ville, copiez un bloc dans `CITIES` et changez son `id` : la page `/villes/<id>` est créée automatiquement, et la ville apparaît dans le simulateur, le questionnaire et le pied de page.

### Photos

Les photos du site sont dans `src/assets/photos/`. Ce sont pour l’instant des **photos d’illustration libres de droits** (Unsplash, usage commercial autorisé), listées avec leur source dans `src/assets/photos/SOURCES.md`.

- Pour **remplacer** une photo, déposez la vôtre avec le même nom de fichier (ex. `netanya.jpg`). Format paysage, au moins 1600 px de large.
- Pour **ajouter** une photo, déposez‑la dans le dossier et utilisez son nom sans extension (ex. `photo: "netanya-front-de-mer"`).
- Le site les convertit automatiquement en formats légers (WebP/AVIF) et aux bonnes tailles pour chaque écran.
- Six villes (Ramat Gan, Petah Tikva, Modiin, Ra’anana, Beit Shemesh, Beer‑Sheva) ont une photo de leur région, faute de photo libre de la ville elle‑même : elles sont marquées `photoRegion: true` dans `cities.ts` et la fiche l’indique. À remplacer en priorité.

### Réalisations et témoignages

Les réalisations et témoignages de la maquette sont des **exemples** (`demo: true` dans `src/data/gallery.ts`). Ils sont **masqués du site public** : de faux avis présentés comme vrais tromperaient vos visiteurs, et c’est interdit. Tant qu’il n’y a aucun contenu réel :

- la page Réalisations affiche « Nos réalisations arrivent ici » et disparaît du menu ;
- la section « Ce que disent nos clients » ne s’affiche pas ;
- la page Investissement montre un avant/après avec des photos d’illustration, présentées comme telles.

Pour publier du **vrai** contenu :

1. Déposez les photos dans `src/assets/photos/` (ou les vidéos `.mp4` dans `public/realisations/`).
2. Dans `src/data/gallery.ts`, ajoutez l’élément (ou modifiez un exemple) avec :
   - `before: "netanya-avant"` et `after: "netanya-apres"` pour un avant/après ;
   - `photo: "ir-yamim-salon"` pour une vente (ou l’affiche d’une vidéo) ;
   - `videoUrl: "/realisations/famille-l.mp4"` pour un témoignage vidéo ;
   - pour un témoignage : le prénom et l’initiale du client, sa ville d’origine, son projet et son texte, **avec son accord**.
3. Retirez `demo: true`. L’élément apparaît aussitôt sur le site, et la page Réalisations revient dans le menu.

Pour revoir les exemples pendant le développement, mettez `showExamples: true` dans `src/data/site.ts` (ne jamais mettre en ligne ainsi).

## Conseil rédigé par l’IA

À la fin du questionnaire alyah, le bouton « Obtenir le conseil de l’IA » appelle `/api/conseil` (fichier `src/pages/api/conseil.ts`), qui interroge l’API Claude avec le même prompt que la maquette et affiche le texte au fur et à mesure.

- **Clé** : variable d’environnement `ANTHROPIC_API_KEY` (clé à créer sur [console.anthropic.com](https://console.anthropic.com)). Ne la mettez jamais dans le code.
- **Modèle** : `claude-opus-5`, avec un effort « low » (réponse courte et rapide). Si une demande est refusée par les filtres de sécurité, l’API la relance automatiquement sur un autre modèle.
- **Anti‑abus** : le prompt est construit sur le serveur à partir des réponses du questionnaire, vérifiées une par une. Personne ne peut envoyer un texte libre à l’IA. Chaque adresse IP est limitée à 4 demandes par 10 minutes et 12 par jour, avec un plafond de 300 demandes par jour. Seules les pages du site peuvent appeler la route. Ces réglages sont en haut de `conseil.ts`.
- Les compteurs sont gardés en mémoire par le serveur : c’est une protection de base, suffisante pour un site vitrine. Pour une limite stricte, ajoutez un compteur partagé (par exemple Upstash Redis) et fixez aussi un plafond de dépenses mensuel dans la console Anthropic.

## Mettre le site en ligne

Le projet se déploie tel quel sur Netlify ou sur Vercel : l’adaptateur est choisi automatiquement (Vercel quand le site est construit sur Vercel, Netlify sinon).

Dans les deux cas, commencez par envoyer le projet sur GitHub (ou GitLab / Bitbucket).

### Netlify

1. Sur [app.netlify.com](https://app.netlify.com), **Add new site › Import an existing project**, puis choisissez le dépôt.
2. Les réglages sont détectés : commande `npm run build`, dossier `dist`.
3. **Site configuration › Environment variables** : ajoutez `ANTHROPIC_API_KEY` et `SITE_URL` (ex. `https://www.votre-domaine.com`).
4. Déployez. Chaque nouveau commit met le site à jour automatiquement.

### Vercel

1. Sur [vercel.com/new](https://vercel.com/new), importez le dépôt. Le framework Astro est détecté.
2. **Settings › Environment Variables** : ajoutez `ANTHROPIC_API_KEY` et `SITE_URL`.
3. Déployez.

### Nom de domaine

1. Dans Netlify (**Domain management › Add a domain**) ou Vercel (**Settings › Domains**), ajoutez votre domaine, par exemple `www.votre-domaine.com`.
2. Chez le registraire du domaine (OVH, Gandi, GoDaddy…), créez les enregistrements DNS indiqués par Netlify ou Vercel (en général un `CNAME` pour `www` et un enregistrement `A` ou `ALIAS` pour le domaine nu).
3. Le certificat HTTPS est créé automatiquement, en quelques minutes à quelques heures.
4. Mettez la même adresse dans `url` de `src/data/site.ts` (ou dans la variable `SITE_URL`) : elle sert au sitemap, aux balises Open Graph et aux adresses canoniques.
5. Déclarez le site dans [Google Search Console](https://search.google.com/search-console) et envoyez‑y l’adresse `https://www.votre-domaine.com/sitemap-index.xml`.

## Organisation du projet

```
src/
  data/         site.ts, cities.ts, gallery.ts, questionnaire.ts : tout le contenu modifiable
  lib/          calculs (recommend.ts), mise en forme des nombres, illustrations dessinées
  components/   Header, Footer, WhatsAppFloat, Simulator, Questionnaire, Gallery,
                GalleryCard, CityCard, BeforeAfter, Steps, Crumbs…
  layouts/      Base.astro : balises <head>, SEO, en‑tête et pied de page communs
  pages/        une page = une adresse ; pages/api/conseil.ts = route de l’IA
  styles/       global.css
src/assets/photos/  photos du site (optimisées automatiquement)
public/         fichiers servis tels quels : og.png, favicon.svg, realisations/ (vidéos)
```
