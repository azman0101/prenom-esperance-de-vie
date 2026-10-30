import React from 'react';
import { X, BookOpen, Database, Code2, ExternalLink, Activity, FileSpreadsheet } from 'lucide-react';

interface MethodologyModalProps {
  onClose?: () => void;
  isInlineSection?: boolean;
}

export const MethodologyModal: React.FC<MethodologyModalProps> = ({
  onClose,
  isInlineSection = false,
}) => {
  const wrapperClass = isInlineSection
    ? 'max-w-7xl mx-auto w-full px-4 sm:px-6 pb-16'
    : 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80';

  const cardClass = isInlineSection
    ? 'w-full text-white space-y-5'
    : 'bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col text-white overflow-hidden p-5 space-y-5 overflow-y-auto';

  return (
    <div className={wrapperClass}>
      {isInlineSection && (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.06] pb-4 mb-6">
          <div>
            <p className="text-xs font-medium text-sky-400 mb-1">
              04. Sources Scientifiques & Architecture Open Data
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white section-heading">
              Méthodologie & Travaux de Baptiste Coulmont (2024)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md">
            « Un prénom pour la vie (et aussi pour la mort) » · Croisement des fichiers Insee des prénoms et des décès via Apache Parquet & DuckDB.
          </p>
        </div>
      )}

      <div className={cardClass}>
        {!isInlineSection && (
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2 section-heading">
                <BookOpen className="w-5 h-5 text-sky-400" />
                Méthodologie & Travaux de Baptiste Coulmont (2024)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                « Un prénom pour la vie (et aussi pour la mort) » • Croisement Insee Parquet & DuckDB
              </p>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Asymmetrical Bento Grid for Methodology */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs text-slate-300 leading-relaxed">
          {/* Bento Card 1 (7 cols): Research Abstract & Sociological Findings */}
          <div className="lg:col-span-7 bento-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-sky-400 section-heading">
              <Activity className="w-4 h-4" />
              <span>L'origine de l'étude & interprétation sociologique</span>
            </div>
            <p>
              Dans son étude <em>« Un prénom pour la vie (et aussi pour la mort) »</em> (novembre 2024), le sociologue
              <strong> Baptiste Coulmont</strong> (Université Paris 8) a exploré une question centrale :
              la mortalité des individus varie-t-elle selon le prénom qu'ils ont reçu à la naissance ?
            </p>
            <p>
              Le prénom n'a évidemment aucune vertu biologique directe sur la longévité. En revanche, il constitue un
              <strong> puissant marqueur socioculturel</strong> corrélé à la catégorie socioprofessionnelle, au niveau
              de diplôme et au capital culturel des parents :
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/[0.06]">
                <div className="font-semibold text-emerald-400 mb-1">
                  Prénoms classiques ou académiques
                </div>
                <p className="text-slate-400 text-[11px]">
                  (Alexandre, Augustin, Marie, Guillaume) : milieux favorisés, études supérieures longues, moindre exposition à la pénibilité physique et recours précoce aux soins.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/[0.06]">
                <div className="font-semibold text-amber-400 mb-1">
                  Prénoms à cycle de mode rapide
                </div>
                <p className="text-slate-400 text-[11px]">
                  (Kevin, Cindy, Johnny, Dylan) : milieux populaires ou ouvriers davantage exposés aux risques professionnels et aux inégalités territoriales de santé.
                </p>
              </div>
            </div>
          </div>

          {/* Bento Card 2 (5 cols): Technical Pipeline (R / DuckDB / Parquet) */}
          <div className="lg:col-span-5 bento-card p-5 sm:p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-400 section-heading">
                <Code2 className="w-4 h-4" />
                <span>Pipeline R · DuckDB & Apache Parquet</span>
              </div>
              <p className="text-slate-400">
                Pour croiser des dizaines de millions d'actes d'état civil sans saturer la mémoire vive, le script
                <code> 2024_deces-prenoms_parquet.R</code> s'appuie sur :
              </p>
              <ul className="space-y-2 text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-sky-400 font-mono">01.</span>
                  <span>
                    <code className="text-sky-300">duckdb::duckdb()</code> : moteur analytique SQL colonnaire en mémoire.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sky-400 font-mono">02.</span>
                  <span>
                    <code className="text-sky-300">arrow::read_parquet()</code> : interrogation directe des fichiers Insee compressés en Parquet.
                  </span>
                </li>
              </ul>
              <div className="p-3 rounded-xl bg-slate-950/90 border border-white/[0.06] font-mono text-[11px] text-emerald-400">
                Taux_Survie(Prénom, Année) = 1 - [ Décès_Cumulés / Naissances ]
              </div>
            </div>

            {/* Datasets */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/[0.06]">
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/[0.05]">
                <div className="font-semibold text-white flex items-center gap-1.5 text-[11px]">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Fichier des Prénoms</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Naissances Insee depuis 1900 par sexe et année.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/[0.05]">
                <div className="font-semibold text-white flex items-center gap-1.5 text-[11px]">
                  <Database className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                  <span>Fichier des Décès</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  +26 millions d'actes de décès depuis 1970 (RNIPP).
                </p>
              </div>
            </div>
          </div>

          {/* Bento Card 3 (12 cols): Official References Footer */}
          <div className="lg:col-span-12 bento-card px-5 py-4 flex flex-wrap items-center justify-between gap-4">
            <span className="text-slate-400 text-xs">
              Sources officielles & reproductibilité scientifique :
            </span>
            <div className="flex flex-wrap items-center gap-5 text-xs font-medium">
              <a
                href="https://coulmont.com/blog/2024/11/16/un-prenom-pour-la-vie-et-aussi-pour-la-mort/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-sky-400 hover:text-sky-300 transition-colors"
              >
                <span>Article de Baptiste Coulmont (2024)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://raw.githubusercontent.com/coulmont/varia/refs/heads/master/2024_deces-prenoms_parquet.R"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-sky-400 hover:text-sky-300 transition-colors"
              >
                <span>Script R (2024_deces-prenoms_parquet.R)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://www.insee.fr/fr/statistiques/2540004"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-sky-400 hover:text-sky-300 transition-colors"
              >
                <span>Insee Open Data (Prénoms & Décès)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

