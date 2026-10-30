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

`python3 scripts/data/sync.py --stamp` affiche en quelques secondes une empreinte des sources amont (URL, ETag, dates, taille), sans les télécharger : deux empreintes identiques signifient que les sources n'ont pas changé. La CI s'en sert comme clé de cache.

```bash
# Reconstruire depuis les mêmes sources conservées, sans réseau
python3 scripts/data/sync.py --offline
# Valider un snapshot existant
npm run data:validate
```

**Aucun snapshot n'est versionné dans Git.** `public/data/` est généré, ignoré par Git et doit exister avant le build (`npm run build` échoue sinon, par la vérification `prebuild`) : un déploiement par intégration Git de Cloudflare Pages ne fonctionnerait pas sans l'étape d'import ; la publication passe par GitHub Actions (voir plus bas). Chaque snapshot porte une `version` (hash des sources et du code de génération) et son manifeste enregistre la provenance : URL, empreintes SHA-256 et dates des sources. Il contient le manifeste, le palmarès annuel exact, les cohortes et un rapport de qualité. Le navigateur charge uniquement ces agrégats. Une absence de snapshot affiche un état d'erreur avec possibilité de réessayer, sans données simulées de secours.

## Calculs et limites

### Observations

Le rapprochement utilise premier prénom, sexe, année et lieu de naissance en France, avec retrait des oppositions et doublons. Les dates inconnues sont conservées à la résolution annuelle lorsque l'année est complète ; une date inconnue dans l'année partielle la plus récente ne peut pas être placée avant sa date d'arrêt. Les graphies restent distinctes pour le rang officiel ; les variantes accentuées sont regroupées pour le rapprochement, avec leur dénominateur explicite.

La survie estimée vaut `1 − décès cumulés / naissances`. Elle est indisponible avant le début de couverture des décès (lu dans les métadonnées de la source, 1970 pour l'extraction actuelle), pour moins de 100 naissances regroupées ou pour un décompte incohérent. Les premières années de couverture (1970–1975 aujourd'hui) présentent des lacunes. Une absence de naissance publiée ne vaut jamais zéro. Changements de prénom, migrations, délais d'enregistrement, géographie et arrondis peuvent biaiser cet indicateur ; il ne certifie aucun statut vital individuel.

### Projection

La projection est la **référence nationale de l'INSEE par âge et par sexe**, sans effet propre au prénom : elle est donc identique pour tous les prénoms de même sexe et de même cohorte. Seules les observations (survie estimée à partir des décès enregistrés, naissances, rang) distinguent les prénoms.

Un ajustement par prénom avait été étudié (modèle binomial log-log régularisé, validé chronologiquement sur les années récentes) ; il n'améliorait pas la prédiction de façon significative sur les données actuelles et a été retiré plutôt que conservé inactif. Il reste consultable dans l'historique Git.

