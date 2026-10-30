import React, { useState } from 'react';
import { Award, TrendingUp, HeartPulse, UserCheck, ShieldAlert, Sparkles, ChevronRight, X } from 'lucide-react';
import { ComputedNameStats } from '../data/demographics';
import { REFERENCE_YEAR } from '../config';

interface DemographicDetailPanelProps {
  selectedName: ComputedNameStats;
  totalCompared: number;
  onOpenSurvivalCurves: () => void;
}

export const DemographicDetailPanel: React.FC<DemographicDetailPanelProps> = ({
  selectedName,
  totalCompared,
  onOpenSurvivalCurves,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  const delta = selectedName.adjustedLifeExpectancy - selectedName.cohortLifeExpBaseline;
  const isPositiveDelta = delta >= 0;

  return (
    <div className="absolute top-20 right-4 z-20 w-80 sm:w-96 max-w-[calc(100vw-2rem)] text-white">
      {/* Minimized badge */}
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0f172a] border border-slate-700 shadow-xl text-xs font-semibold text-slate-200 hover:text-white"
        >
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: selectedName.colorHex }}
          />
          <span>Détails : {selectedName.queryName}</span>
          <ChevronRight className="w-3.5 h-3.5 text-sky-400" />
        </button>
      ) : (
        /* Full Expanded Card (Solid rgba background, zero backdrop-filter) */
        <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl p-4 transition-all">
          {/* Header */}
          <div className="flex items-start justify-between pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="w-3.5 h-3.5 rounded-full ring-2 ring-white/20"
                  style={{ backgroundColor: selectedName.colorHex }}
                />
                <h2 className="text-xl font-bold tracking-tight text-white">
                  {selectedName.queryName}
                </h2>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {selectedName.gender === 'F' ? 'Féminin' : selectedName.gender === 'M' ? 'Masculin' : 'Mixte'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Cohorte {selectedName.birthYear} • Âge en {REFERENCE_YEAR} : <strong className="text-white">{selectedName.currentAge} ans</strong>
              </p>
            </div>
            <button
              onClick={() => setIsMinimized(true)}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
              title="Réduire"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 my-3">
            {/* Life Expectancy */}
            <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                <HeartPulse className="w-3.5 h-3.5 text-sky-400" />
                <span>Espérance de vie</span>
              </div>
              <div className="text-xl font-extrabold text-white">
                {selectedName.adjustedLifeExpectancy}{' '}
                <span className="text-xs font-normal text-slate-400">ans</span>
              </div>
              <div className="text-[10px] mt-1 flex items-center gap-1">
                <span
                  className={`font-semibold ${
                    isPositiveDelta ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {isPositiveDelta ? `+${delta.toFixed(1)}` : delta.toFixed(1)} ans
                </span>
                <span className="text-slate-500">vs moyenne cohorte</span>
              </div>
            </div>

            {/* Survival Rate at Current Age */}
            <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Taux de survie en {REFERENCE_YEAR}</span>
              </div>
              <div className="text-xl font-extrabold text-emerald-400">
                {selectedName.adjustedSurvivalRate}%
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Mortalité cumulée : {(100 - selectedName.adjustedSurvivalRate).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Sociological Profile (Coulmont Study) */}
          <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 mb-3">
            <div className="flex items-center justify-between text-xs font-semibold text-sky-400 mb-1">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                {selectedName.socioTitle}
              </span>
              <span className="text-[10px] text-slate-400">
                Hazard Ratio : {selectedName.mortalityHazardRatio}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedName.socioDescription}
            </p>
          </div>

          {/* Demographic Rank in Birth Year */}
          <div className="flex items-center justify-between text-xs py-2 px-3 bg-slate-900/40 rounded-xl border border-slate-800/60 mb-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span className="text-slate-300">Rang de popularité en {selectedName.birthYear} :</span>
            </div>
            <span className="font-bold text-amber-300">
              #{selectedName.rankInBirthYear} (~{selectedName.birthsEstimated.toLocaleString('fr-FR')} naissances)
            </span>
          </div>

          {/* Famous Personalities sharing the name */}
          {selectedName.famousPeople && selectedName.famousPeople.length > 0 && (
            <div className="mb-3">
              <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Personnalités illustres :
              </div>
              <div className="space-y-1">
                {selectedName.famousPeople.slice(0, 2).map((person, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800/50"
                  >
                    <span className="font-medium text-slate-200">{person.name}</span>
                    <span className="text-[11px] text-slate-400">{person.role}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Open Survival Curve Button */}
          <button
            onClick={onOpenSurvivalCurves}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-xs font-semibold transition-colors"
          >
            <span>Voir la courbe de survie détaillée</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
