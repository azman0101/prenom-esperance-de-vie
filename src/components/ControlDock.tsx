import React, { useState } from 'react';
import { Plus, X, RotateCw, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  NameStats,
  Manifest,
  cleanName,
  observationLabel,
  clampBirthYear,
} from '../data/demographics';
import { YearInput } from './YearInput';

export interface ControlDockProps {
  names: NameStats[];
  manifest: Manifest;
  suggestions: string[];
  userPrimaryName: string;
  setUserPrimaryName: (name: string) => void;
  birthYear: number;
  setBirthYear: (year: number) => void;
  gender: 'M' | 'F' | 'X';
  setGender: (gender: 'M' | 'F' | 'X') => void;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  onAddComparisonName: (name: string) => void;
  onRemoveComparisonName: (index: number) => void;
  isAutoRotate: boolean;
  setIsAutoRotate: (enabled: boolean) => void;
  viewMode: 'overview' | 'comparison' | 'closeUp';
  setViewMode: (mode: 'overview' | 'comparison' | 'closeUp') => void;
  onTriggerCameraReset?: () => void;
  onOpenTopNames: () => void;
}
export const YearControl: React.FC<{
  year: number;
  years: number[];
  onChange: (year: number) => void;
}> = ({ year, years, onChange }) => (
  <div className="flex items-center gap-2">
    <button
      type="button"
      title="Année précédente"
      onClick={() => onChange(clampBirthYear(year - 1, years))}
    >
      <ChevronLeft className="w-4 h-4" />
    </button>
    <label className="text-sm text-slate-300">
      Cohorte{' '}
      <YearInput
        ariaLabel="Année de naissance"
        year={year}
        years={years}
        onChange={onChange}
        className="bg-slate-950 rounded-lg p-2 w-24 text-sky-300 border border-white/10"
      />
    </label>
    <button
      type="button"
      title="Année suivante"
      onClick={() => onChange(clampBirthYear(year + 1, years))}
    >
      <ChevronRight className="w-4 h-4" />
    </button>
  </div>
);
export const StatsCard: React.FC<{ item: NameStats }> = ({ item }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.colorHex }} />
      <h3 className="text-xl font-semibold">{item.queryName}</h3>
      <span className="text-slate-400 text-xs">
        {item.gender} · {item.birthYear}
      </span>
    </div>
    <div>
      <p className="text-xs text-slate-400">
        Âge moyen au décès projeté, si vivant à {item.currentAge} an{item.currentAge > 1 ? 's' : ''}
      </p>
      <p className="text-3xl text-sky-300 font-bold tabular-nums">
        {item.projection.expectedAge.toFixed(1)} <span className="text-sm">ans</span>
      </p>
      <p className="text-sm text-slate-300">
        Soit {item.projection.remainingYears.toFixed(1)} années restantes en moyenne
      </p>
    </div>
    <p className="text-xs text-amber-200">
      Référence INSEE par âge et sexe, mortalité {item.projection.tableYear} : identique pour tous
      les prénoms de même sexe et de même cohorte.
    </p>
    {item.births === null && (
      <p className="text-xs text-slate-400">Prénom non diffusé pour ce sexe et cette année.</p>
    )}
    <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-3">
      <div>
        <p className="text-xs text-slate-400">Naissances publiées · arrondies à 5</p>
        <strong>{item.births?.toLocaleString('fr') ?? 'Non diffusé'}</strong>
        <p className="text-xs text-slate-400">Rang officiel : {item.rank ?? '—'}</p>
      </div>
      <div>
        <p className="text-xs text-slate-400">Survie estimée au {item.observedThrough}</p>
        <strong className="text-emerald-300">{observationLabel(item)}</strong>
      </div>
    </div>
    {item.observation && item.observation.variants > 1 && (
      <p className="text-xs text-slate-400">
        Survie et tendance : {item.observation.variants} graphies rapprochées,{' '}
        {item.observation.births.toLocaleString('fr')} naissances regroupées.
      </p>
    )}
    {item.observation?.earlyCoverageWarning && (
      <p className="text-xs text-amber-200">
        Les premiers fichiers de décès ({item.coverage.from} à {item.coverage.incompleteThrough})
        présentent des lacunes.
      </p>
    )}
    <p className="text-xs text-slate-400">
      Tendance vs {item.birthYear - 1} :{' '}
      {item.popularityDeltaPercent === null
        ? 'non calculable (année précédente non diffusée)'
        : (item.popularityDeltaPercent > 0 ? '+' : '') + item.popularityDeltaPercent + ' %'}
    </p>
  </div>
);

