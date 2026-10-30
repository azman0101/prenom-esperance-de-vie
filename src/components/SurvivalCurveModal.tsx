import React, { useState } from 'react';
import { X, TrendingDown, Info, ShieldCheck, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { ComputedNameStats } from '../data/demographics';

interface SurvivalCurveModalProps {
  names: ComputedNameStats[];
  birthYear: number;
  setBirthYear: (year: number) => void;
  onClose: () => void;
}

export const SurvivalCurveModal: React.FC<SurvivalCurveModalProps> = ({
  names,
  birthYear,
  setBirthYear,
  onClose,
}) => {
  const currentAge = 2026 - birthYear;
  const [hoveredAge, setHoveredAge] = useState<number | null>(currentAge);
  const clampYear = (y: number) => Math.min(2024, Math.max(1920, y));

  // Generate survival curve points from age 0 to 100
  // Standard Gompertz-Makeham mortality model parameterized by cohort life tables & hazard ratio
  const ages = Array.from({ length: 21 }, (_, i) => i * 5); // 0, 5, 10, ... 100

  const getSurvivalAtAge = (age: number, lifeExp: number, hazardRatio: number): number => {
    if (age === 0) return 100;
    // Standard survival curve model: S(x) = exp( - (x / theta)^beta * HR )
    // Where theta is modal age at death (~ lifeExp + 3) and beta is Gompertz shape (~8.5)
    const theta = lifeExp + 3;
    const beta = 7.8;
    const standardCumHazard = Math.pow(age / theta, beta);
    const s = Math.exp(-standardCumHazard * hazardRatio);
    return Math.round(s * 1000) / 10;
  };

  // SVG Chart Dimensions
  const svgWidth = 720;
  const svgHeight = 320;
  const padding = { top: 30, right: 40, bottom: 45, left: 55 };
  const chartW = svgWidth - padding.left - padding.right;
  const chartH = svgHeight - padding.top - padding.bottom;

  const xScale = (age: number) => padding.left + (age / 100) * chartW;
  const yScale = (pct: number) => padding.top + ((100 - pct) / 100) * chartH;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col text-white overflow-hidden">
        {/* Header with Year Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-sky-400" />
              Courbes de Survie par Prénom • Cohorte {birthYear}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Évolution de la proportion de personnes vivantes au fil des âges (Tables Insee & Coulmont)
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Inline Year Selector */}
            <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-xs text-slate-400">Année :</span>
              <button
                onClick={() => setBirthYear(clampYear(birthYear - 5))}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300"
                title="-5 ans"
              >
                -5
              </button>
              <button
                onClick={() => setBirthYear(clampYear(birthYear - 1))}
                className="p-0.5 rounded hover:bg-slate-800 text-slate-300"
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
                className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-bold text-center text-sky-400"
              />
              <button
                onClick={() => setBirthYear(clampYear(birthYear + 1))}
                className="p-0.5 rounded hover:bg-slate-800 text-slate-300"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setBirthYear(clampYear(birthYear + 5))}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300"
                title="+5 ans"
              >
                +5
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* SVG Chart */}
          <div className="bg-slate-950 p-3 sm:p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold text-slate-200">
                Taux de survie cumulé (%) en fonction de l’âge
              </span>
              <span className="text-sky-400">
                Ligne pointillée : Âge actuel en 2026 ({currentAge} ans)
              </span>
            </div>

            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto min-w-[550px] select-none"
              >
                {/* Horizontal Grid lines */}
                {[0, 25, 50, 75, 100].map((val) => {
                  const y = yScale(val);
                  return (
                    <g key={val}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={svgWidth - padding.right}
                        y2={y}
                        stroke="#1e293b"
                        strokeDasharray={val === 0 || val === 100 ? undefined : '4 4'}
                        strokeWidth={1}
                      />
                      <text
                        x={padding.left - 10}
                        y={y + 4}
                        fill="#64748b"
                        fontSize="11"
                        textAnchor="end"
                      >
                        {val}%
                      </text>
                    </g>
                  );
                })}

                {/* Vertical Age Grid lines */}
                {[0, 20, 40, 60, 80, 100].map((ageVal) => {
                  const x = xScale(ageVal);
                  return (
                    <g key={ageVal}>
                      <line
                        x1={x}
                        y1={padding.top}
                        x2={x}
                        y2={svgHeight - padding.bottom}
                        stroke="#1e293b"
                        strokeWidth={1}
                      />
                      <text
                        x={x}
                        y={svgHeight - padding.bottom + 18}
                        fill="#64748b"
                        fontSize="11"
                        textAnchor="middle"
                      >
                        {ageVal} ans
                      </text>
                    </g>
                  );
                })}

                {/* Current Age Line Indicator */}
                {currentAge <= 100 && (
                  <g>
                    <line
                      x1={xScale(currentAge)}
                      y1={padding.top}
                      x2={xScale(currentAge)}
                      y2={svgHeight - padding.bottom}
                      stroke="#38bdf8"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                    />
                    <circle
                      cx={xScale(currentAge)}
                      cy={padding.top + 6}
                      r={4}
                      fill="#38bdf8"
                    />
                    <text
                      x={xScale(currentAge)}
                      y={padding.top - 8}
                      fill="#38bdf8"
                      fontSize="11"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      Aujourd'hui ({currentAge}a)
                    </text>
                  </g>
                )}

                {/* Survival Curves for each name */}
                {names.map((item, idx) => {
                  const points = ages.map((a) => {
                    const s = getSurvivalAtAge(a, item.adjustedLifeExpectancy, item.mortalityHazardRatio);
                    return `${xScale(a)},${yScale(s)}`;
                  }).join(' ');

                  const sAtCurrent = getSurvivalAtAge(currentAge, item.adjustedLifeExpectancy, item.mortalityHazardRatio);

                  return (
                    <g key={idx}>
                      {/* Path line */}
                      <polyline
                        fill="none"
                        stroke={item.colorHex}
                        strokeWidth={2.8}
                        points={points}
                      />

                      {/* Current Age Dot */}
                      {currentAge <= 100 && (
                        <circle
                          cx={xScale(currentAge)}
                          cy={yScale(sAtCurrent)}
                          r={5}
                          fill={item.colorHex}
                          stroke="#ffffff"
                          strokeWidth={1.5}
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Chart Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-3 pt-3 border-t border-slate-800">
              {names.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.colorHex }}
                  />
                  <span className="font-semibold text-white">{item.queryName}</span>
                  <span className="text-slate-400">
                    ({item.adjustedLifeExpectancy} ans • Survie actuelle : {item.adjustedSurvivalRate}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Comparative Matrix Table */}
          <div>
            <h3 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Tableau Comparatif & Indicateurs Sociodémographiques
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Prénom</th>
                    <th className="py-2.5 px-3">Espérance e₀</th>
                    <th className="py-2.5 px-3">Écart vs Cohorte</th>
                    <th className="py-2.5 px-3">Survie à {currentAge} ans</th>
                    <th className="py-2.5 px-3">Décès cumulés</th>
                    <th className="py-2.5 px-3">Hazard Ratio (Coulmont)</th>
                    <th className="py-2.5 px-3">Profil Sociologique</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950">
                  {names.map((item, idx) => {
                    const diff = item.adjustedLifeExpectancy - item.cohortLifeExpBaseline;
                    return (
                      <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: item.colorHex }}
                          />
                          {item.queryName}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-sky-400">
                          {item.adjustedLifeExpectancy} ans
                        </td>
                        <td
                          className={`py-2.5 px-3 font-medium ${
                            diff >= 0 ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)} ans
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-emerald-400">
                          {item.adjustedSurvivalRate}%
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {(100 - item.adjustedSurvivalRate).toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">
                          {item.mortalityHazardRatio}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {item.socioTitle}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Educational Note on Coulmont Findings */}
          <div className="bg-sky-950/40 border border-sky-800/60 p-4 rounded-xl text-xs text-sky-200 leading-relaxed flex items-start gap-3">
            <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block font-semibold mb-1">
                L'observation de Baptiste Coulmont sur les fichiers Insee Parquet :
              </strong>
              Les prénoms ne causent évidemment pas directement la longévité ; ils constituent un
              remarquable marqueur sociodémographique de la famille et du milieu de socialisation.
              Les prénoms bourgeois traditionnels et diplômés (Alexandre, Augustin, Guillaume, Marie, Sophie)
              affichent des taux de mortalité cumulée inférieurs de 20% à 35% par rapport aux prénoms très
              populaires de la même génération (Kevin, Dylan, Cindy, Johnny), traduisant les inégalités
              sociales d'accès aux soins, de conditions de travail et de mode de vie.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
