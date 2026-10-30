import React from 'react';
import { X, Plus, Check, Trophy, Sparkles, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { getTopNamesForYear } from '../data/demographics';

interface CohortTopNamesModalProps {
  birthYear: number;
  setBirthYear: (year: number) => void;
  currentlyCompared: string[];
  onAddName: (name: string) => void;
  onApplyPreset: (namesList: string[], presetYear?: number) => void;
  onClose: () => void;
}

const DECADES = [1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];

export const CohortTopNamesModal: React.FC<CohortTopNamesModalProps> = ({
  birthYear,
  setBirthYear,
  currentlyCompared,
  onAddName,
  onApplyPreset,
  onClose,
}) => {
  const data = getTopNamesForYear(birthYear);

  const isAlreadyAdded = (name: string) =>
    currentlyCompared.some((c) => c.toLowerCase() === name.toLowerCase());

  const clampYear = (y: number) => Math.min(2024, Math.max(1920, y));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Palmarès des Prénoms • Année {birthYear}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Les prénoms les plus fréquemment attribués en {birthYear} (Âge actuel : {2026 - birthYear} ans)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive Year Switcher Bar inside Modal */}
        <div className="bg-slate-900/90 px-4 sm:px-6 py-3 border-b border-slate-800 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Calendar className="w-4 h-4 text-sky-400" />
              <span>Changer l'année du palmarès :</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBirthYear(clampYear(birthYear - 1))}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="number"
                min={1920}
                max={2024}
                value={birthYear}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!Number.isNaN(val)) setBirthYear(clampYear(val));
                }}
                className="w-20 bg-slate-950 border border-sky-500/50 rounded-lg px-2 py-1 text-sm font-bold text-center text-sky-400"
              />
              <button
                onClick={() => setBirthYear(clampYear(birthYear + 1))}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <input
            type="range"
            min={1920}
            max={2024}
            value={birthYear}
            onChange={(e) => setBirthYear(Number(e.target.value))}
            className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />

          {/* Quick Decade Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {DECADES.map((dec) => {
              const isSelectedDecade = Math.floor(birthYear / 10) * 10 === dec;
              return (
                <button
                  key={dec}
                  onClick={() => setBirthYear(dec)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap ${
                    isSelectedDecade
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  {dec}s
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Quick Presets Across Generations */}
          <div>
            <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Comparer directement les leaders de l'année {birthYear} ou une génération :
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <button
                onClick={() => {
                  onApplyPreset([data.males[0], data.females[0], data.males[1], data.females[1]], birthYear);
                  onClose();
                }}
                className="p-2.5 rounded-xl bg-sky-950/60 hover:bg-sky-900/60 text-left border border-sky-700/60 transition-colors group"
              >
                <div className="text-xs font-bold text-sky-300">
                  Leaders de {birthYear}
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5 truncate">
                  {data.males[0]}, {data.females[0]}, {data.males[1]}, {data.females[1]}
                </div>
              </button>

              <button
                onClick={() => {
                  onApplyPreset(['Jean', 'Marie', 'Michel', 'Françoise'], 1950);
                  onClose();
                }}
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-left border border-slate-800 transition-colors group"
              >
                <div className="text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
                  Baby-Boom (1950)
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Jean, Marie, Michel, Françoise
                </div>
              </button>

              <button
                onClick={() => {
                  onApplyPreset(['Nicolas', 'Julien', 'Aurélie', 'Céline'], 1985);
                  onClose();
                }}
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-left border border-slate-800 transition-colors group"
              >
                <div className="text-xs font-bold text-amber-400 group-hover:text-amber-300">
                  Génération Y (1985)
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Nicolas, Julien, Aurélie, Céline
                </div>
              </button>

              <button
                onClick={() => {
                  onApplyPreset(['Gabriel', 'Emma', 'Lucas', 'Louise'], 2015);
                  onClose();
                }}
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-left border border-slate-800 transition-colors group"
              >
                <div className="text-xs font-bold text-pink-400 group-hover:text-pink-300">
                  XXIe Siècle (2015)
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Gabriel, Emma, Lucas, Louise
                </div>
              </button>
            </div>
          </div>

          {/* Top Boys & Top Girls columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Top Boys */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-2 text-sm font-bold text-blue-400 mb-3 pb-2 border-b border-slate-800">
                <span>Top Garçons ({birthYear})</span>
              </div>
              <div className="space-y-1.5">
                {data.males.map((name, index) => {
                  const added = isAlreadyAdded(name);
                  return (
                    <div
                      key={name}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 text-xs border border-slate-800/60 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-slate-500 font-mono text-[11px]">
                          #{index + 1}
                        </span>
                        <span className="font-semibold text-white">{name}</span>
                      </div>
                      <button
                        onClick={() => !added && onAddName(name)}
                        disabled={added}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                          added
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                            : 'bg-sky-600 hover:bg-sky-500 text-white'
                        }`}
                      >
                        {added ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Ajouté</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" />
                            <span>Comparer</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Girls */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-2 text-sm font-bold text-pink-400 mb-3 pb-2 border-b border-slate-800">
                <span>Top Filles ({birthYear})</span>
              </div>
              <div className="space-y-1.5">
                {data.females.map((name, index) => {
                  const added = isAlreadyAdded(name);
                  return (
                    <div
                      key={name}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 text-xs border border-slate-800/60 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-slate-500 font-mono text-[11px]">
                          #{index + 1}
                        </span>
                        <span className="font-semibold text-white">{name}</span>
                      </div>
                      <button
                        onClick={() => !added && onAddName(name)}
                        disabled={added}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                          added
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                            : 'bg-pink-600 hover:bg-pink-500 text-white'
                        }`}
                      >
                        {added ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Ajouté</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" />
                            <span>Comparer</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
