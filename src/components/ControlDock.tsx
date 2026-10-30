import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, X, RotateCw, Sparkles, User, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  ComputedNameStats,
  MAX_BIRTH_YEAR,
  MIN_BIRTH_YEAR,
  ageFromBirthYear,
  clampBirthYear,
  computeNameStats,
  getTopNamesForYear,
} from '../data/demographics';
import { REFERENCE_YEAR } from '../config';

interface ControlDockProps {
  names: ComputedNameStats[];
  userPrimaryName: string;
  setUserPrimaryName: (name: string) => void;
  birthYear: number;
  setBirthYear: (year: number) => void;
  gender: 'M' | 'F' | 'X';
  setGender: (g: 'M' | 'F' | 'X') => void;
  selectedIndex: number;
  setSelectedIndex: (idx: number) => void;
  onAddComparisonName: (name: string) => void;
  onRemoveComparisonName: (index: number) => void;
  isAutoRotate: boolean;
  setIsAutoRotate: (v: boolean) => void;
  viewMode: 'overview' | 'comparison' | 'closeUp';
  setViewMode: (m: 'overview' | 'comparison' | 'closeUp') => void;
  onTriggerCameraReset?: () => void;
  onOpenTopNames: () => void;
}

export const ControlDock: React.FC<ControlDockProps> = ({
  names,
  userPrimaryName,
  setUserPrimaryName,
  birthYear,
  setBirthYear,
  gender,
  setGender,
  selectedIndex,
  setSelectedIndex,
  onAddComparisonName,
  onRemoveComparisonName,
  isAutoRotate,
  setIsAutoRotate,
  viewMode,
  setViewMode,
  onTriggerCameraReset,
  onOpenTopNames,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [compareInput, setCompareInput] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'details' | 'profile' | 'compare' | 'camera'>('details');

  const selectedName = names[selectedIndex] || names[0];
  const delta = selectedName ? selectedName.adjustedLifeExpectancy - selectedName.cohortLifeExpBaseline : 0;
  const isPositiveDelta = delta >= 0;

  const renderTrendIcon = (item: ComputedNameStats, sizeClass = 'w-3.5 h-3.5') => {
    const sign = item.popularityDeltaPercent > 0 ? '+' : '';
    const tooltip = `Popularité en ${item.birthYear} vs ${item.birthYear - 1} : ${
      item.popularityTrend === 'up'
        ? 'En hausse'
        : item.popularityTrend === 'down'
          ? 'En baisse'
          : 'Stable'
    } (${sign}${item.popularityDeltaPercent}% • ~${item.birthsEstimated.toLocaleString(
      'fr-FR'
    )} vs ~${item.previousYearBirthsEstimated.toLocaleString('fr-FR')} naissances)`;

    if (item.popularityTrend === 'up') {
      return (
        <span
          title={tooltip}
          aria-label={`Tendance en hausse (${sign}${item.popularityDeltaPercent}%)`}
          className="inline-flex items-center text-emerald-400 shrink-0"
        >
          <TrendingUp className={sizeClass} />
        </span>
      );
    }
    if (item.popularityTrend === 'down') {
      return (
        <span
          title={tooltip}
          aria-label={`Tendance en baisse (${item.popularityDeltaPercent}%)`}
          className="inline-flex items-center text-rose-400 shrink-0"
        >
          <TrendingDown className={sizeClass} />
        </span>
      );
    }
    return (
      <span
        title={tooltip}
        aria-label="Tendance stable"
        className="inline-flex items-center text-slate-400 shrink-0"
      >
        <Minus className={sizeClass} />
      </span>
    );
  };

  // Suggestions for current birth year
  const topNamesForYear = getTopNamesForYear(birthYear);
  const suggestedNames = [
    ...(topNamesForYear.males.slice(0, 4)),
    ...(topNamesForYear.females.slice(0, 4)),
  ].filter((n) => !names.some((existing) => existing.queryName.toLowerCase() === n.toLowerCase()));

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (compareInput.trim()) {
      onAddComparisonName(compareInput.trim());
      setCompareInput('');
    }
  };

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-20 w-[94vw] max-w-[940px] transition-all duration-300 ease-out"
      style={{
        bottom: isCollapsed ? '-240px' : '16px',
      }}
    >
      {/* Collapse Toggle Tab */}
      <div className="flex justify-center mb-1">
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-t-lg bg-[#0f172a] hover:bg-[#1e293b] text-slate-300 hover:text-white border-t border-x border-white/10 text-xs font-medium shadow-md transition-colors"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-sky-400" />
              <span>Afficher le dock 3D & prénoms</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Mode Zen / Plein Écran 3D</span>
            </>
          )}
        </button>
      </div>

      {/* Main Solid Dock Surface over WebGL Canvas */}
      <div className="bg-[#0b1120]/95 border border-white/10 rounded-2xl shadow-2xl p-3 sm:p-4 text-white">
        {/* Dock Subtabs & Comparison Chips */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
          {/* Subtabs */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-white/[0.06] text-xs">
            <button
              type="button"
              onClick={() => setActiveSubTab('details')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeSubTab === 'details'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: selectedName?.colorHex || '#38bdf8' }}
              />
              <span>Détails {selectedName ? `(${selectedName.queryName})` : ''}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('profile')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeSubTab === 'profile'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Votre Prénom & Âge
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('compare')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeSubTab === 'compare'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Comparateur ({names.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('camera')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeSubTab === 'camera'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Caméra 3D
            </button>
          </div>

          {/* Active Compared Name Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
            {names.length === 0 ? (
              <span className="text-xs text-slate-400 italic px-2 py-1">
                Aucun prénom sélectionné
              </span>
            ) : (
              names.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={`${item.normalizedName}-${idx}`}
                    onClick={() => {
                      setSelectedIndex(idx);
                      setActiveSubTab('details');
                    }}
                    className={`cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${
                      isSelected
                        ? 'bg-sky-950 text-white border-sky-500/80 shadow-sm'
                        : 'bg-slate-900/80 text-slate-300 border-white/[0.06] hover:border-white/15'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: item.colorHex }}
                    />
                    <span>{item.queryName}</span>
                    {renderTrendIcon(item, 'w-3.5 h-3.5')}
                    <span className="text-[10px] text-sky-400 font-bold tabular-nums">
                      {item.adjustedLifeExpectancy}a
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveComparisonName(idx);
                      }}
                      className="text-slate-400 hover:text-red-400 ml-1 p-0.5 rounded hover:bg-slate-800 transition-colors"
                      title={`Supprimer ${item.queryName} du comparateur`}
                      aria-label={`Supprimer ${item.queryName}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Tab 0: Detailed Actuarial Breakdown for Selected Name */}
        {activeSubTab === 'details' && (
          selectedName ? (
            <div className="pt-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs">
              {/* Column 1: Identity, Interactive Year & Rank */}
              <div className="md:col-span-3 bg-slate-900/90 p-2.5 rounded-xl border border-white/[0.06]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: selectedName.colorHex }}
                    />
                    <h3 className="font-bold text-base text-white truncate">{selectedName.queryName}</h3>
                    {renderTrendIcon(selectedName, 'w-4 h-4')}
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {selectedName.gender === 'F' ? 'Féminin' : selectedName.gender === 'M' ? 'Masculin' : 'Mixte'}
                  </span>
                </div>

                {/* Inline Birth Year Stepper */}
                <div className="flex items-center justify-between gap-1.5 mt-1.5 bg-slate-950/90 px-2 py-1 rounded-lg border border-white/[0.06]">
                  <span className="text-[11px] text-slate-400">Né(e) en :</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setBirthYear(clampBirthYear(birthYear - 1))}
                      className="p-0.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
                      title="Année précédente"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
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
                      className="w-14 bg-slate-900 border border-white/10 rounded px-1 py-0.5 text-[11px] font-bold text-center text-sky-400 tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => setBirthYear(clampBirthYear(birthYear + 1))}
                      className="p-0.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
                      title="Année suivante"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 tabular-nums">({selectedName.currentAge}a)</span>
                </div>

                <div className="flex items-center justify-between gap-1 text-[11px] text-amber-300 mt-1 font-medium truncate tabular-nums">
                  <span className="truncate">
                    Rang {selectedName.birthYear} : #{selectedName.rankInBirthYear} (~{selectedName.birthsEstimated.toLocaleString('fr-FR')} nais.)
                  </span>
                  <span
                    className={`text-[10px] font-semibold shrink-0 ${
                      selectedName.popularityTrend === 'up'
                        ? 'text-emerald-400'
                        : selectedName.popularityTrend === 'down'
                          ? 'text-rose-400'
                          : 'text-slate-400'
                    }`}
                    title={`Évolution par rapport à ${selectedName.birthYear - 1} (~${selectedName.previousYearBirthsEstimated.toLocaleString('fr-FR')} naissances)`}
                  >
                    {selectedName.popularityDeltaPercent > 0
                      ? `+${selectedName.popularityDeltaPercent}%`
                      : `${selectedName.popularityDeltaPercent}%`}{' '}
                    / {selectedName.birthYear - 1}
                  </span>
                </div>
              </div>

              {/* Column 2: Life Expectancy & Survival Rate */}
              <div className="md:col-span-4 grid grid-cols-2 gap-2">
                <div className="bg-slate-900/90 p-2.5 rounded-xl border border-white/[0.06]">
                  <div className="text-[10px] text-slate-400">Espérance de vie</div>
                  <div className="text-lg font-extrabold text-white tabular-nums">
                    {selectedName.adjustedLifeExpectancy} <span className="text-xs font-normal text-slate-400">ans</span>
                  </div>
                  <div className={`text-[10px] font-semibold mt-0.5 tabular-nums ${isPositiveDelta ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {isPositiveDelta ? `+${delta.toFixed(1)}` : delta.toFixed(1)} ans vs cohorte
                  </div>
                </div>
                <div className="bg-slate-900/90 p-2.5 rounded-xl border border-white/[0.06]">
                  <div className="text-[10px] text-slate-400">Survie à ce jour</div>
                  <div className="text-lg font-extrabold text-emerald-400 tabular-nums">
                    {selectedName.adjustedSurvivalRate}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                    Décès : {(100 - selectedName.adjustedSurvivalRate).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Column 3: Sociological Profile & Famous Figures */}
              <div className="md:col-span-5 bg-slate-900/90 p-2.5 rounded-xl border border-white/[0.06]">
                <div className="flex items-center justify-between text-[11px] font-semibold text-sky-400 mb-0.5">
                  <span>{selectedName.socioTitle}</span>
                  <span className="text-[10px] text-slate-400 font-mono tabular-nums">HR : {selectedName.mortalityHazardRatio}</span>
                </div>
                <p className="text-[11px] text-slate-300 line-clamp-2">
                  {selectedName.socioDescription}
                </p>
                {selectedName.famousPeople && selectedName.famousPeople.length > 0 && (
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 truncate">
                    <span className="text-amber-400">Illustres :</span>
                    <span>{selectedName.famousPeople.map((p) => p.name).join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="pt-3">
              <div className="bg-slate-900/90 p-4 rounded-xl border border-white/[0.06] text-center">
                <p className="text-sm font-semibold text-slate-200 mb-1">
                  Aucun prénom dans le comparateur
                </p>
                <p className="text-xs text-slate-400 mb-3 max-w-md mx-auto">
                  Ajoutez votre propre prénom ou cliquez sur une suggestion ci-dessous pour lancer l'analyse actuarielle 3D.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['Stéphane', 'Alexandre', 'Kevin', 'Sandrine', 'Céline'].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => onAddComparisonName(sug)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-950 hover:bg-sky-900 text-sky-300 text-xs font-medium border border-sky-800/80 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter {sug}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        )}

        {/* Tab 1: Profile & Birth Year Controls */}
        {activeSubTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 items-center">
            <div className="md:col-span-4">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Votre prénom
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={userPrimaryName}
                  onChange={(e) => setUserPrimaryName(e.target.value)}
                  placeholder="Ex: Stéphane, David, Céline..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="md:col-span-5">
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-1 tabular-nums">
                <span>Année de naissance : <strong className="text-sky-400 font-bold">{birthYear}</strong></span>
                <span>Âge actuel : <strong className="text-white">{ageFromBirthYear(birthYear)} ans</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={MIN_BIRTH_YEAR}
                  max={MAX_BIRTH_YEAR}
                  value={birthYear}
                  onChange={(e) => setBirthYear(Number(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
                <input
                  type="number"
                  min={MIN_BIRTH_YEAR}
                  max={MAX_BIRTH_YEAR}
                  value={birthYear}
                  onChange={(e) => setBirthYear(Number(e.target.value))}
                  className="w-16 bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-center text-white tabular-nums"
                />
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Sexe pour tables Insee
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl border border-white/[0.06] text-xs">
                <button
                  type="button"
                  onClick={() => setGender('M')}
                  className={`py-1.5 rounded-lg font-medium transition-all ${
                    gender === 'M' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Homme
                </button>
                <button
                  type="button"
                  onClick={() => setGender('F')}
                  className={`py-1.5 rounded-lg font-medium transition-all ${
                    gender === 'F' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Femme
                </button>
                <button
                  type="button"
                  onClick={() => setGender('X')}
                  className={`py-1.5 rounded-lg font-medium transition-all ${
                    gender === 'X' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Moyen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Comparison Tools */}
        {activeSubTab === 'compare' && (
          <div className="pt-3 space-y-3">
            <form onSubmit={handleAddSubmit} className="flex gap-2">
              <input
                type="text"
                value={compareInput}
                onChange={(e) => setCompareInput(e.target.value)}
                placeholder="Ajouter un prénom à comparer (ex: Alexandre, Kevin, Marie, Augustin)..."
                className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter</span>
              </button>
            </form>

            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Prénoms contemporains très attribués en {birthYear} :
                </span>
                <button
                  type="button"
                  onClick={onOpenTopNames}
                  className="text-sky-400 hover:underline text-[11px]"
                >
                  Aller au palmarès {birthYear}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestedNames.slice(0, 6).map((name) => {
                  const sugStats = computeNameStats(name, birthYear);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => onAddComparisonName(name)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs border border-white/10 transition-colors"
                    >
                      <Plus className="w-3 h-3 text-sky-400" />
                      <span>{name}</span>
                      {renderTrendIcon(sugStats, 'w-3 h-3')}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: 3D Camera & Presentation Modes */}
        {activeSubTab === 'camera' && (
          <div className="pt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">Navigation 3D libre (Clic gauche : orbiter • Clic droit : déplacer) :</span>
              <div className="flex bg-slate-900 p-1 rounded-xl border border-white/[0.06] text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('overview');
                    onTriggerCameraReset?.();
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    viewMode === 'overview' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Recentrer Vue Globale
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('comparison');
                    onTriggerCameraReset?.();
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    viewMode === 'comparison' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Alignement Comparatif
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('closeUp');
                    onTriggerCameraReset?.();
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    viewMode === 'closeUp' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  disabled={names.length === 0}
                >
                  Focus sur {names[selectedIndex]?.queryName || 'le prénom'}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAutoRotate(!isAutoRotate)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                isAutoRotate
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
              }`}
            >
              <RotateCw className={`w-3.5 h-3.5 ${isAutoRotate ? 'animate-spin' : ''}`} />
              <span>Rotation Automatique 3D</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Asymmetrical Bento Grid Section for the Unified Scrollytelling Interface
 * Replaces fragmented binder-tabs with an always-accessible, Linear/Stripe-inspired Bento Grid
 */
export const BentoComparatorSection: React.FC<ControlDockProps> = ({
  names,
  userPrimaryName,
  setUserPrimaryName,
  birthYear,
  setBirthYear,
  gender,
  setGender,
  selectedIndex,
  setSelectedIndex,
  onAddComparisonName,
  onRemoveComparisonName,
  onOpenTopNames,
}) => {
  const [compareInput, setCompareInput] = useState('');
  const selectedName = names[selectedIndex] || names[0];
  const topNamesForYear = getTopNamesForYear(birthYear);
  const suggestedNames = [
    ...topNamesForYear.males.slice(0, 5),
    ...topNamesForYear.females.slice(0, 5),
  ].filter((n) => !names.some((existing) => existing.queryName.toLowerCase() === n.toLowerCase()));

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (compareInput.trim()) {
      onAddComparisonName(compareInput.trim());
      setCompareInput('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 space-y-6">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.06] pb-4">
        <div>
          <p className="text-xs font-medium text-sky-400 mb-1">
            01. Analyse Multi-Prénoms & Paramètres Démographiques
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white section-heading">
            Studio Comparatif & Profil Actuariel ({birthYear})
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md">
          Ajustez votre année de naissance, ajoutez des prénoms au comparateur et inspectez instantanément les écarts d'espérance de vie et de tendance.
        </p>
      </div>

      {/* Asymmetrical Bento Grid (7 / 5 split + 12 full-width cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Bento Card 1 (7 cols): Interactive Profile & Comparator Builder */}
        <div className="lg:col-span-7 bento-card p-5 sm:p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white section-heading">
                Paramètres de Cohorte & Ajout de Prénoms
              </h3>
              <span className="text-xs text-slate-400 tabular-nums">
                Âge en {REFERENCE_YEAR} : <strong className="text-white">{ageFromBirthYear(birthYear)} ans</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              {/* Primary Name */}
              <div className="sm:col-span-5">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Prénom principal
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={userPrimaryName}
                    onChange={(e) => setUserPrimaryName(e.target.value)}
                    placeholder="Ex: Stéphane, Marie..."
                    className="w-full bg-slate-950/90 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Birth Year Slider */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Année de naissance ({birthYear})
                </label>
                <div className="flex items-center gap-2 bg-slate-950/90 border border-white/10 rounded-xl px-3 py-1.5">
                  <input
                    type="range"
                    min={MIN_BIRTH_YEAR}
                    max={MAX_BIRTH_YEAR}
                    value={birthYear}
                    onChange={(e) => setBirthYear(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                  <span className="text-xs font-bold text-sky-400 tabular-nums">{birthYear}</span>
                </div>
              </div>

              {/* Gender Selector */}
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Table Insee
                </label>
                <div className="grid grid-cols-3 gap-1 bg-slate-950/90 p-1 rounded-xl border border-white/10 text-xs">
                  {(['M', 'F', 'X'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`py-1 rounded-lg font-medium transition-colors ${
                        gender === g ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {g === 'M' ? 'H' : g === 'F' ? 'F' : 'Mix'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Add comparison name form */}
            <form onSubmit={handleAddSubmit} className="flex gap-2 pt-1">
              <input
                type="text"
                value={compareInput}
                onChange={(e) => setCompareInput(e.target.value)}
                placeholder="Comparer avec un autre prénom (ex: Alexandre, Kevin, Sandrine, Augustin)..."
                className="flex-1 bg-slate-950/90 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter</span>
              </button>
            </form>
          </div>

          {/* Quick Cohort Suggestions */}
          <div className="pt-3 border-t border-white/[0.06]">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Suggestions populaires de la cohorte {birthYear} :</span>
              <button
                type="button"
                onClick={onOpenTopNames}
                className="text-sky-400 hover:text-sky-300 transition-colors"
              >
                Explorer le palmarès complet →
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestedNames.slice(0, 7).map((name) => {
                const sugStats = computeNameStats(name, birthYear);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => onAddComparisonName(name)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs border border-white/[0.07] transition-colors"
                  >
                    <Plus className="w-3 h-3 text-sky-400" />
                    <span>{name}</span>
                    {sugStats.popularityTrend === 'up' ? (
                      <TrendingUp className="w-3 h-3 text-emerald-400" />
                    ) : sugStats.popularityTrend === 'down' ? (
                      <TrendingDown className="w-3 h-3 text-rose-400" />
                    ) : (
                      <Minus className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bento Card 2 (5 cols): Spotlight Actuarial Focus Card */}
        <div className="lg:col-span-5 bento-card p-5 sm:p-6 flex flex-col justify-between">
          {selectedName ? (
            <>
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: selectedName.colorHex }}
                    />
                    <h3 className="text-xl font-bold text-white section-heading">
                      {selectedName.queryName}
                    </h3>
                    {selectedName.popularityTrend === 'up' ? (
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    ) : selectedName.popularityTrend === 'down' ? (
                      <TrendingDown className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Minus className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <span className="text-xs text-slate-400 tabular-nums">
                    Rang #{selectedName.rankInBirthYear} en {selectedName.birthYear} ·{' '}
                    <strong
                      className={
                        selectedName.popularityTrend === 'up'
                          ? 'text-emerald-400'
                          : selectedName.popularityTrend === 'down'
                            ? 'text-rose-400'
                            : 'text-slate-300'
                      }
                    >
                      {selectedName.popularityDeltaPercent > 0
                        ? `+${selectedName.popularityDeltaPercent}%`
                        : `${selectedName.popularityDeltaPercent}%`}{' '}
                      vs {selectedName.birthYear - 1}
                    </strong>
                  </span>
                </div>

                {/* Big KPIs */}
                <div className="grid grid-cols-2 gap-3 my-4">
                  <div className="bg-slate-950/70 p-3.5 rounded-xl border border-white/[0.06]">
                    <div className="text-xs text-slate-400">Espérance de vie estimée</div>
                    <div className="text-2xl font-extrabold text-white mt-0.5 tabular-nums">
                      {selectedName.adjustedLifeExpectancy}{' '}
                      <span className="text-xs font-normal text-slate-400">ans</span>
                    </div>
                    <div
                      className={`text-xs font-medium mt-1 tabular-nums ${
                        selectedName.adjustedLifeExpectancy - selectedName.cohortLifeExpBaseline >= 0
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {selectedName.adjustedLifeExpectancy - selectedName.cohortLifeExpBaseline >= 0
                        ? `+${(selectedName.adjustedLifeExpectancy - selectedName.cohortLifeExpBaseline).toFixed(1)}`
                        : (selectedName.adjustedLifeExpectancy - selectedName.cohortLifeExpBaseline).toFixed(1)}{' '}
                      ans vs moyenne cohorte
                    </div>
                  </div>

                  <div className="bg-slate-950/70 p-3.5 rounded-xl border border-white/[0.06]">
                    <div className="text-xs text-slate-400">Taux de survie en {REFERENCE_YEAR}</div>
                    <div className="text-2xl font-extrabold text-emerald-400 mt-0.5 tabular-nums">
                      {selectedName.adjustedSurvivalRate}%
                    </div>
                    <div className="text-xs text-slate-400 mt-1 tabular-nums">
                      ~{selectedName.birthsEstimated.toLocaleString('fr-FR')} naissances en {selectedName.birthYear}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.06]">
                <div className="flex items-center justify-between text-xs font-semibold text-sky-400 mb-1">
                  <span>{selectedName.socioTitle}</span>
                  <span className="font-mono text-slate-400 tabular-nums">
                    Hazard Ratio : {selectedName.mortalityHazardRatio}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedName.socioDescription}
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">
              Sélectionnez ou ajoutez un prénom pour afficher son focus actuariel.
            </div>
          )}
        </div>

        {/* Bento Row 2 (12 cols): Multi-Name Bento Cards Grid */}
        <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {names.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            const diff = item.adjustedLifeExpectancy - item.cohortLifeExpBaseline;
            return (
              <div
                key={`${item.normalizedName}-${idx}`}
                onClick={() => setSelectedIndex(idx)}
                className={`bento-card p-4 cursor-pointer flex flex-col justify-between transition-all ${
                  isSelected ? 'ring-1 ring-sky-500/70 bg-slate-900/90' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.colorHex }}
                      />
                      <h4 className="font-bold text-white text-base truncate">{item.queryName}</h4>
                      {item.popularityTrend === 'up' ? (
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : item.popularityTrend === 'down' ? (
                        <TrendingDown className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      ) : (
                        <Minus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveComparisonName(idx);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
                      title={`Supprimer ${item.queryName}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between tabular-nums">
                    <div>
                      <span className="text-2xl font-extrabold text-white">
                        {item.adjustedLifeExpectancy}
                      </span>
                      <span className="text-xs text-slate-400 ml-1">ans (e₀)</span>
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        diff >= 0 ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)} a
                    </span>
                  </div>

                  {/* Survival Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1 tabular-nums">
                      <span>Survie en {REFERENCE_YEAR}</span>
                      <strong className="text-slate-200">{item.adjustedSurvivalRate}%</strong>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(5, item.adjustedSurvivalRate))}%`,
                          backgroundColor: item.colorHex,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
                  <span>{item.socioTitle}</span>
                  <span
                    className={
                      item.popularityTrend === 'up'
                        ? 'text-emerald-400 font-medium'
                        : item.popularityTrend === 'down'
                          ? 'text-rose-400 font-medium'
                          : 'text-slate-400'
                    }
                  >
                    Pop. {item.popularityDeltaPercent > 0 ? `+${item.popularityDeltaPercent}%` : `${item.popularityDeltaPercent}%`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

