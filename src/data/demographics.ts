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
  trainingThrough: number;
  mortality: { year: number; tables: Record<Sex, LifeTable>; maximumReferenceError: number };
  sources: { title: string; url: string; sha256: string; modified?: string }[];
  model: {
    version: string;
    validated: boolean;
    reason?: string;
    improvement?: number;
    interval: string;
  };
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
export interface Effect {
  ratio: number;
  lower: number;
  upper: number;
}
export interface Cohort {
  version: string;
  year: number;
  names: BirthRecord[];
  observations: Record<string, Observation>;
  effects: Record<string, Effect>;
}
export type TopNames = Record<string, Record<Sex, [string, number, number][]>>;
export interface Dataset {
  manifest: Manifest;
  cohort: Cohort;
}
export interface Projection {
  basis: 'name-model' | 'national-reference';
  reason: string;
  tableYear: number;
  expectedAge: number;
  remainingYears: number;
  interval: [number, number] | null;
  ratio: number;
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
export function remainingLife(table: LifeTable, age: number, ratio = 1): number {
  const last = table.q.length - 1;
  if (age >= last) return table.tailLife / ratio;
  let survival = 1,
    area = 0;
  for (let x = age; x < last; x++) {
    const following = survival * Math.pow(1 - table.q[x], ratio);
    area += (survival + following) / 2;
    survival = following;
  }
  return area + (survival * table.tailLife) / ratio;
}
export function projectedSurvival(projection: Projection, fromAge: number, toAge: number): number {
  if (toAge <= fromAge) return 1;
  const { table, ratio } = projection;
  const last = table.q.length - 1;
  let result = 1;
  for (let age = fromAge; age < Math.min(toAge, last); age++)
    result *= Math.pow(1 - table.q[age], ratio);
  return (
    result * Math.exp((-Math.max(0, toAge - Math.max(last, fromAge)) * ratio) / table.tailLife)
  );
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
  const effect =
    data.manifest.model.validated && birthYear >= 1970
      ? data.cohort.effects[gender + ':' + normalized]
      : undefined;
  const table = data.manifest.mortality.tables[gender];
  const ratio = effect?.ratio ?? 1;
  const remaining = remainingLife(table, age, ratio);
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
    projection: {
      basis: effect ? 'name-model' : 'national-reference',
      reason: effect
        ? 'Association estimée au prénom ; extrapolation aux âges futurs.'
        : !record
          ? 'Prénom non diffusé pour ce sexe et cette année ; référence nationale seule.'
          : (data.manifest.model.reason ??
            'Effectifs de calibration insuffisants ; référence nationale seule.'),
      tableYear: data.manifest.mortality.year,
      expectedAge: age + remaining,
      remainingYears: remaining,
      interval: effect
        ? [
            age + remainingLife(table, age, effect.upper),
            age + remainingLife(table, age, effect.lower),
          ]
        : null,
      ratio,
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
    ? 'Indisponible avant 1970'
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
