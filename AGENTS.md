# AGENTS.md

Guide pour les agents IA et les contributeurs. Sources, hypothèses, limites, secrets de déploiement : voir `README.md`.

## Aperçu

SPA React 19 / TypeScript / Vite 8 / Tailwind v4 (`@tailwindcss/vite`, pas de `tailwind.config`) / Three.js / `lucide-react`. Elle présente les **prénoms officiels de l'INSEE** (de 1920 à la dernière année publiée), la **survie estimée** à partir des décès enregistrés, et une **projection de longévité** qui est la référence nationale INSEE par âge et par sexe.

- Pas de backend ni de clé API : le navigateur ne charge que des **agrégats** (`public/data/`).
- Le prénom est un marqueur statistique, **jamais une cause biologique**. Aucun profil social, personnage célèbre ni espérance de vie inventés, aucune statistique de secours dérivée d'un hash (le hash ne sert qu'aux couleurs).
- La projection **ne dépend pas du prénom** : identique pour tous les prénoms de même sexe et de même cohorte. Seules les observations les distinguent. Ne pas réintroduire d'effet par prénom sans gain prédictif démontré hors échantillon (l'ancien modèle ridge a été retiré pour cette raison ; voir l'historique Git).
- Une donnée absente n'est pas zéro : « non diffusé », « indisponible avant … », « effectif insuffisant ».
- Langue de l'interface, des libellés, des commentaires métier et des commits : **français** ; code et identifiants en anglais.

## Commandes

| Action | Commande |
| --- | --- |
| Installer | `bun install --frozen-lockfile`, puis `pip install -r scripts/data/requirements.txt` (Python 3.12, de préférence dans `.venv`) |
| Générer les données | `npm run data:sync` (long : voir « Données ») ; `python3 scripts/data/sync.py --offline` rejoue depuis `.cache/data` |
| Empreinte des sources | `python3 scripts/data/sync.py --stamp` (secondes, sans téléchargement) |
| Valider un snapshot | `npm run data:validate` |
| Dev | `npm run dev` → http://localhost:3000 |
| Types | `npm run lint` (= `tsc --noEmit`) |
| Tests | `npm run test:data` (Python, `unittest`), `npm test` (contrats frontend) |
| Build | `npm run build` — `prebuild` échoue sans snapshot dans `public/data/` |
| Navigateur | `npm run test:browser` (Chromium/Chrome ; `CHROME_BIN` si besoin) |

Avant tout commit : `npm run test:data && npm test && npm run lint`, plus `npm run build` si l'on touche à Vite, Tailwind ou aux imports dynamiques. Pour tout changement visuel, vérifier dans un navigateur, 3D comprise (`tsc` ne valide pas le rendu WebGL). Node 22, Bun 1.4.4+. Il n'y a ni ESLint ni Prettier.

Sans accès aux sources INSEE, un snapshot synthétique suffit pour développer le frontend : `tests/test_pipeline.py` (`create_cache` puis `build`) en construit un.

## Structure

```
src/
  main.tsx, App.tsx          point d'entrée ; état global, chargements annulables, sections « scrollytelling »
  config.ts                  paramètres de l'application (voir ci-dessous), sans dépendance interne
  data/demographics.ts       types des contrats, calculs frontend (projection, survie), lecture des données
  components/
    ShinyHeader.tsx          dock de navigation (exporte ScrollySectionId)
    YearInput.tsx            champ d'année à saisie libre, partagé
    ControlDock.tsx          ControlDock (sur la 3D), BentoComparatorSection, StatsCard, YearControl
    ThreeDemographicScene.tsx scène Three.js procédurale
    SurvivalCurveModal.tsx   courbes de survie (SVG)
    CohortTopNamesModal.tsx  palmarès de l'année exacte + presets de générations
    MethodologyModal.tsx     sources, hypothèses, limites (lit le manifeste)
scripts/data/                import Python/DuckDB : sync.py (acquisition, agrégation, validation), lifetable.py
scripts/                     check-data.mjs (prebuild), test-demographics.mjs, smoke-browser.mjs
tests/test_pipeline.py       tests Python du pipeline (hors réseau)
.github/workflows/refresh-data.yml   vérification, snapshot (cache), publication Cloudflare Pages
public/data/  .cache/        générés, ignorés par Git
```

