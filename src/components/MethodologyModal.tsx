import React from 'react';
import { X, BookOpen, Database, Code2, ExternalLink, Activity, FileSpreadsheet } from 'lucide-react';

interface MethodologyModalProps {
  onClose: () => void;
}

export const MethodologyModal: React.FC<MethodologyModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-sky-400" />
              Méthodologie & Travaux de Baptiste Coulmont (2024)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              « Un prénom pour la vie (et aussi pour la mort) » • Croisement Insee Parquet & DuckDB
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs text-slate-300 leading-relaxed">
          {/* Section 1: Research Abstract */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-sky-400">
              <Activity className="w-4 h-4" />
              <span>L'origine de l'étude (Novembre 2024)</span>
            </div>
            <p>
              Dans son article de blog <em>« Un prénom pour la vie (et aussi pour la mort) »</em>, le sociologue
              <strong> Baptiste Coulmont</strong> (Université Paris 8) a exploré une question fascinante :
              la mortalité des individus varie-t-elle selon le prénom qu'ils ont reçu à la naissance ?
            </p>
            <p>
              En croisant pour la première fois deux gisements majeurs de l'Open Data français via le format
              <strong> Apache Parquet</strong> et <strong>DuckDB</strong> (script R <code>2024_deces-prenoms_parquet.R</code>),
              l'auteur a reconstitué la trajectoire de survie des générations (notamment la cohorte 1970).
            </p>
          </div>

          {/* Section 2: Datasets Used */}
          <div>
            <h3 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              Les Deux Sources de Données Insee
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="font-semibold text-white mb-1 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
                  1. Fichier des Prénoms Insee
                </div>
                <p className="text-slate-400">
                  Recense toutes les naissances enregistrées en France depuis 1900 par sexe, année de naissance
                  et département.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="font-semibold text-white mb-1 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-pink-400" />
                  2. Fichier des Décès Insee
                </div>
                <p className="text-slate-400">
                  Recense plus de 26 millions de décès survenus depuis 1970 avec la date de naissance, la date de
                  décès, le sexe et le prénom exact de la personne.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Technical Pipeline (R / DuckDB / Parquet) */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
              <Code2 className="w-4 h-4" />
              <span>Le pipeline de calcul en R (2024_deces-prenoms_parquet.R)</span>
            </div>
            <p>
              Pour traiter les dizaines de millions de lignes sans dépasser la mémoire vive, le script utilise :
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
              <li>
                <code className="text-sky-300">duckdb::duckdb()</code> : moteur SQL embarqué ultra-rapide en mémoire.
              </li>
              <li>
                <code className="text-sky-300">arrow::read_parquet()</code> : lecture directe des fichiers Insee compressés au format Parquet.
              </li>
              <li>
                Calcul pour chaque prénom $i$ du ratio de survie cumulée :
                <br />
                <span className="font-mono text-emerald-400 ml-4 inline-block my-1">
                  Taux_Survie(Prénom, Année) = 1 - [ Décès_Cumulés(Prénom, Année) / Naissances(Prénom, Année) ]
                </span>
              </li>
            </ul>
          </div>

          {/* Section 4: Sociological Interpretation */}
          <div>
            <h3 className="text-sm font-bold text-slate-200 mb-2">
              Interprétation Sociologique : Pourquoi ces écarts de longévité ?
            </h3>
            <p className="text-slate-400 leading-relaxed">
              Le prénom n'a aucune vertu biologique directe sur la durée de vie. En revanche, le prénom est un
              <strong> puissant marqueur socioculturel</strong>. Le choix d'un prénom à la naissance est fortement
              corrélé à la classe sociale, au niveau de diplôme, au capital économique et culturel des parents :
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2 mt-2">
              <li>
                <strong>Prénoms bourgeois ou académiques</strong> (Alexandre, Augustin, Marie, Guillaume) : milieux
                favorisés, études supérieures longues, professions moins exposées à la pénibilité physique, alimentation
                équilibrée et recours précoce au système médical.
              </li>
              <li>
                <strong>Prénoms populaires des années 80-90</strong> (Kevin, Cindy, Johnny, Dylan) : milieu ouvrier ou
                employé, métiers plus physiques, précarité ou exposition accrue aux risques sanitaires et professionnels.
              </li>
            </ul>
          </div>

          {/* External Links */}
          <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <span className="text-slate-400">Ressources & Sources officielles :</span>
            <div className="flex items-center gap-3">
              <a
                href="https://coulmont.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-sky-400 hover:text-sky-300"
              >
                <span>Billet de B. Coulmont</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://raw.githubusercontent.com/coulmont/varia/refs/heads/master/2024_deces-prenoms_parquet.R"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-sky-400 hover:text-sky-300"
              >
                <span>Script R GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://www.insee.fr"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-sky-400 hover:text-sky-300"
              >
                <span>Insee Open Data</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
