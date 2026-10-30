# AGENTS.md

Guide pour les agents IA (et contributeurs) travaillant sur ce dépôt. Pour le contexte scientifique, l'installation et le déploiement, voir `README.md`.

## Aperçu

SPA 100 % côté client : « Prénoms & Espérance de Vie », un observatoire démographique en **3D (Three.js)** et **2D (courbes de survie)**. Elle croise des prénoms français (1920–2024) avec des tables de survie par cohorte (INSEE) et des ratios de risque inspirés de l'étude de Baptiste Coulmont. Le prénom y est un **marqueur social**, jamais une cause biologique : ne pas écrire de texte ou de code qui suggère le contraire.

- Pas de backend, pas de base de données, pas de clé API : tout est calculé dans le navigateur.
- Langue de l'interface, des libellés, des commentaires métier et des commits : **français** (le code, les identifiants et les commentaires techniques sont en anglais).

## Stack

React 19 · TypeScript · Vite 8 · Tailwind CSS v4 (`@tailwindcss/vite`, `@import "tailwindcss"` dans `src/index.css`, pas de `tailwind.config`) · Three.js · `lucide-react`.

## Commandes

| Action | Commande |
| --- | --- |
| Installer | `npm install` (ou `bun install`, un `bun.lock` est présent ; en cas de conflit de peer deps : `--legacy-peer-deps`) |
| Dev | `npm run dev` → http://localhost:3000 (`--host=0.0.0.0`) |
| Vérif. types | `npm run lint` (= `tsc --noEmit`) |
| Build | `npm run build` → `dist/` |
| Aperçu du build | `npm run preview` |

**Il n'y a pas de tests automatisés ni de linter ESLint/Prettier.** `npm run lint` est la seule vérification statique : la lancer avant tout commit, et lancer aussi `npm run build` pour toute modification touchant l'import dynamique, la config Vite ou Tailwind. Pour un changement visuel, démarrer le serveur de dev et vérifier dans un navigateur (le rendu WebGL ne peut pas être validé par `tsc`).

Node 20 ou 22 LTS requis (Vite 8).

## Structure

```
src/
  main.tsx                      point d'entrée (createRoot)
  App.tsx                       état global + mise en page « scrollytelling » (5 sections)
  index.css                     Tailwind + classes utilitaires custom (.bento-card, .sticky-glass-dock, .bento-section…)
  config.ts                     TOUS les paramètres (défauts, presets, modèles, rendu) — sans dépendance interne
  data/demographics.ts          données, bornes de dates dérivées des données et moteur de calcul
  components/
    ShinyHeader.tsx             en-tête / dock de navigation, exporte le type ScrollySectionId
    ControlDock.tsx             ControlDock (sur la scène 3D) + BentoComparatorSection (grille bento)
    ThreeDemographicScene.tsx   scène Three.js procédurale
    SurvivalCurveModal.tsx      courbes de survie (SVG/2D), utilisé en section inline
    CohortTopNamesModal.tsx     palmarès par cohorte + presets de générations
    MethodologyModal.tsx        méthodologie et sources
    DemographicDetailPanel.tsx  panneau de détail d'un prénom
index.html, vite.config.ts, tsconfig.json
```

L'alias `@` pointe sur la **racine du dépôt** (pas `src/`) : `@/src/...`.

## Pas de valeurs en dur

Ne pas écrire de littéral métier dans les composants. Sources uniques :

- **`src/config.ts`** : `REFERENCE_YEAR` (année courante, `new Date().getFullYear()`), état initial (`DEFAULT_BIRTH_YEAR`, `DEFAULT_COMPARED_NAMES`), presets générationnels (`GENERATION_PRESETS`), paramètres du modèle de prénom (`NAME_MODEL`), des courbes de survie (`SURVIVAL_CHART`) et du rendu 3D (`SCENE_RENDER`).
- **`src/data/demographics.ts`** : `MIN_BIRTH_YEAR` / `MAX_BIRTH_YEAR` (**dérivés des clés de `INSER_COHORTS`** : ajouter une cohorte étend automatiquement les sélecteurs), `BIRTH_DECADES`, `clampBirthYear()`, `ageFromBirthYear()`, types `SocioProfile`.
- Libellés « en {REFERENCE_YEAR} » : utiliser la constante, jamais `2026`.
- Classes Tailwind conditionnelles : stocker des chaînes **complètes** dans la config (ex. `titleClass`), jamais de concaténation (`text-${color}-400`), sinon Tailwind ne les détecte pas au build.

## Architecture et flux de données

- `App.tsx` possède l'état : `namesList` (le premier = prénom de l'utilisateur), `userPrimaryName`, `birthYear`, `gender`, `selectedIndex`, `viewMode`, `isAutoRotate`, `cameraTrigger`, `activeSection`. Il calcule `computedStatsList = namesList.map(computeNameStats)` via `useMemo` et le passe aux enfants par props (pas de store externe, pas de contexte).
- Invariant : `userPrimaryName === namesList[0]`. Utiliser les handlers d'`App.tsx` (`handleUserPrimaryNameChange`, `handleAddComparisonName`, `handleRemoveComparisonName`, `handleApplyPreset`) plutôt que d'appeler directement les setters, pour garder cette synchronisation et `selectedIndex` valides.
- Le sexe (`gender`) ne s'applique qu'au premier prénom (`idx === 0`) ; les autres utilisent le genre de la base ou une heuristique de terminaison.
- La navigation entre sections se fait par `scrollIntoView` sur les ids de `SECTION_DOM_IDS` ; un `IntersectionObserver` synchronise `activeSection` et met en pause la 3D hors viewport. Ajouter une section = étendre `ScrollySectionId` (ShinyHeader), `SECTION_DOM_IDS` et le rendu dans `App.tsx`.