La projection maintient constants les quotients de la dernière année publiée. Les quotients DEC3 (âge atteint dans l'année) sont convertis en âges révolus par interpolation des hazards à demi-année ; l'année de naissance reçoit un traitement distinct. Après le dernier âge détaillé, une queue exponentielle est calibrée sur l'espérance résiduelle officielle. Les espérances de référence doivent être reproduites à 0,2 an près. Les années restantes sont l'intégrale de survie **conditionnelle à l'âge actuel**, pas `e0 − âge`. L'âge moyen projeté est l'âge actuel plus cette espérance résiduelle.

Le prénom est un marqueur statistique, jamais une cause biologique. Les profils sociaux automatiques et personnages célèbres inventés ont été supprimés. Voir aussi l'[explication de l'INSEE sur l'espérance de vie](https://blog.insee.fr/l-esperance-de-vie-un-calcul-fictif-mais-tres-utile-v2025/).

## Actualisation et publication

`.github/workflows/refresh-data.yml` vérifie l'application et importe les sources chaque lundi à 06:00 UTC, sur demande et sur les modifications de `main`. Les PR passent les mêmes contrôles sans publication. Le rapport est résumé dans GitHub Actions ; le site et son snapshot sont conservés en artefact pendant 90 jours, avec les URL et empreintes SHA-256 dans le manifeste.

Le job de production publie le dossier `dist/` sur Cloudflare Pages, projet `prenom-esperance-de-vie`. Configurer dans l'environnement GitHub `production` :

- `CLOUDFLARE_API_TOKEN` : droit Cloudflare Pages sur le compte concerné ;
- `CLOUDFLARE_ACCOUNT_ID` : identifiant du compte.

### Configurer les secrets avec GitHub CLI

Installer [GitHub CLI (`gh`)](https://cli.github.com/) et utiliser un compte administrateur du dépôt. Créer un jeton dans [Cloudflare → API Tokens](https://dash.cloudflare.com/profile/api-tokens) avec la permission **Account → Cloudflare Pages → Edit**, limitée au compte qui héberge le projet. L'identifiant du compte se trouve dans le tableau de bord Cloudflare du compte concerné, sous **Account ID** ; ce n'est pas le Zone ID d'un domaine.

Dans un terminal interactif, exécuter les blocs suivants. `gh secret set` ouvre lui-même une invite de saisie masquée : coller la valeur demandée, puis valider avec Entrée. Les valeurs ne figurent ni dans les commandes ni dans l'historique du shell.

```bash
# Se connecter à GitHub si nécessaire
gh auth status || gh auth login

# Créer l'environnement du déploiement s'il n'existe pas encore
gh api repos/azman0101/prenom-esperance-de-vie/environments/production --silent || \
  gh api --method PUT \
    repos/azman0101/prenom-esperance-de-vie/environments/production \
    --silent
```

```bash
# Invite masquée : coller le jeton Cloudflare
gh secret set CLOUDFLARE_API_TOKEN \
  --repo azman0101/prenom-esperance-de-vie \
  --env production

# Invite masquée : coller l'identifiant du compte Cloudflare
gh secret set CLOUDFLARE_ACCOUNT_ID \
  --repo azman0101/prenom-esperance-de-vie \
  --env production

# Vérifier les noms des deux secrets enregistrés (sans afficher leurs valeurs)
gh secret list \
  --repo azman0101/prenom-esperance-de-vie \
  --env production
```

Le projet Cloudflare Pages `prenom-esperance-de-vie` doit exister dans ce compte et utiliser `main` comme branche de production. Une fois le workflow présent sur `main`, lancer une actualisation et un déploiement manuels :

```bash
gh workflow run refresh-data.yml \
  --repo azman0101/prenom-esperance-de-vie \
  --ref main

gh run list \
  --repo azman0101/prenom-esperance-de-vie \
  --workflow refresh-data.yml \
  --limit 5
```

Les jobs n'ont pas de droit d'écriture sur le dépôt. Un échec d'import, de test, de schéma ou de build bloque le déploiement : la version en ligne précédente reste servie. Les anciennes versions Cloudflare et les artefacts permettent le retour à une version précédente.

### Cache de la CI

L'import complet est long (plusieurs dizaines de minutes) ; la CI l'évite quand rien n'a changé :

1. Elle calcule l'empreinte des sources amont (`sync.py --stamp`, quelques secondes, sans téléchargement).
2. Le snapshot est mis en cache sous la clé `snapshot-<hash de scripts/data>-<empreinte des sources>`. Sur un succès, l'import est sauté ; le snapshot restauré est quand même revalidé, compilé et testé.
3. Sinon, les sources brutes (`.cache/data`) sont restaurées depuis le cache le plus récent pour ne télécharger que ce qui a changé, puis le snapshot est recalculé.

Un cache créé sur `main` est lu par toutes les PR, tandis que celui d'une PR n'est lu que par cette PR. Les exécutions de `main` et du lundi gardent donc le cache chaud : une PR qui ne touche pas à `scripts/data/` réutilise le snapshot de `main` et ne refait pas l'import. Une PR qui modifie `scripts/data/` doit au contraire le recalculer, puisque le code de génération a changé. Les sources brutes ne sont écrites dans le cache que hors PR, pour ne pas évincer celles de `main`. La case « Reconstruire le snapshot » du lancement manuel force un recalcul.

Les fichiers bruts restent en cache de traitement. Un snapshot agrégé conservé avec l'artefact permet de reproduire l'affichage, même si les sources en ligne sont révisées. La reconstruction statistique exacte exige également les fichiers bruts portant les empreintes du manifeste.

## Licence

Code Apache-2.0 ; données INSEE/data.gouv.fr réutilisées selon leurs licences et attributions, dont la Licence Ouverte 2.0 pour les décès agrégés.
