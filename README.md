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
| `/simulateur` | Simulateur étape par étape (acheter, louer, investir, rénover) avec résultat détaillé : frais, taxe d’achat, prêt, rendement, plus‑value. Accepte `?mode=achat&ville=haifa&surface=100` |
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

Pour tester l’analyse de l’IA en local, copiez `.env.example` en `.env` et renseignez `GEMINI_API_KEY` (gratuit) ou `ANTHROPIC_API_KEY`. Sans clé, le site affiche son propre classement des villes.

## Où changer quoi

| Pour changer… | Fichier |
|---|---|
| **Nom de la société, numéro WhatsApp, e‑mail**, adresse du site, années d’expérience, mentions légales | `src/data/site.ts` (le seul endroit où ils figurent) |
| Partenaires (nom, descriptif, lien, logo) | `src/data/partners.ts` |
| Menu, pied de page et liens « À voir aussi » (titres et descriptions des services et outils) | `src/data/nav.ts` |
| Les villes : prix, loyers, notes, quartiers, hôpitaux, présentation | `src/data/cities.ts` |
| Les villes mises en avant sur l’accueil | `HOME_CITIES` dans `src/data/cities.ts` |
| Hypothèses du simulateur : barèmes de la taxe d’achat, taux du prêt, part financée par les banques, frais d’avocat et d’agence, charges locatives, coût des travaux | `src/data/hypotheses.ts` (chaque chiffre est commenté) |
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

## Analyse des villes par l’IA

À la fin du questionnaire alyah, la page appelle automatiquement `/api/conseil` (fichier `src/pages/api/conseil.ts`). Le serveur construit un prompt avec **toutes les réponses cochées** et les données de **toutes les villes** (prix estimés, coût du logement recherché, notes, hôpitaux, quartiers, score calculé par le site), puis demande à l’IA une réponse en JSON : une synthèse, les 5 villes les plus adaptées avec un **pourcentage de compatibilité**, les points forts, les points de vigilance, les quartiers conseillés et l’adéquation du budget, plus des conseils pratiques. La réponse est vérifiée (villes connues, pourcentages entre 0 et 100) avant d’être affichée. Le prompt et la vérification sont dans `src/lib/analyse.ts`.

**Simulateur** : sous le résultat, la même route rédige une analyse du projet (synthèse, points forts, points de vigilance, conseils). Les chiffres sont recalculés sur le serveur par `src/lib/simulate.ts` et donnés à l’IA, qui les commente sans en calculer. Le prompt est dans `src/lib/sim-analyse.ts`. L’analyse se lance au premier résultat ; après un réglage (surface, apport), un bouton la relance, pour ménager le quota. Sans clé d’IA, le bloc n’apparaît pas.

Si l’IA n’est pas configurée ou échoue, le questionnaire affiche son propre classement (`src/lib/recommend.ts`). L’analyse est gardée pendant la visite : revenir sur la page ne relance pas de demande.

