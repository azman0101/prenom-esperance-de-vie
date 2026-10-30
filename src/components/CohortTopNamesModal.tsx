import React from 'react';
import { X, Plus, Check, Trophy, Sparkles, Calendar, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  BIRTH_DECADES,
  MAX_BIRTH_YEAR,
  MIN_BIRTH_YEAR,
  ageFromBirthYear,
  clampBirthYear,
  computeNameStats,
  getTopNamesForYear,
} from '../data/demographics';
import { GENERATION_PRESETS } from '../config';

interface CohortTopNamesModalProps {
  birthYear: number;
  setBirthYear: (year: number) => void;
  currentlyCompared: string[];
  onAddName: (name: string) => void;
  onApplyPreset: (namesList: string[], presetYear?: number) => void;
  onClose?: () => void;
  isInlineSection?: boolean;
}


interface TopNamesColumnProps {
  title: string;
  names: string[];
  gender: 'M' | 'F';
  birthYear: number;
  /** Classes Tailwind complètes (détectables au build) pour le titre et le bouton d'ajout. */
  titleClass: string;
  addButtonClass: string;
  isAlreadyAdded: (name: string) => boolean;
  onAddName: (name: string) => void;
}

const TopNamesColumn: React.FC<TopNamesColumnProps> = ({
  title,
  names,
  gender,
  birthYear,
  titleClass,
  addButtonClass,
  isAlreadyAdded,
  onAddName,
}) => (
  <div className="bg-slate-950/80 p-4 sm:p-5 rounded-xl border border-white/[0.07]">
    <div className={`flex items-center justify-between text-sm font-bold ${titleClass} mb-3 pb-2.5 border-b border-white/[0.06]`}>
      <span>{title}</span>
      <span className="text-xs font-normal text-slate-400">Insee RNIPP</span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {names.map((name, index) => {
        const added = isAlreadyAdded(name);
        const stats = computeNameStats(name, birthYear, gender);
        return (
          <div
            key={name}
            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/70 hover:bg-slate-900 text-xs border border-white/[0.05] transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-5 text-slate-500 font-mono text-[11px] tabular-nums shrink-0">#{index + 1}</span>
              <span className="font-semibold text-white truncate">{name}</span>
              {stats.popularityTrend === 'up' ? (
                <TrendingUp className="w-3 h-3 text-emerald-400 shrink-0" />
              ) : stats.popularityTrend === 'down' ? (
                <TrendingDown className="w-3 h-3 text-rose-400 shrink-0" />
              ) : (
                <Minus className="w-3 h-3 text-slate-400 shrink-0" />
              )}
            </div>
            <button
              type="button"
              onClick={() => !added && onAddName(name)}
              disabled={added}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
                added
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                  : `${addButtonClass} text-white`
              }`}
            >
              {added ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>Actif</span>
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3" />
                  <span>Ajouter</span>
                </>
              )}
            </button>
          </div>
        );
      })}
    </div>
  </div>
);

export const CohortTopNamesModal: React.FC<CohortTopNamesModalProps> = ({
  birthYear,
  setBirthYear,
  currentlyCompared,
  onAddName,
  onApplyPreset,
  onClose,
  isInlineSection = false,
}) => {
  const data = getTopNamesForYear(birthYear);

  const isAlreadyAdded = (name: string) =>
    currentlyCompared.some((c) => c.toLowerCase() === name.toLowerCase());

  const wrapperClass = isInlineSection
    ? 'max-w-7xl mx-auto w-full px-4 sm:px-6'
    : 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80';

  const cardClass = isInlineSection
    ? 'bento-card w-full flex flex-col text-white overflow-hidden'
    : 'bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col text-white overflow-hidden';

  return (
    <div className={wrapperClass}>
      {isInlineSection && (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.06] pb-4 mb-6">
          <div>
            <p className="text-xs font-medium text-sky-400 mb-1">
              03. Sociologie des Générations & Palmarès Insee
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white section-heading">
              Palmarès des Prénoms de l'Année {birthYear}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md">
            Explorez les prénoms masculins et féminins les plus attribués en {birthYear}, leur dynamique de tendance et comparez des générations types en un clic.
          </p>
        </div>
      )}

      <div className={cardClass}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/[0.06]">
          <div>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2 section-heading">
              <Trophy className="w-5 h-5 text-amber-400" />
              Top Attributions & Presets Générationnels • {birthYear}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Les prénoms les plus fréquemment attribués en {birthYear} (Âge actuel : {ageFromBirthYear(birthYear)} ans)
            </p>
          </div>
          {!isInlineSection && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Interactive Year Switcher Bar */}
        <div className="bg-slate-950/60 px-4 sm:px-6 py-3.5 border-b border-white/[0.06] space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Calendar className="w-4 h-4 text-sky-400" />
              <span>Parcourir les cohortes ({MIN_BIRTH_YEAR}–{MAX_BIRTH_YEAR}) :</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBirthYear(clampBirthYear(birthYear - 1))}
                className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="number"
                min={MIN_BIRTH_YEAR}
                max={MAX_BIRTH_YEAR}
                value={birthYear}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!Number.isNaN(val)) setBirthYear(clampBirthYear(val));
                }}
                className="w-20 bg-slate-950 border border-sky-500/40 rounded-lg px-2 py-1 text-sm font-bold text-center text-sky-400 tabular-nums"
              />
              <button
                type="button"
                onClick={() => setBirthYear(clampBirthYear(birthYear + 1))}
                className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <input
            type="range"
            min={MIN_BIRTH_YEAR}
            max={MAX_BIRTH_YEAR}
            value={birthYear}
            onChange={(e) => setBirthYear(Number(e.target.value))}
            className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />

          {/* Quick Decade Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {BIRTH_DECADES.map((dec) => {
              const isSelectedDecade = Math.floor(birthYear / 10) * 10 === dec;
              return (
                <button
                  key={dec}
                  type="button"
                  onClick={() => setBirthYear(dec)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap tabular-nums ${
                    isSelectedDecade
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-white/[0.06]'
                  }`}
                >
                  {dec}s
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Body */}
        <div className={`p-4 sm:p-6 ${isInlineSection ? '' : 'overflow-y-auto'} space-y-6`}>
          {/* Quick Presets Across Generations */}
          <div>
            <div className="text-xs font-semibold text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Charger un preset générationnel directement dans les Piliers 3D & Courbes :
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => {
                  onApplyPreset([data.males[0], data.females[0], data.males[1], data.females[1]], birthYear);
                  onClose?.();
                }}
                className="p-3.5 rounded-xl bg-sky-950/40 hover:bg-sky-900/50 text-left border border-sky-500/30 transition-colors group"
              >
                <div className="text-xs font-bold text-sky-300">
                  Leaders de {birthYear}
                </div>
                <div className="text-[11px] text-slate-300 mt-1 truncate">
                  {data.males[0]}, {data.females[0]}, {data.males[1]}, {data.females[1]}
                </div>
              </button>

              {GENERATION_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    onApplyPreset([...preset.names], preset.year);
                    onClose?.();
                  }}
                  className="p-3.5 rounded-xl bg-slate-950/70 hover:bg-slate-900 text-left border border-white/[0.07] transition-colors group"
                >
                  <div className={`text-xs font-bold ${preset.titleClass}`}>
                    {preset.label} ({preset.year})
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">{preset.names.join(', ')}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Top Boys & Top Girls columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <TopNamesColumn
              title={`Top Garçons (${birthYear})`}
              names={data.males}
              gender="M"
              birthYear={birthYear}
              titleClass="text-blue-400"
              addButtonClass="bg-sky-600 hover:bg-sky-500"
              isAlreadyAdded={isAlreadyAdded}
              onAddName={onAddName}
            />
            <TopNamesColumn
              title={`Top Filles (${birthYear})`}
              names={data.females}
              gender="F"
              birthYear={birthYear}
              titleClass="text-pink-400"
              addButtonClass="bg-pink-600 hover:bg-pink-500"
              isAlreadyAdded={isAlreadyAdded}
              onAddName={onAddName}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

