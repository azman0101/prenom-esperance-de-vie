import React from 'react';
import { BarChart3, Box, BookOpen, Users, Compass, ChevronLeft, ChevronRight, Calendar, LayoutGrid } from 'lucide-react';

export type ScrollySectionId = '3d' | 'bento' | 'curves' | 'topNames' | 'methodology';

interface ShinyHeaderProps {
  birthYear: number;
  setBirthYear: (year: number) => void;
  totalCompared: number;
  activeSection: ScrollySectionId;
  onNavigateSection: (section: ScrollySectionId) => void;
}

export const ShinyHeader: React.FC<ShinyHeaderProps> = ({
  birthYear,
  setBirthYear,
  totalCompared,
  activeSection,
  onNavigateSection,
}) => {
  const clampYear = (y: number) => Math.min(2024, Math.max(1920, y));

  const navItems: { id: ScrollySectionId; label: string; shortLabel: string; icon: React.ReactNode; badge?: number }[] = [
    { id: '3d', label: 'Piliers 3D', shortLabel: '3D', icon: <Box className="w-3.5 h-3.5" />, badge: totalCompared },
    { id: 'bento', label: 'Bento & Comparateur', shortLabel: 'Bento', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { id: 'curves', label: 'Courbes de Survie', shortLabel: 'Survie', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: 'topNames', label: `Palmarès ${birthYear}`, shortLabel: `Top ${birthYear}`, icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'methodology', label: 'Méthodologie', shortLabel: 'Méthode', icon: <BookOpen className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="sticky top-3 z-50 px-3 sm:px-6 pointer-events-none">
      <div className="max-w-7xl mx-auto sticky-glass-dock rounded-2xl lg:rounded-full px-3.5 py-2 sm:px-5 sm:py-2.5 pointer-events-auto flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        {/* Left: Brand & Global Year Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onNavigateSection('3d')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center shadow-md shadow-sky-500/20 ring-1 ring-white/15 shrink-0">
              <Compass className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-semibold tracking-tight text-white whitespace-nowrap">
                  Prénoms & Longévité
                </span>
                <span className="hidden xl:inline-block text-[11px] text-slate-400 font-normal">
                  · Insee & Coulmont
                </span>
              </div>
            </div>
          </button>

          {/* Interactive Global Birth Year Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950/70 px-2.5 py-1 rounded-full border border-white/[0.08]">
            <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Cohorte :</span>
            <button
              type="button"
              onClick={() => setBirthYear(clampYear(birthYear - 1))}
              className="p-1 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
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
              className="w-14 bg-transparent border border-white/10 focus:border-sky-400 rounded-md px-1 py-0.5 text-xs font-bold text-center text-sky-300 tabular-nums focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setBirthYear(clampYear(birthYear + 1))}
              className="p-1 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title="Année suivante (+1 an)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <span className="text-[11px] text-slate-400 pl-1.5 border-l border-white/10 whitespace-nowrap tabular-nums">
              <strong className="text-slate-200">{2026 - birthYear} ans</strong>
            </span>

            {/* Quick Decade Dropdown */}
            <select
              value={Math.floor(birthYear / 10) * 10}
              onChange={(e) => setBirthYear(Number(e.target.value))}
              aria-label="Choisir une décennie"
              className="ml-1 bg-slate-900/90 hover:bg-slate-800 text-[11px] text-sky-300 font-medium rounded-full px-2 py-0.5 border border-white/10 cursor-pointer focus:outline-none"
              title="Accès rapide par décennie"
            >
              <option value={1920}>1920s</option>
              <option value={1930}>1930s</option>
              <option value={1940}>1940s</option>
              <option value={1950}>1950s</option>
              <option value={1960}>1960s</option>
              <option value={1970}>1970s</option>
              <option value={1980}>1980s</option>
              <option value={1990}>1990s</option>
              <option value={2000}>2000s</option>
              <option value={2010}>2010s</option>
              <option value={2020}>2020s</option>
            </select>
          </div>
        </div>

        {/* Right: Proximity-Synced Scrollytelling Navigation */}
        <nav
          aria-label="Navigation par section"
          className="flex items-center gap-1 overflow-x-auto py-0.5 lg:py-0 no-scrollbar"
        >
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigateSection(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-white/12 text-white shadow-sm ring-1 ring-sky-400/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                }`}
              >
                <span className={isActive ? 'text-sky-400' : 'text-slate-400'}>{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{item.shortLabel}</span>
                {item.badge !== undefined && (
                  <span className="ml-0.5 text-[10px] tabular-nums text-sky-300 font-semibold">
                    ({item.badge})
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