- **Gemini (utilisé en priorité)** : créez une clé sur [aistudio.google.com/apikey](https://aistudio.google.com/apikey) et mettez‑la dans `GEMINI_API_KEY`. Le site passe par l’Interactions API de Google. Les modèles sont essayés dans cet ordre : `gemini-3.1-flash-lite`, `gemini-3-flash-preview`, `gemini-3.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.5-flash`. Si l’un est saturé, introuvable ou ne répond pas, on passe au suivant. `GEMINI_MODEL` permet d’en forcer un en premier. Les demandes ne sont pas conservées chez Google (`store: false`).
  - L’offre gratuite convient aux tests. Pour le site en ligne, les conditions de Google imposent l’offre payante dès que le service est proposé à des utilisateurs de l’Union européenne, de Suisse ou du Royaume‑Uni : activez la facturation (« Set up billing » dans AI Studio, paiement d’avance à partir de 5 $). Sur l’offre payante, Google n’utilise pas les demandes pour améliorer ses modèles.
  - Si les quotas sont dépassés ou le crédit épuisé, le questionnaire affiche son propre classement et le simulateur masque le bloc d’analyse.
- **Claude (payant)** : utilisé si `GEMINI_API_KEY` est vide et `ANTHROPIC_API_KEY` renseignée (clé sur [console.anthropic.com](https://console.anthropic.com)). Modèle `claude-opus-5`, effort « low », sortie JSON contrainte par le schéma.
- Ne mettez jamais une clé dans le code.
- **Anti‑abus** : le prompt est construit sur le serveur à partir des réponses du questionnaire, vérifiées une par une. Personne ne peut envoyer un texte libre à l’IA. Chaque adresse IP est limitée à 4 demandes par 10 minutes et 12 par jour, avec un plafond de 300 demandes par jour. Seules les pages du site peuvent appeler la route. Ces réglages sont en haut de `conseil.ts`.
- Les compteurs sont gardés en mémoire par le serveur : c’est une protection de base, suffisante pour un site vitrine. Pour une limite stricte, ajoutez un compteur partagé (par exemple Upstash Redis) et, avec Claude, fixez aussi un plafond de dépenses mensuel dans la console Anthropic.

## Demandes (leads)

À la dernière étape du questionnaire et du simulateur, la personne indique son nom, son e‑mail et son téléphone. La demande (coordonnées et réponses) est enregistrée, même si elle n’envoie pas le message WhatsApp.

L’agence les retrouve sur la page **`/admin`** (adresse non affichée sur le site, exclue de Google), protégée par le mot de passe `ADMIN_PASSWORD` (dans `.env` en local, ou dans les variables d’environnement de Netlify / Vercel). Choisissez un mot de passe long et ne le partagez qu’avec l’équipe.

Sur cette page :

- chaque demande affiche le nom, l’outil utilisé (questionnaire ou simulateur, et le projet), la date, le message éventuel et toutes les réponses ;
- boutons **WhatsApp** (message prérempli avec le prénom), **appeler** et **e‑mail** ;
- suivi : **À rappeler** / **Traité**, avec les compteurs ;
- filtre par outil et **recherche** (nom, ville, téléphone…) ;
- **Exporter (Excel)** : fichier CSV des demandes affichées, qui s’ouvre dans Excel ;
- **Supprimer** une demande, par exemple si la personne demande l’effacement de ses données.

Le formulaire indique aux visiteurs que leurs coordonnées servent uniquement à les recontacter (lien vers les mentions légales).

- **En local** : les demandes sont dans le fichier `.data/leads.json` (non versionné).
- **Sur Netlify** : elles sont gardées dans Netlify Blobs, sans réglage supplémentaire.
- **Sur Vercel** : créez un magasin Blob (Storage › Blob) et renseignez `BLOB_READ_WRITE_TOKEN`. Les fichiers sont privés.

## Mettre le site en ligne

Le projet se déploie tel quel sur Netlify ou sur Vercel : l’adaptateur est choisi automatiquement (Vercel quand le site est construit sur Vercel, Netlify sinon).

Dans les deux cas, commencez par envoyer le projet sur GitHub (ou GitLab / Bitbucket).

### Netlify

1. Sur [app.netlify.com](https://app.netlify.com), **Add new site › Import an existing project**, puis choisissez le dépôt.
2. Les réglages sont détectés : commande `npm run build`, dossier `dist`.
3. **Site configuration › Environment variables** : ajoutez `GEMINI_API_KEY` (ou `ANTHROPIC_API_KEY`), `SITE_URL` (ex. `https://www.votre-domaine.com`) et `ADMIN_PASSWORD` (page `/admin`).
4. Déployez. Chaque nouveau commit met le site à jour automatiquement.

### Vercel

1. Sur [vercel.com/new](https://vercel.com/new), importez le dépôt. Le framework Astro est détecté.
2. **Settings › Environment Variables** : ajoutez `GEMINI_API_KEY` (ou `ANTHROPIC_API_KEY`), `SITE_URL`, `ADMIN_PASSWORD` et `BLOB_READ_WRITE_TOKEN` (magasin Blob, pour enregistrer les demandes).
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
  pages/        une page = une adresse ; pages/api/conseil.ts = route de l’IA ; pages/api/lead.ts = demandes ; /admin = consultation
  styles/       global.css
src/assets/photos/  photos du site (optimisées automatiquement)
public/         fichiers servis tels quels : og.png, favicon.svg, realisations/ (vidéos)
```
