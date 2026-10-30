import React from 'react';
import { BarChart3, Box, BookOpen, Users, Compass, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface ShinyHeaderProps {
  birthYear: number;
  setBirthYear: (year: number) => void;
  totalCompared: number;
  activeTab: '3d' | 'curves' | 'topNames';
  setActiveTab: (tab: '3d' | 'curves' | 'topNames') => void;
  onOpenMethodology: () => void;
  onOpenTopNames: () => void;
}

const QUICK_DECADES = [1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];

export const ShinyHeader: React.FC<ShinyHeaderProps> = ({
  birthYear,
  setBirthYear,
  totalCompared,
  activeTab,
  setActiveTab,
  onOpenMethodology,
  onOpenTopNames,
}) => {
  const clampYear = (y: number) => Math.min(2024, Math.max(1920, y));

  return (
    <header className="absolute top-0 left-0 right-0 z-30 bg-[#090d16]/95 border-b border-slate-800 text-white px-4 py-2.5 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        {/* Left: Brand & Global Year Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20 ring-1 ring-white/20 shrink-0">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  Prénoms & Longévité
                  <span className="hidden xl:inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800">
                    Insee & Coulmont
                  </span>
                </h1>
              </div>
              <p className="text-[11px] text-slate-400">
                Observatoire démographique 3D (1920–2024)
              </p>
            </div>
          </div>

          {/* Interactive Global Birth Year Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900/95 px-2.5 py-1 rounded-xl border border-sky-500/40 shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="text-[11px] text-slate-300 font-medium hidden sm:inline">Année :</span>
            <button
              onClick={() => setBirthYear(clampYear(birthYear - 1))}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Année précédente (-1 an)"
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
                if (!Number.isNaN(val)) setBirthYear(clampYear(val));
              }}
              aria-label="Année de naissance globale"
              className="w-16 bg-slate-950 border border-slate-700 focus:border-sky-400 rounded-lg px-1.5 py-0.5 text-xs font-bold text-center text-sky-300 focus:outline-none"
            />
            <button
              onClick={() => setBirthYear(clampYear(birthYear + 1))}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Année suivante (+1 an)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <span className="text-[11px] text-slate-400 pl-1 border-l border-slate-800 whitespace-nowrap">
              Âge : <strong className="text-white">{2026 - birthYear} ans</strong>
            </span>

            {/* Quick Decade Dropdown / Selector */}
            <select
              value={Math.floor(birthYear / 10) * 10}
              onChange={(e) => setBirthYear(Number(e.target.value))}
              aria-label="Choisir une décennie"
              className="ml-1 bg-slate-800 hover:bg-slate-700 text-[11px] text-sky-300 font-medium rounded-lg px-2 py-1 border border-slate-700 cursor-pointer focus:outline-none"
              title="Accès rapide par décennie"
            >
              <option value={1920}>Années 1920</option>
              <option value={1930}>Années 1930</option>
              <option value={1940}>Années 1940</option>
              <option value={1950}>Années 1950</option>
              <option value={1960}>Années 1960</option>
              <option value={1970}>Années 1970</option>
              <option value={1980}>Années 1980</option>
              <option value={1990}>Années 1990</option>
              <option value={2000}>Années 2000</option>
              <option value={2010}>Années 2010</option>
              <option value={2020}>Années 2020</option>
            </select>
          </div>
        </div>

        {/* Right: Tab Navigation (Shiny Style) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('3d')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === '3d'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Piliers 3D</span>
              <span className="ml-1 text-[10px] bg-slate-800 px-1.5 py-0.2 rounded-full text-slate-300">
                {totalCompared}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('curves')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'curves'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Courbes de Survie</span>
            </button>
          </div>

          <button
            onClick={onOpenTopNames}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors whitespace-nowrap"
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Top Prénoms {birthYear}</span>
            <span className="sm:hidden">Top {birthYear}</span>
          </button>

          <button
            onClick={onOpenMethodology}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors"
            title="Étude sociologique et tables de mortalité Insee"
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Méthode</span>
          </button>
        </div>
      </div>
    </header>
  );
};
