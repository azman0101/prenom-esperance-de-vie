# Prénoms & Longévité

Observatoire statique React / Three.js : prénoms officiels INSEE, survie estimée à partir des décès enregistrés et **projection de longévité sous hypothèses**. Les statistiques ne sont plus des listes manuelles ou des valeurs calculées à partir d'un hash du prénom.

## Sources et construction du dataset

Le [script R de Baptiste Coulmont](https://github.com/coulmont/varia/blob/master/2024_deces-prenoms_parquet.R) lit un CSV national `nat2023.csv` acquis localement, supprime les accents, regroupe les graphies, puis rapproche naissances et décès pour les 14 premiers prénoms de chaque sexe de la génération 1970. Il calcule une proportion de survivants, **pas une espérance de vie ni un profil social**. L'[article original](https://coulmont.com/blog/2024/11/11/prenom-vie-mort/) date du 11 novembre 2024.

Notre acquisition découvre les millésimes depuis les métadonnées :

- [Catalogue INSEE DS_PRENOM](https://api.insee.fr/melodi/catalog/DS_PRENOM) : découverte de la publication, téléchargement de son extrait national CSV. L'édition publiée en juillet 2026 couvre 1900–2025 et fournit un rang officiel et des effectifs arrondis à cinq près.
- [Agrégation officielle data.gouv.fr des décès](https://www.data.gouv.fr/datasets/agregation-des-fichiers-des-personnes-decedees) : découverte de la ressource Parquet par l'API, actuellement des enregistrements de 1970 à septembre 2026. Les dates de survenue et d'enregistrement peuvent différer.
- [Catalogue INSEE des séries de mortalité](https://api.insee.fr/melodi/catalog/DS_DECES_MORTALITE_SERIES) : découverte du bilan et de ses tableaux DEC3 (quotients par âge/sexe) et DEC5 (espérance résiduelle).

Le catalogue pointe sur les nouvelles éditions : aucune substitution manuelle d'année dans une URL n'est nécessaire. Les anciennes années sont recalculées pour intégrer les révisions. Si la structure d'une source change, le traitement échoue plutôt que d'inventer des données.

## Installation et vérification

Node **22.18+**, Bun 1.4.4+ et Python 3.12. Le frontend n'a aucune clé API ni backend.

```bash
bun install --frozen-lockfile
python3 -m venv .venv
. .venv/bin/activate
pip install -r scripts/data/requirements.txt
npm run data:sync
npm run test:data
npm test
npm run lint
npm run build
npm run test:browser  # nécessite Chromium/Chrome (CHROME_BIN si nécessaire)
npm run dev
```

L'import initial télécharge environ 660 Mo de décès et utilise jusqu'à 2 Go de mémoire DuckDB, avec débordement disque. Prévoir 10 Go d'espace temporaire. Les sources sont dans `.cache/data/`, ignoré par Git ; les ETag et dates HTTP permettent leur réutilisation. Les fichiers individuels ne sont jamais déployés.

```bash
# Reconstruire depuis les mêmes sources conservées, sans réseau
python3 scripts/data/sync.py --offline
# Valider un snapshot existant
npm run data:validate
```

`public/data/` est généré, ignoré par Git et doit exister avant la publication du site. Il contient le manifeste, le palmarès annuel exact, un index des noms, les cohortes et un rapport de qualité. Le navigateur charge uniquement ces agrégats. Une absence de snapshot affiche un état d'erreur avec possibilité de réessayer, sans données simulées de secours.

## Calculs et limites

### Observations

Le rapprochement utilise premier prénom, sexe, année et lieu de naissance en France, avec retrait des oppositions et doublons. Les dates inconnues sont conservées à la résolution annuelle lorsque l'année est complète ; une date inconnue dans l'année partielle la plus récente ne peut pas être placée avant sa date d'arrêt. Les graphies restent distinctes pour le rang officiel ; les variantes accentuées sont regroupées pour le rapprochement, avec leur dénominateur explicite.

La survie estimée vaut `1 − décès cumulés / naissances`. Elle est indisponible avant 1970, pour moins de 100 naissances regroupées ou pour un décompte incohérent. Les fichiers de 1970–1975 présentent des lacunes. Une absence de naissance publiée ne vaut jamais zéro. Changements de prénom, migrations, délais d'enregistrement, géographie et arrondis peuvent biaiser cet indicateur ; il ne certifie aucun statut vital individuel.

### Projection

Le modèle binomial agrégé à lien complémentaire log-log emploie les quotients nationaux comme offset, un effet prénom/sexe et une déviation par décennie, régularisés par ridge. L'apprentissage utilise les cohortes à partir de 1976, les années couvertes par les quotients nationaux et uniquement des années complètes de décès.

La pénalité est choisie parmi 1, 10 et 100 sur trois validations chronologiques de deux années : 2020–2021, 2022–2023 et 2024–2025 pour les données actuelles. Les fenêtres avancent avec la dernière année complète de calibration. L'ajustement n'est publié que si le gain moyen de log-vraisemblance prédictive atteint 1 %. Chaque groupe exige en outre 1 000 naissances de calibration et 20 décès. Sinon : **référence INSEE seule**. Ces fenêtres servent à sélectionner et valider chaque version, sans prétendre constituer un test indépendant après sélection. Le rapport conserve leurs bornes et leurs scores.

Les intervalles à 95 % utilisent l'approximation de Laplace de la vraisemblance pénalisée avec sensibilité à l'arrondi du dénominateur. Ils ne couvrent ni tous les biais de source ni la dispersion des durées de vie individuelles.

La projection maintient constants les quotients de la dernière année publiée et le facteur de risque estimé au prénom. Les quotients DEC3 (âge atteint dans l'année) sont convertis en âges révolus par interpolation des hazards à demi-année ; l'année de naissance reçoit un traitement distinct. Après le dernier âge détaillé, une queue exponentielle est calibrée sur l'espérance résiduelle officielle. Les espérances de référence doivent être reproduites à 0,2 an près. Les années restantes sont l'intégrale de survie **conditionnelle à l'âge actuel**, pas `e0 − âge`. L'âge moyen projeté est l'âge actuel plus cette espérance résiduelle.

Le backtest ne valide pas l'extrapolation aux âges futurs non observables. Le prénom est un marqueur statistique, jamais une cause biologique. Les profils sociaux automatiques et personnages célèbres inventés ont été supprimés. Voir aussi l'[explication de l'INSEE sur l'espérance de vie](https://blog.insee.fr/l-esperance-de-vie-un-calcul-fictif-mais-tres-utile-v2025/).

## Actualisation et publication

`.github/workflows/refresh-data.yml` vérifie l'application et importe les sources chaque lundi à 06:00 UTC, sur demande et sur les modifications de `main`. Les PR passent les mêmes contrôles sans publication. Le rapport est résumé dans GitHub Actions ; le site et son snapshot sont conservés en artefact pendant 90 jours, avec les URL et empreintes SHA-256 dans le manifeste.

Le job de production publie le dossier `dist/` sur Cloudflare Pages, projet `prenom-esperance-de-vie`. Configurer dans l'environnement GitHub `production` :

- `CLOUDFLARE_API_TOKEN` : droit Cloudflare Pages sur le compte concerné ;
- `CLOUDFLARE_ACCOUNT_ID` : identifiant du compte.

Les jobs n'ont pas de droit d'écriture sur le dépôt. Un échec d'import, de test, de schéma ou de build bloque le déploiement : la version en ligne précédente reste servie. Un modèle non validé autorise la publication des observations et de la référence nationale, sans effet prénom. Les anciennes versions Cloudflare et les artefacts permettent le retour à une version précédente.

Les fichiers bruts restent en cache de traitement. Un snapshot agrégé conservé avec l'artefact permet de reproduire l'affichage, même si les sources en ligne sont révisées. La reconstruction statistique exacte exige également les fichiers bruts portant les empreintes du manifeste.

## Licence

Code Apache-2.0 ; données INSEE/data.gouv.fr réutilisées selon leurs licences et attributions, dont la Licence Ouverte 2.0 pour les décès agrégés.
