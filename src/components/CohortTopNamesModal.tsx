import React from 'react';
import { Manifest, TopNames } from '../data/demographics';
import { GENERATION_PRESETS } from '../config';
import { YearControl } from './ControlDock';
interface CohortTopNamesModalProps {
  birthYear: number;
  setBirthYear: (year: number) => void;
  manifest: Manifest;
  top: TopNames;
  currentlyCompared: string[];
  onAddName: (name: string) => void;
  onApplyPreset: (names: string[], year?: number) => void;
}
export const CohortTopNamesModal: React.FC<CohortTopNamesModalProps> = (props) => {
  const top = props.top[String(props.birthYear)];
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-5">
      <div>
        <p className="text-sm text-sky-400">03. Naissances officielles</p>
        <h2 className="text-3xl font-bold mt-2">Palmarès des prénoms · {props.birthYear}</h2>
        <p className="text-sm text-slate-400 mt-2">
          Rangs INSEE, année exacte. Effectifs publiés arrondis au multiple de cinq.
        </p>
      </div>
      <YearControl
        year={props.birthYear}
        years={props.manifest.birthYears}
        onChange={props.setBirthYear}
      />
      <div className="grid sm:grid-cols-3 gap-3">
        {GENERATION_PRESETS.filter((p) => props.manifest.birthYears.includes(p.year)).map((p) => (
          <button
            type="button"
            key={p.id}
            className="bento-card text-left p-4 group"
            onClick={() => props.onApplyPreset([...p.names], p.year)}
          >
            <span className={p.titleClass}>
              {p.label} ({p.year})
            </span>
            <p className="text-xs text-slate-400 mt-2">{p.names.join(', ')}</p>
          </button>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        {(['M', 'F'] as const).map((sex) => (
          <div key={sex} className="bento-card p-5">
            <h3 className="font-semibold text-sky-300 mb-3">
              {sex === 'M' ? 'Garçons' : 'Filles'} · {props.birthYear}
            </h3>
            {!top && <p>Palmarès non disponible pour cette année.</p>}
            <ol className="space-y-2">
              {top?.[sex].map(([name, count, rank]) => {
                const added = props.currentlyCompared.some(
                  (n) => n.toLocaleLowerCase('fr') === name.toLocaleLowerCase('fr'),
                );
                return (
                  <li
                    key={name}
                    className="bg-slate-950/70 rounded-lg p-3 flex items-center gap-3 text-sm"
                  >
                    <span className="text-slate-500 w-7">#{rank}</span>
                    <span className="font-semibold flex-1">{name}</span>
                    <span className="text-slate-400 tabular-nums">
                      {count.toLocaleString('fr')}
                    </span>
                    <button
                      type="button"
                      disabled={added}
                      onClick={() => props.onAddName(name)}
                      className="bg-sky-700 disabled:bg-slate-800 rounded-md px-3 py-1 text-xs"
                    >
                      {added ? 'Actif' : 'Ajouter'}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
};
