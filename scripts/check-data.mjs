import fs from 'node:fs';
const root = 'public/data/';
try {
  const manifest = JSON.parse(fs.readFileSync(root + 'manifest.json', 'utf8'));
  if (manifest.schemaVersion !== 1 || !manifest.birthYears?.length)
    throw new Error('Manifeste invalide');
  const top = JSON.parse(fs.readFileSync(root + 'top.json', 'utf8'));
  if (top.version !== manifest.version) throw new Error('Versions incompatibles');
  for (const year of manifest.birthYears) {
    const cohort = JSON.parse(fs.readFileSync(root + 'cohorts/' + year + '.json', 'utf8'));
    if (cohort.year !== year || cohort.version !== manifest.version)
      throw new Error('Cohorte incohérente : ' + year);
  }
} catch (error) {
  console.error('Snapshot requis pour le build : exécutez npm run data:sync. ' + error.message);
  process.exit(1);
}
