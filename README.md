# Prénoms & Longévité 3D — Observatoire Démographique

Application web interactive de visualisation démographique et sociologique en **3D (Three.js)** et **2D (Courbes de survie de Gompertz)**. Elle permet d'explorer la popularité des prénoms en France de **1920 à 2024**, de comparer l'espérance de vie et les taux de survie par cohorte de naissance, et de visualiser l'impact des marqueurs socioculturels sur la longévité.

---

## 1. Bases Scientifiques et Sources du Projet

Ce projet s'inspire directement des travaux de sociologie quantitative et de démographie menés par **Baptiste Coulmont** (professeur de sociologie à l'Université Paris 8), notamment son étude publiée en novembre 2024 :
> **« Un prénom pour la vie (et aussi pour la mort) »** — [coulmont.com](https://coulmont.com)
> Script R de référence : [`2024_deces-prenoms_parquet.R`](https://raw.githubusercontent.com/coulmont/varia/refs/heads/master/2024_deces-prenoms_parquet.R)

### Les deux sources Open Data de l'INSEE
L'analyse repose sur le croisement de deux grandes bases de données publiques produites par l'**INSEE** (disponibles sur `insee.fr` et `data.gouv.fr`) :
1. **Le Fichier des prénoms de l'INSEE** : recensement exhaustif des naissances par prénom, sexe et année de naissance en France depuis 1900.
2. **Le Fichier des personnes décédées de l'INSEE** : registre individuel de plus de 26 millions de décès enregistrés en France depuis 1970 (comprenant le prénom, le sexe, l'année de naissance et l'année de décès).

### Ce que révèle l'étude sociologique
Dans le script original en R, l'utilisation combinée d'**Apache Parquet** (`{arrow}`) et du moteur analytique **DuckDB** (`{duckdb}`) permet de calculer, pour chaque génération (ex. 1950, 1970, 1990) et chaque prénom, la proportion de personnes toujours en vie aujourd'hui.

* **Le prénom comme marqueur social** : Le prénom ne détermine évidemment pas biologiquement la durée de vie, mais il agit comme un **indicateur statistique du milieu social d'origine** (niveau de diplôme des parents, catégorie socioprofessionnelle, exposition aux risques professionnels, accès aux soins).
* **Gradient de longévité (*Hazard Ratio*)** : À année de naissance et sexe identiques, les prénoms associés aux catégories diplômées ou bourgeoises traditionnelles présentent une mortalité cumulée sensiblement plus faible que les prénoms très populaires ou marqués par des effets de mode rapides.

---

## 2. Conception « Full IA » & Architecture Technique

Cette application a été intégralement conçue, architecturée, codée et vérifiée de manière autonome par **Intelligence Artificielle (Full IA)** à partir d'une simple expression de besoin en langage naturel et du lien vers le script R de Baptiste Coulmont.

### Caractéristiques de l'approche Full IA & 100% Procédurale :
* **Zéro ressource externe statique (Zero-404)** : Aucun modèle 3D externe (`.glb`/`.gltf`) ni texture image externe (`.png`/`.hdr`) n'est téléchargé. Toute la géométrie 3D (socles en basalte, bagues en laiton biseautées, fûts cannelés, cristaux d'espérance de vie, plaques gravées et étiquettes suspendues) ainsi que les textures et ombres de contact sont **générées procéduralement en TypeScript** via l'API HTML5 Canvas 2D et Three.js.
* **Moteur 3D adaptatif** : Détection automatique du rendu matériel (GPU) ou logiciel (WebGL CPU / SwiftShader) avec éclairage PBR studio (`ACESFilmicToneMapping`, `RoomEnvironment` PMREM), navigation orbitale et panoramique libre (`OrbitControls` avec `screenSpacePanning`).
* **Autonomie de l'application (100% Client-Side)** : Les tables de mortalité par cohorte (1920–2024), les palmarès historiques par décennie et les modèles actuariels de Gompertz-Makeham sont embarqués côté client. L'application fonctionne de manière autonome dans le navigateur, sans base de données payante ni serveur backend obligatoire en production.

### Pile technologique (Stack)
* **Frontend** : React 19, TypeScript, Tailwind CSS v4
* **Rendu 3D** : Three.js (`three`, `@types/three`)
* **Icônes & UI** : Lucide React, design inspiré des tableaux de bord analytiques R Shiny
* **Outil de build** : Vite

---

## 3. Installation et Configuration en Local

### Prérequis
* **Node.js** (version 18, 20 ou 22 LTS recommandée)
* **npm** (ou `pnpm` / `bun`)

### Étapes d'installation

1. **Cloner le dépôt** :
   ```bash
   git clone <url-de-votre-depot-git>
   cd prenoms-longevite-3d
   ```

2. **Installer les dépendances** :
   ```bash
   npm install
   ```

3. **Variables d'environnement (Optionnel)** :
   L'application est 100% fonctionnelle sans clé API externe. Si vous souhaitez étendre le projet avec des fonctionnalités supplémentaires, vous pouvez copier le fichier d'exemple :
   ```bash
   cp .env.example .env
   ```

4. **Lancer le serveur de développement** :
   ```bash
   npm run dev
   ```
   Ouvrez ensuite votre navigateur sur [`http://localhost:3000`](http://localhost:3000).

5. **Vérifier le typage et compiler pour la production** :
   ```bash
   npm run lint
   npm run build
   ```
   La commande `npm run build` génère un dossier statique optimisé `dist/` prêt à être hébergé gratuitement.

---

## 4. Hébergement 100% Gratuit sur Cloudflare (Free Tier)

Étant donné que l'application compile vers un bundle statique (`dist/`) avec calcul démographique et rendu WebGL exécutés directement dans le navigateur du visiteur, elle s'héberge **à coût zéro (0 €/mois)** sur le **Free Tier de Cloudflare Pages** (ou Cloudflare Workers Static Assets).

### Pourquoi le Free Tier de Cloudflare est idéal ici :
* **Bande passante illimitée** (*Unlimited bandwidth* sur les fichiers statiques).
* **Nombre de requêtes statiques illimité**.
* **Réseau CDN mondial (Edge)** avec certificat SSL/HTTPS automatique et support HTTP/3.
* **500 builds par mois gratuits** avec déploiement continu (CI/CD) depuis GitHub ou GitLab.

---

### Méthode A : Déploiement automatique via GitHub & Cloudflare Pages (Recommandé)

1. Poussez le code source de ce projet sur un dépôt **GitHub** ou **GitLab**.
2. Connectez-vous à votre tableau de bord [Cloudflare Dashboard](https://dash.cloudflare.com/) (compte gratuit).
3. Dans le menu latéral, allez dans **Compute (Workers & Pages)** > **Create** > onglet **Pages** > **Connect to Git**.
4. Sélectionnez votre dépôt Git et configurez les paramètres de build suivants :
   * **Framework preset** : `Vite`
   * **Build command** : `npm run build`
   * **Build output directory** : `dist`
   * **Variable d'environnement (optionnel)** : `NODE_VERSION` = `20`
5. Cliquez sur **Save and Deploy**.
6. En moins d'une minute, votre application 3D est en ligne sur une URL `https://<votre-projet>.pages.dev` (ou sur votre propre nom de domaine personnalisé, également gratuit sur Cloudflare).

---

### Méthode B : Déploiement direct en ligne de commande (Wrangler CLI)

Vous pouvez également déployer directement depuis votre terminal sans passer par l'interface Git :

1. **Compiler le projet localement** :
   ```bash
   npm run build
   ```

2. **Déployer le dossier `dist` avec Wrangler** :
   ```bash
   npx wrangler pages deploy dist --project-name=prenoms-longevite-3d
   ```
   *(Lors de la première exécution, Wrangler ouvrira votre navigateur pour autoriser votre compte Cloudflare gratuit, puis publiera instantanément le contenu du dossier `dist`).*

---

## 5. Guide d'Utilisation Rapide

* **Navigation 3D libre** :
  * **Clic gauche + glisser** : Rotation orbitale autour des piliers 3D.
  * **Clic droit + glisser** (ou deux doigts) : Déplacement latéral et vertical libre dans le plan de l'écran.
  * **Molette** : Zoom avant / arrière.
  * **Clic sur un pilier** : Sélectionne le prénom et affiche son bilan actuariel détaillé.
* **Changement d'année de naissance (1920–2024)** :
  * Accessible à tout moment depuis la **barre supérieure** (boutons `<` `>`, saisie directe ou menu par décennie), dans la fiche **Détails**, dans le **Palmarès des prénoms** ou dans les **Courbes de survie**.
* **Comparateur & Palmarès** :
  * Ajoutez n'importe quel prénom via l'onglet **Comparateur** du dock inférieur ou cliquez sur **Top Prénoms** pour charger en un clic les prénoms les plus donnés de votre génération.
* **Mode Zen** :
  * Cliquez sur le bouton **Mode Zen / Plein Écran 3D** au-dessus du dock inférieur pour masquer l'interface et admirer la scène 3D en plein écran.

---

## Licence

Projet distribué sous licence **Apache-2.0**. Données démographiques de référence issues de l'Open Data **INSEE** et des recherches sociologiques de **Baptiste Coulmont**.
