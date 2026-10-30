import React, { useState } from 'react';
import {
  NameStats,
  Manifest,
  ageFromBirthYear,
  projectedSurvival,
  survivalAtYear,
} from '../data/demographics';
import { YearControl } from './ControlDock';
interface SurvivalCurveModalProps {
  names: NameStats[];
  birthYear: number;
  setBirthYear: (year: number) => void;
  manifest: Manifest;
}
export const SurvivalCurveModal: React.FC<SurvivalCurveModalProps> = ({
  names,
  birthYear,
  setBirthYear,
  manifest,
}) => {
  const [inspectedAge, setInspectedAge] = useState<number | null>(null);
  const [conditional, setConditional] = useState(false);
  const cutoffYear = Number(manifest.deathsThrough.slice(0, 4));
  const observedAge = cutoffYear - birthYear;
  const startAge = conditional ? ageFromBirthYear(birthYear) : 0;
  const maxAge = Math.max(
    110,
    startAge + 15,
    ...names.map((n) => Math.ceil(n.projection.expectedAge + 15)),
  );
  const x = (age: number) => 55 + ((age - startAge) * 700) / Math.max(1, maxAge - startAge);
  const y = (survival: number) => 290 - survival * 2.4;
  const path = (points: [number, number][]) =>
    points.map(([a, s], i) => (i ? 'L' : 'M') + x(a).toFixed(2) + ',' + y(s).toFixed(2)).join(' ');
  const projected = (item: NameStats, age: number) => {
    const anchorAge = conditional ? item.currentAge : observedAge;
    const anchorSurvival = conditional ? 100 : item.observedSurvival;
    return anchorSurvival === null
      ? null
      : anchorSurvival * projectedSurvival(item.projection, anchorAge, age);
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-5">
      <div>
        <p className="text-sm text-sky-400">02. Observations et hypothèses</p>
        <h2 className="text-3xl font-bold mt-2">Courbes de survie · cohorte {birthYear}</h2>
        <p className="text-sm text-slate-400 mt-2">
          Trait plein : décès enregistrés au {manifest.deathsThrough}. Pointillés : projection aux
          conditions de mortalité {manifest.mortality.year}.
        </p>
      </div>
      <div className="flex flex-wrap gap-5 items-center">
        <YearControl year={birthYear} years={manifest.birthYears} onChange={setBirthYear} />
        <label className="text-sm text-slate-300 flex gap-2">
          <input
            type="checkbox"
            checked={conditional}
            onChange={(e) => {
              setConditional(e.target.checked);
              setInspectedAge(null);
            }}
          />
          Projection conditionnelle : vivant à l’âge actuel
        </label>
      </div>
      <div className="bento-card p-4 sm:p-6">
        <svg
          viewBox="0 0 800 340"
          role="img"
          aria-label="Survie observée et projetée selon l’âge"
          className="w-full"
          onMouseLeave={() => setInspectedAge(null)}
          onMouseMove={(e) => {
            const bounds = e.currentTarget.getBoundingClientRect();
            const age = Math.round(
              startAge +
                ((((e.clientX - bounds.left) * 800) / bounds.width - 55) / 700) *
                  (maxAge - startAge),
            );
            setInspectedAge(Math.max(startAge, Math.min(maxAge, age)));
          }}
        >
          {[0, 25, 50, 75, 100].map((t) => (
            <g key={t}>
              <line x1="55" x2="755" y1={y(t)} y2={y(t)} stroke="#334155" strokeWidth="0.6" />
              <text x="43" y={y(t) + 4} textAnchor="end" fill="#94a3b8" fontSize="11">
                {t}%
              </text>
            </g>
          ))}
          {Array.from(
            { length: Math.floor((maxAge - startAge) / 10) + 1 },
            (_, i) => startAge + i * 10,
          ).map((age) => (
            <text key={age} x={x(age)} y="312" textAnchor="middle" fill="#94a3b8" fontSize="11">
              {age}
            </text>
          ))}
          <text x="400" y="335" textAnchor="middle" fill="#94a3b8" fontSize="12">
            Âge atteint dans l’année (approximatif)
          </text>
          {names.map((item, i) => {
            const observed: [number, number][] = [];
            if (!conditional && item.observation?.status === 'available') {
              observed.push([0, 100]);
              for (let year = birthYear; year <= cutoffYear; year++)
                observed.push([year - birthYear, survivalAtYear(item.observation, year)!]);
            }
            const anchor = conditional ? item.currentAge : observedAge;
            const future: [number, number][] = [];
            if (conditional || item.observedSurvival !== null)
              for (let age = Math.max(anchor, startAge); age <= maxAge; age++)
                future.push([age, projected(item, age)!]);
            return (
              <g key={i}>
                <path d={path(observed)} stroke={item.colorHex} fill="none" strokeWidth="2.5" />
                <path
                  d={path(future)}
                  stroke={item.colorHex}
                  fill="none"
                  strokeWidth="2.5"
                  strokeDasharray="6 5"
                />
              </g>
            );
          })}
          {inspectedAge !== null && (
            <line
              x1={x(inspectedAge)}
              x2={x(inspectedAge)}
              y1="45"
              y2="290"
              stroke="#f8fafc"
              strokeDasharray="3 3"
            />
          )}
        </svg>
        <div className="flex flex-wrap gap-4 text-xs">
          {names.map((item, i) => {
            const age = inspectedAge ?? (conditional ? item.currentAge : observedAge);
            const value =
              !conditional && age <= observedAge && item.observation
                ? survivalAtYear(item.observation, birthYear + age)
                : projected(item, age);
            return (
              <span key={i} style={{ color: item.colorHex }}>
                {item.queryName} · {age} ans :{' '}
                {value === null ? 'indisponible' : value.toFixed(1) + ' %'}
              </span>
            );
          })}
        </div>
        {!conditional && names.some((n) => n.observedSurvival === null) && (
          <p className="text-xs text-amber-200 mt-4">
            Certaines observations ne sont pas disponibles. Le mode conditionnel permet de consulter
            leur projection de référence.
          </p>
        )}
      </div>
      <p className="text-xs text-slate-400">
        La dernière année observée peut être partielle. Les projections appliquent la mortalité
        nationale par âge et sexe, maintenue constante : elles sont identiques pour tous les prénoms
        de même sexe ; seules les observations distinguent les prénoms, sans effet causal démontré.
      </p>
    </div>
  );
};
