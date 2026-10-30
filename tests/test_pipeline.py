import csv
import io
import json
import math
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import zipfile

import duckdb
import numpy as np
import openpyxl

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts/data'))
from model import fit, train, remaining_life
from sync import build, clean_name, available_observation, load_mortality


class MortalityTest(unittest.TestCase):
    def test_conditional_expectancy_and_tail(self):
        q = [0.02] * 101
        tail = -1 / math.log(.98)
        # Une loi exponentielle est sans mémoire : le conditionnement ne
        # soustrait pas l'âge à l'espérance résiduelle.
        for age in (0, 40, 99, 105):
            self.assertAlmostEqual(remaining_life(q, tail, age), tail, delta=.01)
        self.assertLess(remaining_life(q, tail, 40, 2), remaining_life(q, tail, 40))

    def test_name_effect_estimated_not_hashed(self):
        rows = []
        for name, ratio in [('Alpha', .6), ('Beta', 1.6)]:
            for year in range(2000, 2020):
                p = 1 - .98 ** ratio
                rows.append((name, 'M', 1980, year, round(10000 * p), 10000, .02))
        effects = fit(rows, 10)
        self.assertAlmostEqual(effects['Alpha', 'M', 1980]['ratio'], .6, delta=.03)
        self.assertAlmostEqual(effects['Beta', 'M', 1980]['ratio'], 1.6, delta=.03)
        self.assertLess(effects['Alpha', 'M', 1980]['lower'], effects['Alpha', 'M', 1980]['upper'])

    def test_held_out_years_gate_and_small_samples(self):
        rows = []
        for year in range(2000, 2026):
            rows.append(('Alpha', 'M', 1980, year, 200, 10000, .02))
        effects, report = train(rows, {('Alpha', 'M', 1980): 10000})
        self.assertFalse(report['validated'])
        self.assertEqual(effects, {})
        self.assertEqual([f['testThrough'] for f in report['folds']], [2021, 2023, 2025])

    def test_real_signal_passes_temporal_validation(self):
        rows = [(name, 'M', 1980, year, round(10000 * (1 - .98 ** ratio)), 10000, .02)
                for name, ratio in [('Alpha', .2), ('Beta', 3)] for year in range(2000, 2026)]
        effects, report = train(rows, {('Alpha', 'M', 1980): 10000, ('Beta', 'M', 1980): 500})
        self.assertTrue(report['validated'])
        self.assertIn(('Alpha', 'M', 1980), effects)
        self.assertNotIn(('Beta', 'M', 1980), effects)

    def test_unavailable_is_not_zero(self):
        self.assertEqual(available_observation(1969, 1000, 4), 'before-coverage')
        self.assertEqual(available_observation(1980, 50, 0), 'small-sample')
        self.assertEqual(available_observation(1980, 100, 101), 'inconsistent')
        self.assertEqual(clean_name('  Éloïse-Marie ’ '), "eloise-marie '")

    def test_validation_uses_the_publication_eligibility_rule(self):
        rows = []
        for year in range(2000, 2026):
            rows.append(('Common', 'M', 1980, year, 10, 10000 - 10 * (year - 2000), .001))
            rows.append(('Rare', 'M', 1980, year, 3, 200 - 3 * (year - 2000), .001))
        effects, report = train(rows, {('Common', 'M', 1980): 10000, ('Rare', 'M', 1980): 200})
        self.assertFalse(report['validated'], 'Un groupe non publiable ne doit pas justifier le score de validation')
        self.assertEqual(effects, {})