Les composants `*Modal` sont rendus en sections inline ; leur nom est historique. L'alias `@` pointe sur la **racine du dépôt** (`@/src/...`).

## Données

- `scripts/data/sync.py` **découvre** les publications courantes depuis les catalogues (aucun millésime dans une URL), télécharge, filtre (naissance en France, oppositions, doublons), traite les dates incomplètes, agrège et écrit `public/data/` : `manifest.json`, `top.json`, `cohorts/<année>.json`, `quality-report.json`. Si une source change de structure, l'import **échoue** plutôt que d'inventer. La sortie est écrite dans `public/data.staging/` puis permutée ; un échec ne remplace jamais le dernier snapshot valide.
- Les enregistrements individuels de décès ne sont **jamais** écrits, servis ni déployés. Ne pas committer `public/data/` ni `.cache/`.
- `version` du manifeste = hash des sources et du code de génération. Le frontend vérifie que manifeste, palmarès et cohorte ont la même version, et qu'une cohorte correspond à l'année affichée.
- Conserver les graphies officielles et leur rang ; le regroupement des graphies sert uniquement au rapprochement des décès, avec un dénominateur distinct et explicite (`observation.births`, `variants`).
- Les premiers fichiers de décès sont lacunaires : `EARLY_COVERAGE_GAP_YEARS` années après le début de couverture portent `earlyCoverageWarning`.

## Pas de valeurs en dur

Aucune année, borne ou seuil métier en littéral dans le code. Sources uniques :

