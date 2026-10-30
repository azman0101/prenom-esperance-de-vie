import React from 'react';
import { Manifest } from '../data/demographics';
export const MethodologyModal: React.FC<{ manifest: Manifest; isInlineSection?: boolean }> = ({
  manifest,
}) => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 space-y-5">
    <div>
      <p className="text-sm text-sky-400">04. Sources et limites</p>
      <h2 className="text-3xl font-bold mt-2">Une observation n’est pas une projection</h2>
    </div>
    <div className="grid md:grid-cols-2 gap-5 text-sm leading-relaxed">
      <article className="bento-card p-6 space-y-3">
        <h3 className="text-lg text-sky-300 font-semibold">Naissances et décès enregistrés</h3>
        <p>
          Les rangs et effectifs viennent du fichier national des prénoms de l’INSEE. Les effectifs
          sont arrondis au multiple de cinq. Une absence peut correspondre à un effectif non diffusé
          ; elle ne signifie pas zéro.
        </p>
        <p>
          La survie estimée est calculée par 1 − décès cumulés / naissances, avec rapprochement du
          premier prénom, du sexe et de l’année de naissance. Les graphies avec et sans accents
          peuvent être regroupées pour ce rapprochement.
        </p>
        <p>
          Les décès avant 1970 sont absents ; les années 1970–1975 présentent des lacunes. Des
          délais d’enregistrement, migrations, changements de prénom et erreurs résiduelles peuvent
          biaiser les comparaisons.
        </p>
      </article>
      <article className="bento-card p-6 space-y-3">
        <h3 className="text-lg text-sky-300 font-semibold">Longévité sous hypothèses</h3>
        <p>
          La projection utilise les quotients INSEE par âge et sexe de {manifest.mortality.year},
          maintenus constants dans le futur. Les années restantes sont calculées conditionnellement
          à la survie jusqu’à l’âge actuel, puis ajoutées à cet âge.
        </p>
        <p>
          L’association statistique au prénom est régularisée vers la référence nationale. Un
          ajustement exige 1 000 naissances, 20 décès et une amélioration globale hors échantillon
          d’au moins 1 %. Sinon, la référence INSEE seule est affichée.
        </p>
        <p>
          La validation porte sur les six dernières années complètes de calibration, pas sur toute une vie future. Les intervalles à 95 %
          décrivent l’incertitude du modèle ; ils ne représentent pas les durées de vie
          individuelles et ne couvrent pas tous les biais des fichiers.
        </p>
        <p>
          Le prénom est un marqueur, jamais une cause biologique. Aucun profil social n’est déduit
          d’un prénom.
        </p>
      </article>
      <article className="bento-card p-6 space-y-3">
        <h3 className="text-lg text-sky-300 font-semibold">Actualisation et provenance</h3>
        <p>
          Naissances : {manifest.birthYears[0]}–{manifest.birthYears.at(-1)}. Décès enregistrés
          jusqu’au {manifest.deathsThrough}. Modèle entraîné jusqu’à {manifest.trainingThrough}.
        </p>
        <p>
          Snapshot {manifest.version} · acquis le{' '}
          {new Date(manifest.generatedAt).toLocaleDateString('fr-FR')}.
        </p>
        <p>{manifest.model.validated ? 'Validation du modèle réussie.' : manifest.model.reason}</p>
        <a href="data/quality-report.json" className="text-sky-300 underline">
          Rapport de qualité et de validation
        </a>
        <ul className="space-y-2">
          {manifest.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer" className="text-sky-300 underline">
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </article>
      <article className="bento-card p-6 space-y-3">
        <h3 className="text-lg text-sky-300 font-semibold">Travaux de Baptiste Coulmont</h3>
        <p>
          L’étude de 2024 compare les proportions de survivants pour la génération 1970. Elle ne
          fournit ni espérance de vie par prénom ni coefficients sociaux pour cette application.
          Notre projection est un modèle supplémentaire, distinct de ces travaux.
        </p>
        <p>
          <a
            href="https://coulmont.com/blog/2024/11/11/prenom-vie-mort/"
            target="_blank"
            rel="noreferrer"
            className="text-sky-300 underline"
          >
            Article original du 11 novembre 2024
          </a>
        </p>
        <p>
          <a
            href="https://github.com/coulmont/varia/blob/master/2024_deces-prenoms_parquet.R"
            target="_blank"
            rel="noreferrer"
            className="text-sky-300 underline"
          >
            Script R original
          </a>
        </p>
        <p>
          <a
            href="https://blog.insee.fr/l-esperance-de-vie-un-calcul-fictif-mais-tres-utile-v2025/"
            target="_blank"
            rel="noreferrer"
            className="text-sky-300 underline"
          >
            Comprendre l’espérance de vie — INSEE
          </a>
        </p>
      </article>
    </div>
  </div>
);
