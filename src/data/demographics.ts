import { NAME_COLORS, REFERENCE_YEAR } from '../config';

export type Sex = 'M' | 'F';
export type ObservationStatus = 'available' | 'before-coverage' | 'inconsistent' | 'small-sample';
export interface LifeTable {
  q: number[];
  tailLife: number;
}
export interface Manifest {
  schemaVersion: number;
  version: string;
  generatedAt: string;
  birthYears: number[];
  deathsThrough: string;
  deathsCoverageStart: number;
  incompleteCoverageThrough: number;
  minObservationBirths: number;
  mortality: { year: number; tables: Record<Sex, LifeTable>; maximumReferenceError: number };
  sources: { title: string; url: string; sha256: string; modified?: string }[];
}
export type BirthRecord = [name: string, sex: Sex, births: number, rank: number];
export interface Observation {
  births: number;
  variants: number;
  deaths: [year: number, count: number][];
  status: ObservationStatus;
  previousBirths: number | null;
  earlyCoverageWarning: boolean;
}
export interface Cohort {
  version: string;
  year: number;
  names: BirthRecord[];
  observations: Record<string, Observation>;
}
export type TopNames = Record<string, Record<Sex, [string, number, number][]>>;
export interface Dataset {
  manifest: Manifest;
  cohort: Cohort;
}
/** Référence nationale par âge et sexe : ne dépend pas du prénom. */
export interface Projection {
  tableYear: number;
  expectedAge: number;
  remainingYears: number;
  table: LifeTable;
}
export interface NameStats {
  queryName: string;
  normalizedName: string;
  birthYear: number;
  gender: Sex;
  currentAge: number;
  births: number | null;
  rank: number | null;
  observation: Observation | null;
  observedSurvival: number | null;
  observedThrough: string;
  coverage: { from: number; incompleteThrough: number };
  projection: Projection;
  popularityTrend: 'up' | 'down' | 'stable' | 'unavailable';
  popularityDeltaPercent: number | null;
  colorHex: string;
}

export function cleanName(raw: string): string {
  return raw
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/’/g, "'");
}
export function ageFromBirthYear(year: number): number {
  return Math.max(0, REFERENCE_YEAR - year);
}
export function clampBirthYear(year: number, years: number[]): number {
  return Math.min(
    years[years.length - 1],
    Math.max(years[0], Math.round(Number.isFinite(year) ? year : years[0])),
  );
}
export function remainingLife(table: LifeTable, age: number): number {
  const last = table.q.length - 1;
  if (age >= last) return table.tailLife;
  let survival = 1,
    area = 0;
  for (let x = age; x < last; x++) {
    const following = survival * (1 - table.q[x]);
    area += (survival + following) / 2;
    survival = following;
  }
  return area + survival * table.tailLife;
}
export function projectedSurvival(projection: Projection, fromAge: number, toAge: number): number {
  if (toAge <= fromAge) return 1;
  const { table } = projection;
  const last = table.q.length - 1;
  let result = 1;
  for (let age = fromAge; age < Math.min(toAge, last); age++) result *= 1 - table.q[age];
  return result * Math.exp(-Math.max(0, toAge - Math.max(last, fromAge)) / table.tailLife);
}
export function survivalAtYear(observation: Observation, year: number): number | null {
  if (observation.status !== 'available') return null;
  return (
    100 *
    (1 -
      observation.deaths.filter((p) => p[0] <= year).reduce((sum, p) => sum + p[1], 0) /
        observation.births)
  );
}
export function computeNameStats(
  rawName: string,
  birthYear: number,
  data: Dataset,
  forcedGender?: Sex,
): NameStats {
  if (data.cohort.year !== birthYear)
    throw new Error('La cohorte chargée ne correspond pas à l’année sélectionnée.');
  const normalized = cleanName(rawName);
  const exact = data.cohort.names.filter(
    (r) => r[0].toLocaleLowerCase('fr') === rawName.trim().toLocaleLowerCase('fr'),
  );
  const candidates = exact.length
    ? exact
    : data.cohort.names.filter((r) => cleanName(r[0]) === normalized);
  const gender = forcedGender ?? [...candidates].sort((a, b) => b[2] - a[2])[0]?.[1] ?? 'M';
  const record = candidates.filter((r) => r[1] === gender).sort((a, b) => b[2] - a[2])[0];
  const observation = data.cohort.observations[gender + ':' + normalized] ?? null;
  const age = ageFromBirthYear(birthYear);
  const table = data.manifest.mortality.tables[gender];
  const remaining = remainingLife(table, age);
  const previous = observation?.previousBirths;
  // La comparaison utilise le même regroupement de graphies aux deux années.
  const delta = observation && previous ? (100 * (observation.births - previous)) / previous : null;
  let colorHash = 0;
  for (const char of normalized) colorHash = (Math.imul(31, colorHash) + char.charCodeAt(0)) | 0;
  return {
    queryName: record?.[0] ?? rawName.trim(),
    normalizedName: normalized,
    birthYear,
    gender,
    currentAge: age,
    births: record?.[2] ?? null,
    rank: record?.[3] ?? null,
    observation,
    observedSurvival: observation
      ? survivalAtYear(observation, Number(data.manifest.deathsThrough.slice(0, 4)))
      : null,
    observedThrough: data.manifest.deathsThrough,
    coverage: {
      from: data.manifest.deathsCoverageStart,
      incompleteThrough: data.manifest.incompleteCoverageThrough,
    },
    projection: {
      tableYear: data.manifest.mortality.year,
      expectedAge: age + remaining,
      remainingYears: remaining,
      table,
    },
    popularityTrend:
      delta === null ? 'unavailable' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable',
    popularityDeltaPercent: delta === null ? null : Math.round(delta * 10) / 10,
    colorHex: NAME_COLORS[(colorHash >>> 0) % NAME_COLORS.length],
  };
}
export function observationLabel(item: NameStats): string {
  if (item.observedSurvival !== null) return item.observedSurvival.toFixed(1) + ' %';
  const status = item.observation?.status;
  return status === 'before-coverage'
    ? 'Indisponible avant ' + item.coverage.from
    : status === 'small-sample'
      ? 'Effectif insuffisant'
      : status === 'inconsistent'
        ? 'Données incohérentes'
        : 'Non diffusé';
}
export async function readData<T>(path: string, signal?: AbortSignal): Promise<T> {
  try {
    const response = await fetch(import.meta.env.BASE_URL + 'data/' + path, {
      signal,
      cache: 'no-cache',
    });
    if (!response.ok || !(response.headers.get('content-type') ?? '').includes('json'))
      throw new Error('Réponse invalide');
    return await response.json() as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new Error('Données indisponibles. Réessayez dans un instant.');
  }
}