### `src/data/demographics.ts`

- `INSER_COHORTS` (nom historique avec la faute « INSER », conservé : ne pas renommer sans mettre à jour tous les usages) : points tous les 5 ans (+ dernière année), interpolés linéairement par `getCohortLifeStats(year)`. Ses clés définissent la plage d'années de l'application.
- `FAMOUS_NAMES_DATABASE` : clé = prénom **normalisé** (`cleanName` : sans accents, minuscules). `HISTORICAL_TOP_NAMES_BY_YEAR` / `getTopNamesForYear` : palmarès.
- `computeNameStats(name, birthYear, forcedGender?)` : pour un prénom connu, utilise `lifeExpectancyDelta` / `mortalityHazardRatio` de la base ; sinon, **modèle de repli déterministe** basé sur un hash du prénom (résultat reproductible, `isCustomEstimated: true`). Survie ajustée = `survie_cohorte ^ hazardRatio` (`adjustSurvivalRate`), bornée par `NAME_MODEL.survivalBounds`.
- Ajouter un prénom : nouvelle entrée `NameRecord` (clé normalisée) avec `peakDecade`, `socioProfile`, `mortalityHazardRatio`, `lifeExpectancyDelta`, `famousPeople`, `colorHex`/`accentHex`. Les valeurs sont des estimations calibrées, pas des données brutes INSEE : le dire explicitement si on en invente de nouvelles.
- Pas de `Math.random()` dans les calculs : le résultat doit être reproductible pour une année de référence donnée (seule `REFERENCE_YEAR` varie dans le temps, via l'âge).

## Rendu 3D — règles de performance (à respecter)

`ThreeDemographicScene.tsx` est volontairement optimisé pour limiter la charge GPU/thermique (MacBook / écrans Retina). Ne pas régresser sur :

1. **100 % procédural** : aucune ressource externe (`.glb`, textures `.png`…). Les étiquettes sont dessinées sur des canvas 2D → `CanvasTexture`.
2. **Chargement différé** : la scène et les sections lourdes sont en `React.lazy` + `Suspense`, et la scène n'est montée qu'après `is3DReady` (≈ 40 ms après le premier rendu). Garder ce schéma pour tout nouveau composant lourd.
3. **Boucle de rendu** : plafonnée à 30 FPS, mise en veille (0 FPS) quand la scène est immobile, quand `document.hidden`, ou quand `isPaused` (section 3D hors viewport). Tout nouvel état animé doit réveiller la boucle (voir `isLoopRunning` / `tick`).
4. **`devicePixelRatio` plafonné à 1.25** (1 en rendu logiciel).
5. **Props lues via `propsRef`** dans la boucle d'animation afin de ne pas recréer la scène à chaque rendu React ; le `useEffect` principal ne doit pas dépendre des props changeantes.
6. **Nettoyage** : à l'unmount, disposer `renderer`, `controls`, `pmremGenerator`, géométries, matériaux **et textures** (`map`). Tout nouvel objet GPU doit être libéré dans ce cleanup.

## Conventions de code

- Composants fonctionnels React en TypeScript, exports **nommés** (`export const X: React.FC<XProps>`), un fichier par composant dans `src/components/`. `App` est le seul export par défaut. Les imports de modules locaux de `App.tsx` utilisent l'extension (`./App.tsx`) ; `allowImportingTsExtensions` est activé.
- Props typées via une `interface XProps` locale ; types métier réutilisables exportés depuis `src/data/demographics.ts`.
- Styles : classes utilitaires Tailwind en ligne ; thème sombre (fond `#060911`, texte slate/blanc). Les rares styles partagés vont dans `src/index.css`. Respecter `prefers-reduced-motion`.
- Les composants `*Modal` sont rendus aujourd'hui en **sections inline** (`isInlineSection={true}`) ; ils gardent aussi leur mode modale.
- Pas de commentaires superflus ; commenter le « pourquoi » (perf, invariants), comme dans le code existant.

## Pièges connus

- **`vite.config.ts`** : le bloc `server.hmr` / `server.watch` (variable `DISABLE_HMR`) est imposé par l'environnement Google AI Studio — ne pas le modifier.
- **Héritage AI Studio** : `.env.example` et `metadata.json` (mention de Gemini) viennent du gabarit AI Studio ; l'application n'a besoin d'aucune clé API. Ne pas ajouter de code serveur ni d'appel Gemini sans demande explicite.
- **Données ≠ année de référence** : les taux de survie des cohortes (`INSER_COHORTS`) sont un instantané ; ils sont présentés « en {REFERENCE_YEAR} » par choix produit. Si l'on veut un affichage strictement fidèle aux données, introduire une constante d'année de données distincte.
- Le dossier `.aistudio/` ne contient que des artefacts de génération (captures) : ne pas le modifier ni s'en servir comme source.
- Seul `bun.lock` est versionné (pas de `package-lock.json`) : après un changement de dépendances, lancer `bun install` et committer `bun.lock` ; ne pas committer de lockfile npm.

## Déploiement

Sortie statique `dist/` hébergeable sur Cloudflare Pages (preset Vite, `npm run build`, `NODE_VERSION=22`) ou via `npx wrangler pages deploy dist --project-name=prenom-esperance-de-vie`. Aucune variable d'environnement n'est requise au runtime.

## Git

- Messages de commit au format Conventional Commits (`feat:`, `fix:`, `refactor:`, `perf:`, `chore:`, `docs:`, avec scope optionnel, ex. `feat(ui): …`), en suivant l'historique.
- Licence : Apache-2.0.