class PipelineIntegrationTest(unittest.TestCase):
    def create_cache(self, cache):
        def write(name, value): (cache / name).write_text(json.dumps(value))
        write('names-meta.json', {'relations': [{'url': [{'lang': 'fr', 'content': 'https://www.insee.fr/latest'}]}], 'temporal': {'endPeriod': '2026-01-01'}, 'modified': '2027-07-01'})
        (cache / 'names-landing.html').write_text('<a href="/prenoms-2026-nat_csv.zip">National CSV</a>')
        csv_data = 'sexe;prenom;periode;valeur;rang\n'
        for year in range(1900, 2027):
            csv_data += f'1;STÉPHANE;{year};1000;1\n2;MARIE;{year};2000;1\n'
        with zipfile.ZipFile(cache / 'names.zip', 'w') as z: z.writestr('national.csv', csv_data)
        write('deaths-meta.json', {'resources': [{'format': 'parquet', 'url': 'https://www.data.gouv.fr/deaths.parquet', 'last_modified': '2027-02-01'}], 'temporal_coverage': {'start': '1970-01-01', 'end': '2026-12-31'}})
        write('mortality-meta.json', {'relations': [{'titleComplement': [{'content': 'Bilan démographique 2026'}], 'url': [{'lang': 'fr', 'content': 'https://www.insee.fr/bilan'}]}]})
        (cache / 'mortality-landing.html').write_text('<a href="/mortality">Décès, mortalité, espérance de vie</a>')
        (cache / 'mortality-detail.html').write_text('<a href="/3_Quotients_mortalite.xlsx">q</a><a href="/5_Esperance_vie.xlsx">e</a>')
        for filename, value in [('mortality-q.xlsx', 1000), ('mortality-e.xlsx', -1 / math.log(.99))]:
            wb = openpyxl.Workbook(); wb.remove(wb.active)
            for sex in ('Hommes', 'Femmes'):
                ws = wb.create_sheet('FR-' + sex)
                for year in range(1976, 2027):
                    values = [value] * 101
                    if filename == 'mortality-q.xlsx': values[0] = (1 - math.sqrt(.99)) * 100000
                    ws.append([year] + values)
            wb.save(cache / filename)
        db = duckdb.connect()
        db.execute('CREATE TABLE deaths(nom VARCHAR, prenoms VARCHAR, sexe VARCHAR, date_naissance VARCHAR, code_insee_naissance VARCHAR, date_deces VARCHAR, code_insee_deces VARCHAR, numero_acte_deces VARCHAR, fichier_origine VARCHAR, opposition BOOLEAN)')
        rows = [('EXAMPLE', 'STEPHANE,JEAN', 'M', '19800101', '75056', '20250101', '75056', '1', '2025', False),
                ('EXAMPLE', 'STEPHANE,JEAN', 'M', '19800101', '75056', '20250101', '75056', '1', '2025-m01', False),
                ('OTHER', 'STEPHANE', 'M', '19800200', '75056', '20260000', '75056', '2', '2026', False),
                ('FOREIGN', 'STEPHANE', 'M', '19800101', '99109', '20250101', '75056', '3', '2025', False),
                ('UNKNOWN-A', 'STEPHANE', 'M', '19800101', '75056', '20250101', '75056', '000', '2025', False),
                ('UNKNOWN-B', 'STEPHANE', 'M', '19800101', '75056', '20250101', '75056', '000', '2025', False),
                ('INVALID', 'STEPHANE', 'M', '19800101', '75056', '20251340', '75056', '5', '2025', False),
                ('OPPOSED', 'STEPHANE', 'M', '19800101', '75056', '20250101', '75056', '4', '2025', True)]
        db.executemany('INSERT INTO deaths VALUES (?,?,?,?,?,?,?,?,?,?)', rows)
        db.execute('COPY deaths TO ? (FORMAT PARQUET)', [str(cache / 'deaths.parquet')]); db.close()

    def test_future_year_and_filters_end_to_end(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); cache = root / 'cache'; cache.mkdir(); output = root / 'data'
            self.create_cache(cache)
            build(cache, output, offline=True)
            manifest = json.loads((output / 'manifest.json').read_text())
            self.assertEqual(manifest['birthYears'][-1], 2026)
            cohort = json.loads((output / 'cohorts/1980.json').read_text())
            obs = cohort['observations']['M:stephane']
            self.assertEqual(obs['births'], 1000)
            self.assertEqual(obs['deaths'], [[2025, 3], [2026, 1]])
            report = json.loads((output / 'quality-report.json').read_text())
            self.assertEqual(report['excluded']['duplicates'], 1)
            self.assertEqual(report['excluded']['opposition'], 1)
            self.assertNotIn('EXAMPLE', (output / 'cohorts/1980.json').read_text())
            meta = json.loads((cache / 'deaths-meta.json').read_text())
            meta['temporal_coverage']['end'] = '2026-09-30'
            (cache / 'deaths-meta.json').write_text(json.dumps(meta))
            build(cache, output, offline=True)
            self.assertNotEqual(json.loads((output / 'manifest.json').read_text())['version'], manifest['version'])
            partial = json.loads((output / 'cohorts/1980.json').read_text())
            self.assertEqual(partial['observations']['M:stephane']['deaths'], [[2025, 3]])
            before = (output / 'manifest.json').read_bytes()
            (cache / 'mortality-q.xlsx').write_bytes(b'broken')
            with self.assertRaises(Exception): build(cache, output, offline=True)
            self.assertEqual((output / 'manifest.json').read_bytes(), before)

if __name__ == '__main__': unittest.main()
