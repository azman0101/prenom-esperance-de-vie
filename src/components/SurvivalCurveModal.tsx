import React, { useState } from 'react';
import { X, TrendingDown, Info, ShieldCheck, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { ComputedNameStats, MAX_BIRTH_YEAR, MIN_BIRTH_YEAR, ageFromBirthYear, clampBirthYear } from '../data/demographics';
import { SURVIVAL_CHART } from '../config';

const { focusLeadYears, yearJump, svg, model } = SURVIVAL_CHART;

interface SurvivalCurveModalProps {
  names: ComputedNameStats[];
  birthYear: number;
  setBirthYear: (year: number) => void;
  onClose?: () => void;
  isInlineSection?: boolean;
}

export const SurvivalCurveModal: React.FC<SurvivalCurveModalProps> = ({
  names,
  birthYear,
  setBirthYear,
  onClose,
  isInlineSection = false,
}) => {
  const currentAge = ageFromBirthYear(birthYear);
  const focusMinAge = Math.max(0, currentAge - focusLeadYears);
  const maxAge = Math.max(SURVIVAL_CHART.minMaxAge, currentAge + SURVIVAL_CHART.maxAgeMargin);

  const [isFocusedRange, setIsFocusedRange] = useState<boolean>(true);
  const [hoveredAge, setHoveredAge] = useState<number | null>(null);

  const minAge = isFocusedRange ? focusMinAge : 0;
  const ageSpan = Math.max(SURVIVAL_CHART.minAgeSpan, maxAge - minAge);

  // Generate 1-year resolution survival curve points from minAge to maxAge
  // Standard Gompertz-Makeham mortality model parameterized by cohort life tables & hazard ratio
  const ages = Array.from({ length: ageSpan + 1 }, (_, i) => minAge + i);

  const getSurvivalAtAge = (age: number, lifeExp: number, hazardRatio: number): number => {
    if (age <= 0) return 100;
    const theta = lifeExp + model.thetaOffset;
    const beta = model.beta;
    const standardCumHazard = Math.pow(age / theta, beta);
    const s = Math.exp(-standardCumHazard * hazardRatio);
    return Math.round(s * 1000) / 10;
  };

  // SVG Chart Dimensions
  const { width: svgWidth, height: svgHeight, padding } = svg;
  const chartW = svgWidth - padding.left - padding.right;
  const chartH = svgHeight - padding.top - padding.bottom;

  const xScale = (age: number) => padding.left + ((age - minAge) / ageSpan) * chartW;
  const yScale = (pct: number) => padding.top + ((100 - pct) / 100) * chartH;

  // Compute clean X-axis ticks starting from minAge up to maxAge
  const tickStep =
    ageSpan <= SURVIVAL_CHART.tickStep.fineMaxSpan ? SURVIVAL_CHART.tickStep.fine : SURVIVAL_CHART.tickStep.coarse;
  const xTicks: number[] = [minAge];
  const firstRoundTick = Math.ceil((minAge + 1) / tickStep) * tickStep;
  for (let t = firstRoundTick; t <= maxAge; t += tickStep) {
    if (t - minAge >= 3 && maxAge - t >= 2) {
      xTicks.push(t);
    }
  }
  if (xTicks[xTicks.length - 1] !== maxAge) {
    xTicks.push(maxAge);
  }

  const inspectedAge = hoveredAge !== null ? hoveredAge : currentAge;

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const svgX = ((e.clientX - rect.left) / rect.width) * svgWidth;
    const ratio = (svgX - padding.left) / chartW;
    const rawAge = Math.round(minAge + ratio * ageSpan);
    if (rawAge >= minAge && rawAge <= maxAge) {
      setHoveredAge(rawAge);
    } else {
      setHoveredAge(null);
    }
  };

  const wrapperClass = isInlineSection
    ? 'max-w-7xl mx-auto w-full px-4 sm:px-6'
    : 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80';

  const cardClass = isInlineSection
    ? 'bento-card w-full flex flex-col text-white overflow-hidden'
    : 'bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col text-white overflow-hidden';

  return (
    <div className={wrapperClass}>
      {isInlineSection && (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.06] pb-4 mb-6">
          <div>
            <p className="text-xs font-medium text-sky-400 mb-1">
              02. Modélisation Gompertz-Makeham & Tables Insee
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white section-heading">
              Courbes de Survie & Horizon de Longévité ({birthYear})
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md">
            Visualisation centrée par défaut sur l'horizon actuel ({focusMinAge} à {maxAge} ans) pour mettre en relief les trajectoires de survie jusqu'au grand âge.
          </p>
        </div>
      )}

      <div className={cardClass}>
        {/* Header with Year Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-6 border-b border-white/[0.06]">
          <div>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2 section-heading">
              <TrendingDown className="w-5 h-5 text-sky-400" />
              Trajectoires de Survie par Prénom • Cohorte {birthYear}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Zoom sur l’horizon de vie depuis {minAge} ans (aujourd’hui - {focusLeadYears} ans) jusqu’à {maxAge} ans (Tables Insee & Coulmont)
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Inline Year Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1.5 rounded-xl border border-white/10">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-xs text-slate-400">Année :</span>
              <button
                type="button"
                onClick={() => setBirthYear(clampBirthYear(birthYear - yearJump))}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 tabular-nums"
                title={`-${yearJump} ans`}
              >
                -{yearJump}
              </button>
              <button
                type="button"
                onClick={() => setBirthYear(clampBirthYear(birthYear - 1))}
                className="p-0.5 rounded hover:bg-slate-800 text-slate-300"
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
                className="w-16 bg-slate-900 border border-white/10 rounded px-1.5 py-0.5 text-xs font-bold text-center text-sky-400 tabular-nums"
              />
              <button
                type="button"
                onClick={() => setBirthYear(clampBirthYear(birthYear + 1))}
                className="p-0.5 rounded hover:bg-slate-800 text-slate-300"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setBirthYear(clampBirthYear(birthYear + yearJump))}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 tabular-nums"
                title={`+${yearJump} ans`}
              >
                +{yearJump}
              </button>
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
        </div>

        {/* Content Body */}
        <div className={`p-4 sm:p-6 ${isInlineSection ? '' : 'overflow-y-auto'} space-y-6`}>
          {/* SVG Chart */}
          <div className="bg-slate-950/90 p-3 sm:p-5 rounded-xl border border-white/[0.06]">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 mb-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-200">
                  Taux de survie cumulé (%) de {minAge} à {maxAge} ans
                </span>
                <span className="text-[11px] text-sky-400 font-medium">
                  · Référence : {currentAge} ans {isFocusedRange ? `(-${focusLeadYears} ans)` : `(depuis 0 an)`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-slate-900 p-0.5 rounded-lg border border-white/10 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setIsFocusedRange(true)}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      isFocusedRange
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Focus dès {focusMinAge} ans
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFocusedRange(false)}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      !isFocusedRange
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Depuis 0 an
                  </button>
                </div>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto min-w-[550px] select-none cursor-crosshair"
                onMouseMove={handleSvgMouseMove}
                onMouseLeave={() => setHoveredAge(null)}
              >
                {/* Shaded region before currentAge (recent past reference) */}
                {currentAge > minAge && currentAge <= maxAge && (
                  <rect
                    x={padding.left}
                    y={padding.top}
                    width={Math.max(0, xScale(currentAge) - padding.left)}
                    height={chartH}
                    fill="#0f172a"
                    opacity={0.55}
                  />
                )}

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
                {xTicks.map((ageVal) => {
                  const x = xScale(ageVal);
                  const isOriginRef = ageVal === minAge && isFocusedRange;
                  return (
                    <g key={ageVal}>
                      <line
                        x1={x}
                        y1={padding.top}
                        x2={x}
                        y2={svgHeight - padding.bottom}
                        stroke={isOriginRef ? '#334155' : '#1e293b'}
                        strokeWidth={isOriginRef ? 1.5 : 1}
                      />
                      <text
                        x={x}
                        y={svgHeight - padding.bottom + 18}
                        fill={isOriginRef ? '#94a3b8' : '#64748b'}
                        fontWeight={isOriginRef ? 'bold' : 'normal'}
                        fontSize="11"
                        textAnchor="middle"
                      >
                        {ageVal} ans
                      </text>
                    </g>
                  );
                })}

                {/* Current Age Line Indicator ("Aujourd'hui") */}
                {currentAge >= minAge && currentAge <= maxAge && (
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
                      x={Math.max(padding.left + 48, xScale(currentAge))}
                      y={padding.top - 10}
                      fill="#38bdf8"
                      fontSize="11"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      Aujourd'hui ({currentAge}a)
                    </text>
                  </g>
                )}

                {/* Interactive Hover Age Line */}
                {hoveredAge !== null && hoveredAge !== currentAge && (
                  <g>
                    <line
                      x1={xScale(hoveredAge)}
                      y1={padding.top}
                      x2={xScale(hoveredAge)}
                      y2={svgHeight - padding.bottom}
                      stroke="#94a3b8"
                      strokeWidth={1.2}
                      strokeDasharray="2 2"
                    />
                    <text
                      x={Math.min(svgWidth - padding.right - 35, Math.max(padding.left + 35, xScale(hoveredAge)))}
                      y={svgHeight - padding.bottom + 34}
                      fill="#e2e8f0"
                      fontSize="11"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      À {hoveredAge} ans ({birthYear + hoveredAge})
                    </text>
                  </g>
                )}

                {/* Survival Curves for each name */}
                {names.map((item, idx) => {
                  const points = ages
                    .map((a) => {
                      const s = getSurvivalAtAge(a, item.adjustedLifeExpectancy, item.mortalityHazardRatio);
                      return `${xScale(a)},${yScale(s)}`;
                    })
                    .join(' ');

                  const sAtCurrent = getSurvivalAtAge(currentAge, item.adjustedLifeExpectancy, item.mortalityHazardRatio);
                  const sAtInspected = getSurvivalAtAge(inspectedAge, item.adjustedLifeExpectancy, item.mortalityHazardRatio);
                  const lifeExpAge = item.adjustedLifeExpectancy;
                  const sAtLifeExp = getSurvivalAtAge(lifeExpAge, item.adjustedLifeExpectancy, item.mortalityHazardRatio);

                  return (
                    <g key={idx}>
                      {/* Path line */}
                      <polyline
                        fill="none"
                        stroke={item.colorHex}
                        strokeWidth={2.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={points}
                      />

                      {/* Life Expectancy (e0) Diamond / Ring Marker on curve */}
                      {lifeExpAge >= minAge && lifeExpAge <= maxAge && (
                        <circle
                          cx={xScale(lifeExpAge)}
                          cy={yScale(sAtLifeExp)}
                          r={3.5}
                          fill="#0f172a"
                          stroke={item.colorHex}
                          strokeWidth={2}
                        />
                      )}

                      {/* Current Age Dot */}
                      {currentAge >= minAge && currentAge <= maxAge && (
                        <circle
                          cx={xScale(currentAge)}
                          cy={yScale(sAtCurrent)}
                          r={5}
                          fill={item.colorHex}
                          stroke="#ffffff"
                          strokeWidth={1.5}
                        />
                      )}

                      {/* Hovered Age Dot */}
                      {hoveredAge !== null && hoveredAge !== currentAge && (
                        <circle
                          cx={xScale(hoveredAge)}
                          cy={yScale(sAtInspected)}
                          r={4.5}
                          fill={item.colorHex}
                          stroke="#0f172a"
                          strokeWidth={1.5}
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Chart Legend & Inspected Age Readout */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-3 pt-3 border-t border-slate-800">
              {names.length === 0 ? (
                <span className="text-xs text-slate-400 italic py-1">
                  Aucun prénom sélectionné pour le tracé des courbes.
                </span>
              ) : (
                names.map((item, idx) => {
                  const sInspected = getSurvivalAtAge(
                    inspectedAge,
                    item.adjustedLifeExpectancy,
                    item.mortalityHazardRatio
                  );
                  return (
                    <div key={idx} className="flex items-center gap-1.5 text-xs">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.colorHex }}
                      />
                      <span className="font-semibold text-white">{item.queryName}</span>
                      <span className="text-slate-400">
                        (e₀ : {item.adjustedLifeExpectancy}a • Survie à {inspectedAge}a :{' '}
                        <strong className="text-sky-300">{sInspected}%</strong>)
                      </span>
                    </div>
                  );
                })
              )}
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
                  {names.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                        Aucun prénom dans le comparateur. Ajoutez des prénoms depuis l'interface pour voir les courbes comparatives.
                      </td>
                    </tr>
                  ) : (
                    names.map((item, idx) => {
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
                  })
                )}
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