export const ControlDock: React.FC<ControlDockProps> = (props) => (
  <div className="absolute bottom-4 inset-x-4 pointer-events-none flex justify-center">
    <div className="sticky-glass-dock rounded-2xl p-3 pointer-events-auto max-w-4xl w-full flex items-center gap-3 flex-wrap">
      {props.names.map((item, index) => (
        <button
          type="button"
          key={index}
          onClick={() => props.setSelectedIndex(index)}
          className={
            'rounded-lg px-3 py-2 text-sm ' +
            (index === props.selectedIndex ? 'bg-sky-900/70' : 'bg-slate-950/80')
          }
          style={{ color: item.colorHex }}
        >
          {item.queryName} · {item.projection.expectedAge.toFixed(1)} ans projetés
        </button>
      ))}
      <button
        type="button"
        className="p-2 text-sky-300"
        aria-label="Rotation automatique"
        aria-pressed={props.isAutoRotate}
        onClick={() => props.setIsAutoRotate(!props.isAutoRotate)}
      >
        <RotateCw className="w-4 h-4" />
      </button>
      <select
        aria-label="Vue 3D"
        value={props.viewMode}
        className="bg-slate-950 rounded p-2 text-xs"
        onChange={(e) => {
          props.setViewMode(e.target.value as ControlDockProps['viewMode']);
          props.onTriggerCameraReset?.();
        }}
      >
        <option value="overview">Vue d’ensemble</option>
        <option value="comparison">Comparaison</option>
        <option value="closeUp">Détail</option>
      </select>
      <button type="button" className="text-xs text-sky-300" onClick={props.onOpenTopNames}>
        Choisir au palmarès
      </button>
    </div>
  </div>
);

export const BentoComparatorSection: React.FC<ControlDockProps> = (props) => {
  const [input, setInput] = useState('');
  const selected = props.names[props.selectedIndex] ?? props.names[0];
  const options = [...new Set(props.suggestions)]
    .filter((n) => cleanName(n).startsWith(cleanName(input)))
    .slice(0, 30);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
      <div>
        <p className="text-sm text-sky-400">01. Comparer à âge et sexe connus</p>
        <h2 className="text-3xl font-bold mt-2">Prénoms, survie & longévité projetée</h2>
        <p className="text-sm text-slate-400 mt-2">
          Une projection statistique et ses hypothèses, accompagnées des observations disponibles.
        </p>
      </div>
      <div className="bento-card p-5 flex flex-wrap gap-5 items-end">
        <YearControl
          year={props.birthYear}
          years={props.manifest.birthYears}
          onChange={props.setBirthYear}
        />
        <label className="text-xs text-slate-400">
          Votre prénom
          <input
            aria-label="Votre prénom"
            value={props.userPrimaryName}
            onChange={(e) => props.setUserPrimaryName(e.target.value)}
            className="block mt-1 bg-slate-950 border border-white/10 rounded-lg p-2 text-white"
          />
        </label>
        <label className="text-xs text-slate-400">
          Sexe du premier prénom
          <select
            aria-label="Sexe du premier prénom"
            value={props.gender}
            onChange={(e) => props.setGender(e.target.value as 'M' | 'F' | 'X')}
            className="block mt-1 bg-slate-950 rounded-lg p-2 text-white"
          >
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
            <option value="X">Le plus fréquent dans les données</option>
          </select>
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            props.onAddComparisonName(input);
            setInput('');
          }}
          className="flex items-end gap-2"
        >
          <label className="text-xs text-slate-400">
            Ajouter un prénom
            <input
              aria-label="Ajouter un prénom"
              list="official-names"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="block mt-1 bg-slate-950 border border-white/10 rounded-lg p-2 text-white"
            />
          </label>
          <datalist id="official-names">
            {options.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <button
            type="submit"
            aria-label="Ajouter au comparateur"
            className="p-3 bg-sky-700 rounded-lg"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {props.names.map((item, index) => (
          <article
            key={index}
            className={
              'bento-card p-5 relative ' +
              (index === props.selectedIndex ? 'ring-1 ring-sky-500/50' : '')
            }
          >
            <div className="flex justify-end gap-2 mb-2">
              <button
                type="button"
                className="text-xs text-sky-300"
                onClick={() => props.setSelectedIndex(index)}
              >
                Sélectionner
              </button>
              <button
                type="button"
                aria-label={'Retirer ' + item.queryName}
                onClick={() => props.onRemoveComparisonName(index)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <StatsCard item={item} />
          </article>
        ))}
      </div>
      {!selected && (
        <p className="text-slate-400">Ajoutez un prénom pour commencer la comparaison.</p>
      )}
    </div>
  );
};
