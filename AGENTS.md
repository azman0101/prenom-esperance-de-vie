# Guide du dépôt

SPA React 19 / TypeScript / Vite 8 / Tailwind v4 / Three.js. Interface et commentaires métier en français. Le prénom est un marqueur statistique, jamais une cause biologique.

## Données et architecture

- Lire `README.md` pour les sources, hypothèses, limites et commandes.
- Le traitement Python de `scripts/data/` découvre et télécharge les sources officielles. Les sorties `public/data/` et le cache `.cache/data/` sont générés et ignorés par Git. Ne jamais committer ou déployer les enregistrements individuels de décès.
- `src/data/demographics.ts` définit les contrats et calculs frontend. Séparer observations, disponibilité et projections. Aucune statistique de secours dérivée d'un hash ; le hash n'est autorisé que pour les couleurs.
- Les bornes des sélecteurs viennent du manifeste des naissances. Ne pas les dériver des tables de mortalité ni de l'année courante.
- `App.tsx` gère les chargements annulables, l'état et les comparaisons. Une cohorte ne peut pas être affichée avec les libellés d'une autre année.
- Conserver les graphies officielles et leur rang. Le regroupement pour le rapprochement des décès doit avoir un dénominateur distinct et explicite.
- Le modèle publie ses effets seulement après validation chronologique et contrôle des effectifs. Une projection nationale est signalée comme telle. Ne pas confondre durée de vie individuelle, espérance conditionnelle et incertitude du modèle.
- Pas de profil social, personne célèbre ou espérance de vie inventés. Pas de zéro pour une donnée non diffusée.

## Vérifications

`npm run test:data` (Python), `npm test` (contrats frontend), `npm run lint` (TypeScript), `npm run build`. Installer les dépendances Python de `scripts/data/requirements.txt`. `npm run data:sync` génère les agrégats ; `--offline` reconstruit depuis le cache acquis. Pour toute modification visuelle, vérifier dans un navigateur, y compris la 3D.

## Performance et conventions

- Garder la scène Three.js procédurale, différée, limitée à 30 FPS, endormie à l'arrêt/hors écran/onglet masqué, avec pixelRatio plafonné à 1,25.
- Conserver `propsRef` et le nettoyage des géométries, matériaux, textures, contrôles et renderer.
- Classes Tailwind complètes ; alias `@` vers la racine du dépôt ; exports nommés des composants.
- Ne pas modifier `server.hmr` / `server.watch` dans `vite.config.ts` : héritage AI Studio.
- Seul `bun.lock` est versionné. Après une modification de dépendances, utiliser Bun et mettre à jour ce lockfile, sans lockfile npm.
- La publication planifiée passe par GitHub Actions et Cloudflare Pages ; aucun secret côté navigateur.
- Commits Conventional Commits en français. Licence Apache-2.0.
