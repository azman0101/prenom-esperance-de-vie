import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, X, RotateCw, Sparkles, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { ComputedNameStats, getTopNamesForYear } from '../data/demographics';

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
      className={`fixed left-1/2 -translate-x-1/2 z-20 w-[94vw] max-w-[940px] transition-all duration-300 ease-out`}
      style={{
        bottom: isCollapsed ? '-260px' : '16px',
      }}
    >
      {/* Collapse Toggle Tab */}
      <div className="flex justify-center mb-1">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-t-lg bg-[#0f172a] hover:bg-[#1e293b] text-slate-300 hover:text-white border-t border-x border-slate-700 text-xs font-medium shadow-md transition-colors"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-sky-400" />
              <span>Afficher les contrôles & prénoms</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Mode Zen / Plein Écran 3D</span>
            </>
          )}
        </button>
      </div>

      {/* Main Solid Dock Surface (No backdrop-blur to preserve WebGL framerate) */}
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl p-3 sm:p-4 text-white">
        {/* Dock Subtabs & Comparison Chips */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          {/* Subtabs */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveSubTab('details')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeSubTab === 'details'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: selectedName?.colorHex || '#38bdf8' }}
              />
              <span>Détails ({selectedName?.queryName})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('profile')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeSubTab === 'profile'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Votre Prénom & Âge
            </button>
            <button
              onClick={() => setActiveSubTab('compare')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeSubTab === 'compare'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Comparateur ({names.length})
            </button>
            <button
              onClick={() => setActiveSubTab('camera')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
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
            {names.map((item, idx) => {
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
                      ? 'bg-sky-950 text-white border-sky-500 shadow-sm'
                      : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: item.colorHex }}
                  />
                  <span>{item.queryName}</span>
                  <span className="text-[10px] text-sky-400 font-bold">
                    {item.adjustedLifeExpectancy}a
                  </span>
                  {names.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveComparisonName(idx);
                      }}
                      className="text-slate-400 hover:text-red-400 ml-1"
                      title="Retirer ce prénom"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tab 0: Detailed Actuarial Breakdown for Selected Name */}
        {activeSubTab === 'details' && selectedName && (
          <div className="pt-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs">
            {/* Column 1: Identity, Interactive Year & Rank */}
            <div className="md:col-span-3 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: selectedName.colorHex }}
                  />
                  <h3 className="font-bold text-base text-white truncate">{selectedName.queryName}</h3>
                </div>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                  {selectedName.gender === 'F' ? 'Féminin' : selectedName.gender === 'M' ? 'Masculin' : 'Mixte'}
                </span>
              </div>

              {/* Inline Birth Year Stepper */}
              <div className="flex items-center justify-between gap-1.5 mt-1.5 bg-slate-950/90 px-2 py-1 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-400">Né(e) en :</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setBirthYear(Math.max(1920, birthYear - 1))}
                    className="p-0.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
                    title="Année précédente"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min={1920}
                    max={2024}
                    value={birthYear}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (!Number.isNaN(val)) setBirthYear(Math.min(2024, Math.max(1920, val)));
                    }}
                    className="w-14 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-[11px] font-bold text-center text-sky-400"
                  />
                  <button
                    onClick={() => setBirthYear(Math.min(2024, birthYear + 1))}
                    className="p-0.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
                    title="Année suivante"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-[10px] text-slate-400">({selectedName.currentAge}a)</span>
              </div>

              <div className="text-[11px] text-amber-300 mt-1 font-medium truncate">
                Rang en {selectedName.birthYear} : #{selectedName.rankInBirthYear} (~{selectedName.birthsEstimated.toLocaleString('fr-FR')} nais.)
              </div>
            </div>

            {/* Column 2: Life Expectancy & Survival Rate */}
            <div className="md:col-span-4 grid grid-cols-2 gap-2">
              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400">Espérance de vie</div>
                <div className="text-lg font-extrabold text-white">
                  {selectedName.adjustedLifeExpectancy} <span className="text-xs font-normal text-slate-400">ans</span>
                </div>
                <div className={`text-[10px] font-semibold mt-0.5 ${isPositiveDelta ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isPositiveDelta ? `+${delta.toFixed(1)}` : delta.toFixed(1)} ans vs cohorte
                </div>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400">Survie à ce jour</div>
                <div className="text-lg font-extrabold text-emerald-400">
                  {selectedName.adjustedSurvivalRate}%
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Décès : {(100 - selectedName.adjustedSurvivalRate).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Column 3: Sociological Profile & Famous Figures */}
            <div className="md:col-span-5 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-[11px] font-semibold text-sky-400 mb-0.5">
                <span>{selectedName.socioTitle}</span>
                <span className="text-[10px] text-slate-400">HR : {selectedName.mortalityHazardRatio}</span>
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
        )}

        {/* Tab 1: Profile & Birth Year Controls */}
        {activeSubTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 items-center">
            {/* First Name Input */}
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
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Birth Year Slider + Input */}
            <div className="md:col-span-5">
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-1">
                <span>Année de naissance : <strong className="text-sky-400 font-bold">{birthYear}</strong></span>
                <span>Âge actuel : <strong className="text-white">{2026 - birthYear} ans</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={1925}
                  max={2024}
                  value={birthYear}
                  onChange={(e) => setBirthYear(Number(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
                <input
                  type="number"
                  min={1920}
                  max={2024}
                  value={birthYear}
                  onChange={(e) => setBirthYear(Number(e.target.value))}
                  className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-center text-white"
                />
              </div>
            </div>

            {/* Gender Toggle */}
            <div className="md:col-span-3">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Sexe pour tables Insee
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
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
            {/* Input to add any name */}
            <form onSubmit={handleAddSubmit} className="flex gap-2">
              <input
                type="text"
                value={compareInput}
                onChange={(e) => setCompareInput(e.target.value)}
                placeholder="Ajouter un prénom à comparer (ex: Alexandre, Kevin, Marie, Augustin)..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter</span>
              </button>
            </form>

            {/* Quick Suggestions for this cohort */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Prénoms contemporains très attribués en {birthYear} :
                </span>
                <button
                  onClick={onOpenTopNames}
                  className="text-sky-400 hover:underline text-[11px]"
                >
                  Voir tout le palmarès
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestedNames.slice(0, 6).map((name) => (
                  <button
                    key={name}
                    onClick={() => onAddComparisonName(name)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700/60 transition-colors"
                  >
                    <Plus className="w-3 h-3 text-sky-400" />
                    <span>{name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: 3D Camera & Presentation Modes */}
        {activeSubTab === 'camera' && (
          <div className="pt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">Navigation 3D libre (Clic gauche : orbiter • Clic droit : déplacer) :</span>
              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                <button
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
                  onClick={() => {
                    setViewMode('closeUp');
                    onTriggerCameraReset?.();
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    viewMode === 'closeUp' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Focus sur {names[selectedIndex]?.queryName}
                </button>
              </div>
            </div>

            {/* Auto Rotate Toggle */}
            <button
              onClick={() => setIsAutoRotate(!isAutoRotate)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                isAutoRotate
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
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