- **Années affichables** : `manifest.birthYears` (première et dernière cohorte du snapshot). Les composants reçoivent `years`/`manifest` ; `clampBirthYear(year, years)` borne. Jamais dérivées des tables de mortalité ni de l'année courante.
- **Début de couverture des décès** : `manifest.deathsCoverageStart` / `incompleteCoverageThrough` (lus dans les métadonnées de la source), exposés par `NameStats.coverage`. Seuil de naissances : `manifest.minObservationBirths`.
- **Côté Python**, constantes nommées en tête de `sync.py` (`FIRST_BIRTH_YEAR`, `MIN_OBSERVATION_BIRTHS`, `EARLY_COVERAGE_GAP_YEARS`, `MAX_REFERENCE_ERROR`, `MAX_COHORT_BYTES`) ; `--first-year` surcharge la première cohorte.
- **`src/config.ts`** : `REFERENCE_YEAR` (`new Date().getFullYear()`, pour l'âge et les libellés), `DEFAULT_BIRTH_YEAR`, `DEFAULT_COMPARED_NAMES`, `GENERATION_PRESETS`, `SCENE_RENDER`, `SCENE_MOUNT_DELAY_MS`, `NAME_COLORS`. Utiliser `ageFromBirthYear()` plutôt que `new Date()` ou `2026 - année`.
- Les tests tirent leurs années du snapshot ou de la config (`smoke-browser.mjs` lit `manifest.json`, `top.json` et `src/config.ts`) ; ne pas y recoder d'année ou de prénom.
- Classes Tailwind conditionnelles : chaînes **complètes** stockées dans la config (ex. `titleClass`), jamais de concaténation (`text-${c}-400`), sinon Tailwind ne les détecte pas.

## Architecture frontend

- `App.tsx` possède l'état (`namesList`, `userPrimaryName`, `birthYear`, `gender`, `selectedIndex`, `viewMode`, `isAutoRotate`, …), charge manifeste + palmarès puis la cohorte de `birthYear` (`readData`, `AbortController`), et calcule `computedStatsList` par `useMemo`. Une cohorte n'est jamais affichée avec les libellés d'une autre année (la liste reste vide pendant un chargement).
- Invariant : `userPrimaryName === namesList[0]`. Passer par les handlers d'`App.tsx` (`handleUserPrimaryNameChange`, `handleAddComparisonName`, `handleRemoveComparisonName`, `handleApplyPreset`).
- Le sexe choisi ne s'applique qu'au premier prénom ; les autres prennent le sexe le plus fréquent de la cohorte.
- Les erreurs de chargement s'affichent avec « Réessayer » ; ne jamais retomber sur des données simulées.
- Navigation : `scrollIntoView` sur `SECTION_DOM_IDS` ; un `IntersectionObserver` synchronise `activeSection` et met la 3D en pause hors viewport. Ajouter une section = étendre `ScrollySectionId`, `SECTION_DOM_IDS` et `App.tsx`.
- Champs d'année : toujours `YearInput` (saisie libre, bornage à la validation). Un champ qui ramène chaque frappe dans les bornes rend la saisie manuelle impossible.

## Rendu 3D — règles de performance

`ThreeDemographicScene.tsx` limite la charge GPU/thermique. Ne pas régresser :

1. **100 % procédural** : aucune ressource externe (`.glb`, `.png`) ; étiquettes dessinées sur canvas 2D → `CanvasTexture`.
2. **Chargement différé** : scène et sections lourdes en `React.lazy` + `Suspense` ; scène montée après `is3DReady`.
3. **Boucle de rendu** plafonnée (`SCENE_RENDER.fpsLimit`), à 0 FPS quand la scène est immobile, `document.hidden` ou `isPaused`. Tout état animé doit réveiller la boucle (`isLoopRunning` / `tick`).
4. **`devicePixelRatio` plafonné** (`SCENE_RENDER.maxPixelRatio`, 1 en rendu logiciel).
5. **Props lues via `propsRef`** dans la boucle ; le `useEffect` principal ne dépend pas des props changeantes.
6. **Nettoyage** : disposer renderer, controls, pmremGenerator, géométries, matériaux **et textures**.

## Conventions

- Composants fonctionnels, exports **nommés** (`App` seul export par défaut), props typées par `interface XProps` locale, types métier dans `src/data/demographics.ts`.
- Tailwind en ligne, thème sombre (`#060911`), `prefers-reduced-motion` respecté. Commentaires : le « pourquoi » (perf, invariants), pas le « quoi ».
- Pas de code mort : pas de prop, fonction ou option « au cas où » ; supprimer plutôt que désactiver (`tsc --noEmit --noUnusedLocals --noUnusedParameters` doit rester propre).
- Commits Conventional Commits en français (`feat(data): …`, `fix: …`, `refactor: …`). Licence Apache-2.0.

## CI et publication

`refresh-data.yml` : tests → empreinte des sources → snapshot (restauré du cache ou reconstruit) → validation → build → test navigateur → artefact → déploiement Cloudflare Pages **depuis `main` uniquement** (jamais sur PR).

- **Cache du snapshot** : clé `snapshot-<hash des *.py et requirements de scripts/data>-<empreinte amont>`. Ne pas utiliser `hashFiles('scripts/data/**')` : il inclurait `__pycache__` et changerait à chaque run.
- Un cache créé sur `main` est lisible par toutes les PR, pas celui d'une PR : les runs de `main` et du lundi gardent le cache chaud. Une PR qui ne touche pas `scripts/data/` ne refait pas l'import ; une PR qui le touche doit le refaire.
- Les sources brutes (`.cache/data`) ne sont sauvegardées que hors PR, pour ne pas évincer les caches de `main`.
- Si l'on modifie ce qui entre dans le snapshot hors de `scripts/data/*.py`, l'ajouter à la clé de cache.
- Secrets `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID` : environnement GitHub `production` uniquement, jamais côté navigateur.

## Pièges

- `vite.config.ts` : le bloc `server.hmr` / `server.watch` (`DISABLE_HMR`) est imposé par Google AI Studio — ne pas le modifier. `.env.example` et `metadata.json` (mention de Gemini) en viennent aussi ; l'application n'a besoin d'aucune clé API.
- `.aistudio/` ne contient que des captures de génération : ne pas le modifier.
- Seul `bun.lock` est versionné : après un changement de dépendances, `bun install` et committer `bun.lock` ; pas de lockfile npm.
- La dernière année de décès observée est souvent partielle (`manifest.deathsThrough`) ; la survie est « estimée au » cette date, pas à l'année civile.
