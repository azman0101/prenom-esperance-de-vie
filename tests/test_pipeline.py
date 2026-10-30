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
import openpyxl

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts/data'))
from lifetable import remaining_life
from sync import build, clean_name, available_observation, source_stamp


class MortalityTest(unittest.TestCase):
    def test_conditional_expectancy_and_tail(self):
        q = [0.02] * 101
        tail = -1 / math.log(.98)
        # Une loi exponentielle est sans mémoire : le conditionnement ne
        # soustrait pas l'âge à l'espérance résiduelle.
        for age in (0, 40, 99, 105):
            self.assertAlmostEqual(remaining_life(q, tail, age), tail, delta=.01)

    def test_unavailable_is_not_zero(self):
        self.assertEqual(available_observation(1969, 1000, 4, 1970), 'before-coverage')
        self.assertEqual(available_observation(1980, 50, 0, 1970), 'small-sample')
        self.assertEqual(available_observation(1980, 100, 101, 1970), 'inconsistent')
        self.assertEqual(available_observation(1980, 1000, 4, 1985), 'before-coverage', 'Le début de couverture vient des métadonnées')
        self.assertEqual(clean_name('  Éloïse-Marie ’ '), "eloise-marie '")


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

    def test_coverage_start_comes_from_source_metadata(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); cache = root / 'cache'; cache.mkdir(); output = root / 'data'
            self.create_cache(cache)
            meta = json.loads((cache / 'deaths-meta.json').read_text())
            meta['temporal_coverage']['start'] = '1985-01-01'
            (cache / 'deaths-meta.json').write_text(json.dumps(meta))
            build(cache, output, offline=True)
            manifest = json.loads((output / 'manifest.json').read_text())
            self.assertEqual((manifest['deathsCoverageStart'], manifest['incompleteCoverageThrough']), (1985, 1990))
            cohort = json.loads((output / 'cohorts/1980.json').read_text())
            self.assertEqual(cohort['observations']['M:stephane']['status'], 'before-coverage')
            self.assertFalse(cohort['observations']['M:stephane']['earlyCoverageWarning'])

    def test_first_year_is_a_parameter(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); cache = root / 'cache'; cache.mkdir(); output = root / 'data'
            self.create_cache(cache)
            build(cache, output, offline=True, first_year=1990)
            self.assertEqual(json.loads((output / 'manifest.json').read_text())['birthYears'][0], 1990)

    def test_stamp_identifies_upstream_sources_without_building(self):
        with tempfile.TemporaryDirectory() as tmp:
            cache = Path(tmp) / 'cache'; cache.mkdir()
            self.create_cache(cache)
            first = source_stamp(cache, offline=True)
            self.assertEqual(first, source_stamp(cache, offline=True))
            meta = json.loads((cache / 'deaths-meta.json').read_text())
            meta['resources'][0]['last_modified'] = '2027-03-01'
            (cache / 'deaths-meta.json').write_text(json.dumps(meta))
            self.assertNotEqual(first, source_stamp(cache, offline=True))

if __name__ == '__main__': unittest.main()
