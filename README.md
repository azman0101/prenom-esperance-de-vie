# Prénoms & Espérance de Vie — Observatoire Démographique 3D & 2D

Application web interactive de visualisation démographique et sociologique en **3D (Three.js)** et **2D (Courbes de survie de Gompertz)**. Elle permet d'explorer la popularité des prénoms en France de **1920 à 2024**, de comparer l'espérance de vie et les taux de survie par cohorte de naissance, et de visualiser l'impact des marqueurs socioculturels sur la longévité.

---

## 1. Bases Scientifiques et Sources du Projet

Ce projet s'inspire des travaux de sociologie quantitative et de démographie menés par **Baptiste Coulmont** (professeur de sociologie à l'Université Paris 8), notamment son billet publié en novembre 2024 :
> **« Un prénom pour la vie (et aussi pour la mort) »** — [coulmont.com](https://coulmont.com)
> Script R de référence : [`2024_deces-prenoms_parquet.R`](https://raw.githubusercontent.com/coulmont/varia/refs/heads/master/2024_deces-prenoms_parquet.R)

### Les deux sources Open Data de l'INSEE utilisées dans l'étude originale
L'analyse de référence croise deux bases de données publiques produites par l'**INSEE** (disponibles sur `insee.fr` et `data.gouv.fr`) :
1. **Le Fichier des prénoms de l'INSEE** : recensement des naissances par prénom, sexe et année de naissance en France depuis 1900.
2. **Le Fichier des personnes décédées de l'INSEE** : registre individuel des décès enregistrés en France depuis 1970 (comprenant le prénom, le sexe, l'année de naissance et l'année de décès).

### Du script R (`arrow` / `duckdb`) au modèle actuariel embarqué
Dans le script R original de Baptiste Coulmont, les fichiers Parquet de l'INSEE sont interrogés via **Apache Arrow** (`{arrow}`) et **DuckDB** (`{duckdb}`) pour calculer la proportion de personnes nées une année donnée (ex. 1950, 1970) toujours en vie en 2024.

Pour permettre une exécution instantanée dans le navigateur sans serveur ni téléchargement de plusieurs gigaoctets de fichiers Parquet :
* L'application embarque dans `src/data/demographics.ts` les **tables de survie et d'espérance de vie par cohorte (1920–2024)**, une base de prénoms de référence calibrée avec leurs **ratios de risque (*Hazard Ratios*)**, leur décennie pic (`peakDecade`) et leurs profils sociodémographiques, ainsi qu'un modèle d'estimation déterministe pour tout prénom personnalisé saisi par l'utilisateur.
* **Le prénom comme marqueur social** : Le prénom n'influence évidemment pas biologiquement la longévité, mais agit comme un **indicateur statistique du milieu social d'origine** (niveau de diplôme des parents, catégorie socioprofessionnelle, exposition aux risques professionnels, accès aux soins).

---

## 2. Conception « Full IA » & Architecture Technique

Cette application a été intégralement conçue, architecturée, codée et optimisée par **Intelligence Artificielle (Full IA)** à partir d'une expression de besoin en langage naturel et du script R de Baptiste Coulmont.

### Caractéristiques techniques :
* **Rendu 3D 100% procédural (Zéro ressource externe `.glb` / `.png`)** : Toute la géométrie 3D (`src/components/ThreeDemographicScene.tsx` : socles en basalte, bagues en laiton, fûts proportionnels à l'espérance de vie, cristaux sommitaux, plaques et étiquettes Canvas 2D) est générée procéduralement en TypeScript avec Three.js.
* **Optimisation thermique & GPU (MacBook / High-DPI)** :
  * Chargement différé (`React.lazy` & `Suspense`) du moteur 3D et des modales après le premier affichage UI.
  * Boucle de rendu plafonnée à **30 FPS** lors des mouvements et **mise en veille automatique à 0 FPS** dès que la scène est immobile, que l'onglet est en arrière-plan ou qu'une modale est ouverte.
  * `devicePixelRatio` plafonné à `1.25` sur les écrans Retina pour éviter la surchauffe GPU.
* **Courbes de survie centrées sur l'horizon de vie restant** (`src/components/SurvivalCurveModal.tsx`) : Par défaut, l'axe des âges débute à `Âge actuel - 5 ans` jusqu'à `105 ans` (avec bascule possible vers `0 – 105 ans`) afin de mettre en évidence les écarts de survie d'aujourd'hui jusqu'à la fin de vie.
* **Indicateurs de tendance annuelle** (`src/components/ControlDock.tsx`) : Calcul déterministe de la variation de popularité de chaque prénom entre l'année sélectionnée (`N`) et l'année précédente (`N-1`).

### Pile technologique (Stack)
* **Frontend** : React 19, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`)
* **Rendu 3D** : Three.js (`three` v0.186)
* **Icônes** : `lucide-react`
* **Outil de build** : Vite 8 (`vite` v8.3, `esbuild` v0.28)

---

## 3. Installation et Configuration en Local

### Prérequis
* **Node.js** : version **20 LTS** ou **22 LTS** recommandée (requis par Vite 8)
* **npm** (inclus avec Node.js)

### Étapes d'installation

1. **Cloner le dépôt** :
   ```bash
   # Via SSH :
   git clone git@github.com:azman0101/prenom-esperance-de-vie.git
   # Ou via HTTPS :
   # git clone https://github.com/azman0101/prenom-esperance-de-vie.git

   cd prenom-esperance-de-vie
   ```

2. **Installer les dépendances** :
   ```bash
   npm install
   ```
   > **Note sur la résolution des dépendances (`esbuild` / `vite`)** : Le fichier `package.json` aligne `esbuild` sur `^0.28.0` pour respecter la dépendance optionnelle de `vite@^8.3.0`. Si vous utilisez une version ancienne de npm ou rencontrez un conflit de cache local, exécutez `npm install --legacy-peer-deps`.

3. **Lancer le serveur de développement** :
   ```bash
   npm run dev
   ```
   Ouvrez ensuite votre navigateur sur [`http://localhost:3000`](http://localhost:3000) (aucun fichier `.env` ni clé API n'est nécessaire, l'application fonctionne intégralement côté client).

4. **Vérifier le typage TypeScript et compiler pour la production** :
   ```bash
   npm run lint
   npm run build
   ```
   La commande `npm run build` génère le dossier statique `dist/` prêt à être hébergé gratuitement.

---

## 4. Hébergement 100% Gratuit sur Cloudflare (Free Tier)

L'application étant compilée en fichiers purement statiques (`dist/`), elle s'héberge **à 0 €/mois** sur le **Free Tier de Cloudflare Pages** :
* **Bande passante illimitée** sur les actifs statiques (`dist/`).
* **SSL/HTTPS automatique** et CDN mondial HTTP/3.
* **500 builds par mois gratuits** en intégration continue GitHub.

### Méthode A : Déploiement continu via GitHub & Cloudflare Pages

1. Poussez votre dépôt sur GitHub (`git@github.com:azman0101/prenom-esperance-de-vie.git`).
2. Connectez-vous au [Cloudflare Dashboard](https://dash.cloudflare.com/).
3. Allez dans **Compute (Workers & Pages)** > **Create** > onglet **Pages** > **Import an existing Git repository**.
4. Sélectionnez le dépôt `prenom-esperance-de-vie` et configurez le build :
   * **Project name** : `prenom-esperance-de-vie`
   * **Framework preset** : `Vite`
   * **Build command** : `npm run build`
   * **Build output directory** : `dist`
   * **Environment variable** : `NODE_VERSION` = `22` (ou `20`)
5. Cliquez sur **Save and Deploy**. Votre application sera accessible sur `https://prenom-esperance-de-vie.pages.dev`.

### Méthode B : Déploiement direct en ligne de commande (Wrangler CLI)

Vous pouvez déployer directement le dossier `dist/` depuis votre terminal :

1. **Compiler le projet localement** :
   ```bash
   npm run build
   ```

2. **Déployer le dossier `dist` avec Wrangler** :
   ```bash
   npx wrangler pages deploy dist --project-name=prenom-esperance-de-vie
   ```
   *(Lors du premier lancement, Wrangler ouvrira votre navigateur pour authentifier votre compte Cloudflare, puis publiera le contenu du dossier `dist`).*

---

## 5. Guide d'Utilisation Rapide

* **Navigation 3D libre** :
  * **Clic gauche + glisser** : Rotation orbitale autour des piliers 3D.
  * **Clic droit + glisser** (ou deux doigts) : Déplacement latéral et vertical libre.
  * **Molette** : Zoom avant / arrière.
  * **Clic sur un pilier** : Sélectionne le prénom et affiche son détail dans le dock inférieur.
* **Changement d'année de naissance (1920–2024)** :
  * Modifiable depuis l'en-tête supérieur (boutons `-1` / `+1`, saisie directe, ou menu déroulant par décennie), depuis l'onglet **Détails**, l'onglet **Votre Prénom & Âge**, le **Palmarès** ou la fenêtre **Courbes de survie**.
* **Comparateur & Indicateur de tendance** :
  * Chaque prénom affiche une icône de tendance (hausse en vert / baisse en rose / stable) comparant sa popularité lors de l'année sélectionnée par rapport à l'année précédente (`N-1`).
  * Vous pouvez ajouter ou supprimer librement n'importe quel prénom (y compris le prénom initial) dans le comparateur.
* **Courbes de survie (2D)** :
  * Centrées par défaut sur l'horizon `Aujourd'hui - 5 ans → 105 ans` pour mieux visualiser les écarts de fin de vie, avec survol interactif âge par âge et bouton de bascule vers la vue complète `Depuis 0 an`.

---

## Licence

Projet distribué sous licence **Apache-2.0**. Inspiré des recherches sociologiques de **Baptiste Coulmont** et des données publiques **INSEE**.

