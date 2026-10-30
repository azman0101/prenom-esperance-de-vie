import assert from 'node:assert/strict';
import { build } from 'esbuild';
const { outputFiles } = await build({
  entryPoints: ['src/data/demographics.ts'],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  define: { 'import.meta.env.BASE_URL': '"/"' },
});
const data = await import(
  'data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64')
);
const table = { q: Array(101).fill(0.02), tailLife: -1 / Math.log(0.98) };
const manifest = {
  birthYears: [1970, 1971, 2025],
  deathsThrough: '2026-09-30',
  model: { validated: false, reason: 'Non validé' },
  mortality: { year: 2025, tables: { M: table, F: table } },
};
const observation = {
  births: 1000,
  deaths: [
    [2024, 100],
    [2025, 50],
  ],
  status: 'available',
  previousBirths: null,
  variants: 1,
};
const cohort = {
  year: 1970,
  names: [['STÉPHANE', 'M', 1000, 5]],
  observations: { 'M:stephane': observation },
  effects: { 'M:stephane': { ratio: 0.1, lower: 0.01, upper: 1 } },
};
const stats = data.computeNameStats('Stéphane', 1970, { manifest, cohort });
assert.equal(stats.births, 1000);
assert.equal(stats.rank, 5);
assert.equal(stats.observedSurvival, 85);
assert.equal(stats.projection.basis, 'national-reference');
assert.equal(stats.projection.ratio, 1, 'Un modèle non validé ne doit jamais ajuster la longévité');
assert.equal(stats.popularityDeltaPercent, null, 'Absence de N-1 ≠ zéro');
assert.ok(stats.projection.expectedAge > stats.currentAge);
assert.ok(
  Math.abs(stats.projection.remainingYears - table.tailLife) < 0.01,
  'Espérance conditionnelle, pas e0 moins âge',
);
const unknown = data.computeNameStats('Inconnu', 1970, { manifest, cohort }, 'F');
assert.equal(unknown.births, null);
assert.equal(unknown.observedSurvival, null);
assert.equal(unknown.projection.basis, 'national-reference');
assert.equal(unknown.gender, 'F');
assert.equal(data.survivalAtYear(observation, 2024), 90);
assert.equal(data.survivalAtYear({ ...observation, status: 'before-coverage' }, 2024), null);
assert.throws(() => data.computeNameStats('Stéphane', 2025, { manifest, cohort }));
assert.equal(data.clampBirthYear(2030, manifest.birthYears), 2025);
assert.equal(data.clampBirthYear(NaN, manifest.birthYears), 1970);
assert.ok(data.projectedSurvival(stats.projection, 56, 70) < 1);
assert.equal(data.projectedSurvival(stats.projection, 56, 56), 1);
const adjusted = data.computeNameStats('Stéphane', 1970, {
  manifest: { ...manifest, model: { validated: true } },
  cohort,
});
assert.ok(adjusted.projection.expectedAge > stats.projection.expectedAge);
assert.ok(adjusted.projection.interval[0] <= adjusted.projection.expectedAge);
assert.ok(adjusted.projection.interval[1] >= adjusted.projection.expectedAge);
console.log(
  'Contrats démographiques : observations, données manquantes, validation et projection conditionnelle OK',
);
