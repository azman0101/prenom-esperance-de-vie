"""Acquisition reproductible des sources INSEE ; sortie exclusivement agrégée."""
import argparse
import csv
import hashlib
from html import unescape
import io
import json
import math
import os
from pathlib import Path
import re
import shutil
import sys
import tempfile
import time
import unicodedata
import zipfile
from datetime import date, datetime, timezone
from urllib.error import HTTPError
from urllib.parse import urljoin
from urllib.request import Request, urlopen

import duckdb
import openpyxl
from lifetable import remaining_life

ROOT = Path(__file__).resolve().parents[2]
USER_AGENT = "PrenomsLongevite/1.0 (source audit and aggregate statistics)"
# Première cohorte de naissance publiée (choix produit) ; la précédente sert de dénominateur de tendance.
FIRST_BIRTH_YEAR = 1920
# Moins de naissances regroupées : survie jugée trop instable pour être publiée.
MIN_OBSERVATION_BIRTHS = 100
# Les premiers fichiers de décès sont lacunaires : années de couverture non fiables après le début.
EARLY_COVERAGE_GAP_YEARS = 6
# Écart maximal toléré (années) entre l'espérance reproduite et la table officielle.
MAX_REFERENCE_ERROR = .2
MAX_COHORT_BYTES = 24 * 1024 * 1024
CATALOG = "https://api.insee.fr/melodi/catalog/"
DEATHS = "https://www.data.gouv.fr/api/1/datasets/66d997ba09e4429d7f846249/"


def clean_name(value):
    return "".join(c for c in unicodedata.normalize("NFD", value.strip())
                   if unicodedata.category(c) != "Mn").lower().replace("’", "'")


def download(url, target, offline=False):
    target = Path(target)
    meta_path = target.with_suffix(target.suffix + ".http.json")
    if offline:
        if not target.exists():
            raise ValueError(f"Cache absent : {target}")
        return target
    headers = {"User-Agent": USER_AGENT}
    old = json.loads(meta_path.read_text()) if meta_path.exists() else {}
    if old.get("url") == url and target.exists():
        if old.get("etag"):
            headers["If-None-Match"] = old["etag"]
        if old.get("lastModified"):
            headers["If-Modified-Since"] = old["lastModified"]
    for attempt in range(4):
        temporary = target.with_suffix(target.suffix + ".part")
        try:
            with urlopen(Request(url, headers=headers), timeout=120) as response:
                target.parent.mkdir(parents=True, exist_ok=True)
                with temporary.open("wb") as output:
                    shutil.copyfileobj(response, output, length=1024 * 1024)
                if response.headers.get("Content-Length") and temporary.stat().st_size != int(response.headers["Content-Length"]):
                    raise ValueError("Téléchargement incomplet")
                temporary.replace(target)
                meta_path.write_text(json.dumps({"url": url, "etag": response.headers.get("ETag"),
                                                "lastModified": response.headers.get("Last-Modified")}))
                print(f"Source téléchargée : {target.name} ({target.stat().st_size} octets)", flush=True)
                return target
        except HTTPError as error:
            if error.code == 304 and target.exists():
                return target
            if error.code < 500 and error.code != 429:
                raise
            if attempt == 3:
                raise
        except (OSError, ValueError):
            if attempt == 3:
                raise
        time.sleep(2 ** attempt)
    raise RuntimeError(f"Source inaccessible : {url}")


def json_source(url, path, offline):
    return json.loads(download(url, path, offline).read_text())


def fingerprint(path):
    h = hashlib.sha256()
    with Path(path).open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":"), allow_nan=False))


def load_mortality(q_path, e_path):
    def read(path):
        workbook = openpyxl.load_workbook(path, read_only=True, data_only=True)
        result = {}
        for sex, sheet in (("M", "FR-Hommes"), ("F", "FR-Femmes")):
            records = {}
            for row in workbook[sheet].values:
                match = re.match(r"^(\d{4})(?:\s|$)", str(row[0]))
                if match:
                    values = [float(x) for x in row[1:] if isinstance(x, (int, float))]
                    if values:
                        records[int(match[1])] = values
            result[sex] = records
        workbook.close()
        return result
    qs, es = read(q_path), read(e_path)
    year = max(set(qs["M"]) & set(qs["F"]) & set(es["M"]) & set(es["F"]))
    tables = {}
    maximum_error = 0
    for sex in ("M", "F"):
        raw_q = [x / 100000 for x in qs[sex][year]]
        # DEC3 : âge atteint dans l'année ; DEC5 : anniversaire révolu.
        # Décalage de Lexis d'une demi-année, interpolation des hazards.
        # Les décès de l'année de naissance sont déjà dans le quotient 0.
        q = [1 - math.sqrt((1 - a) * (1 - b)) for a, b in zip(raw_q, raw_q[1:])] + [raw_q[-1]]
        q[0] = 1 - (1 - raw_q[0]) * math.sqrt(1 - raw_q[1])
        expected = es[sex][year]
        if len(q) != len(expected) or len(q) < 100 or any(not 0 < x < 1 for x in q):
            raise ValueError("Structure des tables de mortalité inattendue")
        tail = expected[-1]
        for age in (0, 20, 40, 60, 80, 99):
            maximum_error = max(maximum_error, abs(remaining_life(q, tail, age) - expected[age]))
        tables[sex] = {"q": q, "tailLife": tail}
    if maximum_error > MAX_REFERENCE_ERROR:
        raise ValueError(f"Espérance de vie non reproduite : écart {maximum_error:.3f} an")
    return {"year": year, "tables": tables, "maximumReferenceError": maximum_error,
            "ageConvention": "Quotients d'âge atteint convertis en âges révolus par interpolation à demi-année"}


def available_observation(birth_year, births, deaths, coverage_start):
    if birth_year < coverage_start:
        return "before-coverage"
    if births <= 0 or deaths > births:
        return "inconsistent"
    if births < MIN_OBSERVATION_BIRTHS:
        return "small-sample"
    return "available"


def discover(cache, offline=False):
    """Découvre les publications courantes (métadonnées et pages légères uniquement)."""
    cache.mkdir(parents=True, exist_ok=True)
    names_meta = json_source(CATALOG + "DS_PRENOM", cache / "names-meta.json", offline)
    death_meta = json_source(DEATHS, cache / "deaths-meta.json", offline)
    mortality_meta = json_source(CATALOG + "DS_DECES_MORTALITE_SERIES", cache / "mortality-meta.json", offline)
    # Préférer l'extrait national officiel : plus petit et sans risque de sommer
    # des niveaux géographiques. Sa page est découverte depuis le catalogue.
    publications = [x["content"] for relation in names_meta["relations"]
                    for x in relation.get("url", []) if x.get("lang") == "fr" and x.get("content")]
    names_page_url = publications[-1]
    names_page = download(names_page_url, cache / "names-landing.html", offline).read_text()
    national_links = re.findall(r'href=["\']([^"\']*nat[^"\']*csv[^"\']*\.zip)["\']', names_page, re.I)
    if len(set(national_links)) != 1:
        raise ValueError("Extrait national CSV non identifié sur la publication INSEE")
    names_url = urljoin(names_page_url, unescape(national_links[0]))
    death_resource = next(r for r in death_meta["resources"] if r["format"].lower() == "parquet")
    # La relation du catalogue suit le nouveau bilan ; aucun millésime dans le code.
    relations = [r for r in mortality_meta["relations"]
                 if any("Bilan démographique" in x.get("content", "") for x in r.get("titleComplement", []))]
    if len(relations) != 1:
        raise ValueError("Publication de mortalité non identifiée")
    landing_url = next(x["content"] for x in relations[0]["url"] if x["lang"] == "fr")
    landing = download(landing_url, cache / "mortality-landing.html", offline).read_text()
    links = re.findall(r'<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', landing, re.S)
    candidates = [u for u, title in links if "Décès, mortalité, espérance de vie" in re.sub("<[^>]+>", "", unescape(title))]
    if not candidates:
        contents = [u for u, title in links if "Données détaillées du bilan" in re.sub("<[^>]+>", "", unescape(title))]
        if not contents:
            raise ValueError("Sommaire des données détaillées absent du bilan")
        contents_url = urljoin(landing_url, unescape(contents[0]))
        contents_html = download(contents_url, cache / "mortality-contents.html", offline).read_text()
        contents_links = re.findall(r'<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', contents_html, re.S)
        candidates = [urljoin(contents_url, u) for u, title in contents_links
                      if re.search(r'Décès,\s+mortalité,\s+espérance de vie', re.sub("<[^>]+>", "", unescape(title)))]
        if not candidates:
            raise ValueError("Lien vers les tables de mortalité absent du sommaire")
    detail_url = urljoin(landing_url, unescape(candidates[0]))
    detail = download(detail_url, cache / "mortality-detail.html", offline).read_text()
    files = re.findall(r'href=["\']([^"\']+\.xlsx)["\']', detail)
    q_url = urljoin(detail_url, next(u for u in files if "Quotients_mortalite" in u))
    e_url = urljoin(detail_url, next(u for u in files if "Esperance_vie" in u))
    return {"names_meta": names_meta, "death_meta": death_meta, "names_url": names_url,
            "death_resource": death_resource, "q_url": q_url, "e_url": e_url}


def source_identity(url, path, offline):
    """Identité d'une source volumineuse sans la télécharger (HEAD), ou empreinte du cache hors ligne."""
    if offline:
        return fingerprint(path)
    try:
        with urlopen(Request(url, method="HEAD", headers={"User-Agent": USER_AGENT}), timeout=60) as response:
            return [response.headers.get(h) for h in ("ETag", "Last-Modified", "Content-Length")]
    except OSError:
        return None


def source_stamp(cache, offline=False):
    """Empreinte courte des sources amont : sert de clé de cache au snapshot, sans l'acquérir."""
    cache.mkdir(parents=True, exist_ok=True)
    found = discover(cache, offline)
    files = {"names": (found["names_url"], cache / "names.zip"),
             "deaths": (found["death_resource"]["url"], cache / "deaths.parquet"),
             "mortalityQ": (found["q_url"], cache / "mortality-q.xlsx"),
             "mortalityE": (found["e_url"], cache / "mortality-e.xlsx")}
    identity = {key: [url, source_identity(url, path, offline)] for key, (url, path) in files.items()}
    meta = [found["names_meta"].get("modified"), found["names_meta"]["temporal"]["endPeriod"],
            found["death_resource"].get("last_modified"), found["death_meta"]["temporal_coverage"]]
    return hashlib.sha256(json.dumps([identity, meta], sort_keys=True).encode()).hexdigest()[:16]


def build(cache, output, offline=False, first_year=FIRST_BIRTH_YEAR):
    cache.mkdir(parents=True, exist_ok=True)
    found = discover(cache, offline)
    names_meta, death_meta = found["names_meta"], found["death_meta"]
    names_url, death_resource = found["names_url"], found["death_resource"]
    q_url, e_url = found["q_url"], found["e_url"]
    names_path = download(names_url, cache / "names.zip", offline)
    with zipfile.ZipFile(names_path) as archive:
        csv_files = [name for name in archive.namelist() if name.endswith('.csv')]
        if len(csv_files) != 1:
            raise ValueError("Contenu inattendu de l'archive nationale")
        (cache / 'names.csv').write_bytes(archive.read(csv_files[0]))
    deaths_path = download(death_resource["url"], cache / "deaths.parquet", offline)
    q_path = download(q_url, cache / "mortality-q.xlsx", offline)
    e_path = download(e_url, cache / "mortality-e.xlsx", offline)
    mortality = load_mortality(q_path, e_path)
    coverage = death_meta["temporal_coverage"]
    cutoff = coverage["end"][:10]
    coverage_start = int(coverage["start"][:4])
    incomplete_through = coverage_start + EARLY_COVERAGE_GAP_YEARS - 1
    cutoff_year = int(cutoff[:4])
    full_year = cutoff_year if cutoff.endswith("12-31") else cutoff_year - 1
    report = {"excluded": {}, "coverageStart": coverage["start"], "coverageEnd": cutoff}

    work_dir = tempfile.TemporaryDirectory(prefix="processing-", dir=cache)
    work = Path(work_dir.name)
    db = duckdb.connect(str(work / "work.duckdb"))
    db.execute("SET memory_limit='2GB'")
    db.execute("SET threads=1")
    db.execute("SET preserve_insertion_order=false")
    db.execute(f"SET temp_directory='{work.as_posix()}/spill'")
    db.create_function("link_name", clean_name, ["VARCHAR"], "VARCHAR")
    # Les fichiers Melodi et insee.fr emploient deux conventions de colonnes.
    csv_path = str(cache / 'names.csv')
    columns = {x[0].lower(): x[0] for x in db.execute("DESCRIBE SELECT * FROM read_csv(?, delim=';', header=true)", [csv_path]).fetchall()}
    print("Colonnes prénoms :", list(columns), flush=True)
    if "first_name" in columns:
        select = 'FIRST_NAME AS name, SEX AS sex, TIME_PERIOD AS year, OBS_VALUE AS births, RANK AS rank'
        geo = "GEO = 'FRANCE-F'"
    else:
        select = "PRENOM AS name, CASE CAST(SEXE AS VARCHAR) WHEN '1' THEN 'M' WHEN '2' THEN 'F' ELSE CAST(SEXE AS VARCHAR) END AS sex, PERIODE AS year, VALEUR AS births, RANG AS rank"
        geo = "TRUE"
    db.execute(f"CREATE TABLE births AS SELECT name, sex, CAST(year AS INTEGER) AS year, CAST(births AS INTEGER) AS births, CAST(rank AS INTEGER) AS rank, link_name(name) AS key FROM (SELECT {select} FROM read_csv(?, delim=';', header=true) WHERE {geo}) WHERE CAST(year AS INTEGER)>=?", [csv_path, first_year - 1])
    max_year = db.execute("SELECT max(year) FROM births").fetchone()[0]
    if max_year != int(names_meta["temporal"]["endPeriod"][:4]):
        raise ValueError("Couverture des naissances incohérente avec le catalogue")
    if db.execute("SELECT count(*) FROM births WHERE sex NOT IN ('M','F') OR births <= 0 OR rank <= 0").fetchone()[0]:
        raise ValueError("Valeurs invalides dans les naissances")
    if db.execute("SELECT count(*) FROM (SELECT name,sex,year FROM births GROUP BY ALL HAVING count(*)>1)").fetchone()[0]:
        raise ValueError("Doublons dans les naissances nationales")
    db.execute("CREATE TABLE pooled AS SELECT key,sex,year,sum(births)::BIGINT AS births,count(*) AS variants FROM births GROUP BY ALL")
    # Ne pas employer pays_naissance : les libellés historiques sont ambigus.
    # 97123 et 97127 correspondent aux communes sorties du champ Guadeloupe.
    db.read_parquet(str(deaths_path)).create_view("source_deaths")
    db.execute("""CREATE VIEW raw_deaths AS SELECT *, try_cast(substr(date_naissance,1,4) AS INTEGER) AS birth_year,
        try_cast(substr(date_deces,1,4) AS INTEGER) AS death_year,
        try_strptime(date_deces,'%Y%m%d') AS death_date,
        try_strptime(date_naissance,'%Y%m%d') AS birth_date,
        link_name(split_part(prenoms,',',1)) AS key
        FROM source_deaths""")
    geo_filter = """(regexp_matches(code_insee_naissance,'^(0[1-9]|[1-8][0-9]|9[0-5]|2A|2B)[0-9]{3}$')
        OR (substr(code_insee_naissance,1,3) IN ('971','972','973','974') AND code_insee_naissance NOT IN ('97123','97127'))
        OR (substr(code_insee_naissance,1,3)='976' AND birth_year>=2012))"""
    report["excluded"]["opposition"] = db.execute("SELECT count(*) FROM raw_deaths WHERE opposition IS TRUE").fetchone()[0]
    valid = f"opposition IS FALSE AND {geo_filter} AND sexe IN ('M','F')"
    print("Agrégation des décès (lecture colonnaire, limite mémoire 2 Go)…", flush=True)
    db.execute("CREATE TABLE filtered(key VARCHAR,sexe VARCHAR,birth_year INTEGER,death_year INTEGER,duplicate BIGINT)")
    partitions = work / "partitions"
    # Lire et décoder les dates une seule fois, puis partitionner sur disque.
    # Un balayage du fichier complet pour chacune des cohortes serait très lent.
    db.execute("SET partitioned_write_max_open_files=16")
    partition_sql = str(partitions).replace("'", "''")
    db.execute(f"""COPY (SELECT prenoms,sexe,date_naissance,nom,date_deces,code_insee_deces,
        numero_acte_deces,fichier_origine,birth_year,death_year FROM raw_deaths
        WHERE {valid} AND birth_year BETWEEN ? AND ? AND death_year BETWEEN birth_year AND ?
        AND (birth_date IS NULL OR death_date IS NULL OR death_date >= birth_date)
        AND (death_date IS NOT NULL OR regexp_matches(date_deces, '^[0-9]{{4}}(00(00|0[1-9]|[12][0-9]|3[01])|(0[1-9]|1[0-2])00)$'))
        AND (death_year <= ? OR (death_date IS NOT NULL AND death_date <= CAST(? AS DATE))))
        TO '{partition_sql}' (FORMAT PARQUET, PARTITION_BY(birth_year))""", [first_year - 1, max_year, cutoff_year, full_year, cutoff])
    print("Partitionnement des décès terminé", flush=True)
    for directory in sorted(partitions.glob('birth_year=*')):
        db.read_parquet(str(directory / '*.parquet'), hive_partitioning=True).create_view('cohort_deaths', replace=True)
        db.execute("""INSERT INTO filtered SELECT link_name(split_part(prenoms,',',1)),sexe,birth_year,death_year,
            row_number() OVER (PARTITION BY date_deces,code_insee_deces,numero_acte_deces,
              CASE WHEN coalesce(trim(numero_acte_deces),'')='' OR regexp_matches(trim(numero_acte_deces),'^0+$')
              THEN concat_ws('|',nom,prenoms,date_naissance) ELSE '' END ORDER BY fichier_origine)
            FROM cohort_deaths""")
    print("Déduplication par cohorte terminée", flush=True)
    report["excluded"]["duplicates"] = db.execute("SELECT count(*) FROM filtered WHERE duplicate>1").fetchone()[0]
    report["excluded"]["outsideBirthGeography"] = db.execute(f"SELECT count(*) FROM raw_deaths WHERE NOT {geo_filter}").fetchone()[0]
    report["excluded"]["invalidYears"] = db.execute("SELECT count(*) FROM raw_deaths WHERE birth_year IS NULL OR death_year IS NULL OR birth_year<? OR death_year<birth_year", [first_year - 1]).fetchone()[0]
    report["excluded"]["unknownDateInPartialYear"] = db.execute("SELECT count(*) FROM raw_deaths WHERE death_year=? AND death_date IS NULL AND death_year>?", [cutoff_year, full_year]).fetchone()[0]
    report["exclusionCountsMayOverlap"] = True
    report["rawDeaths"] = db.execute("SELECT count(*) FROM raw_deaths").fetchone()[0]
    report["retainedDeaths"] = db.execute("SELECT count(*) FROM filtered WHERE duplicate=1").fetchone()[0]
    db.execute("CREATE TABLE events AS SELECT key,sexe AS sex,birth_year AS year,death_year,count(*) AS deaths FROM filtered WHERE duplicate=1 GROUP BY ALL")
    observations = {}
    for key, sex, year, death_year, deaths in db.execute("SELECT * FROM events ORDER BY death_year").fetchall():
        observations.setdefault((key, sex, year), []).append([death_year, deaths])
    pooled = {(key, sex, year): (int(births), variants) for key, sex, year, births, variants in db.execute("SELECT * FROM pooled").fetchall()}
    report["unmatchedDeathGroups"] = sum(k not in pooled for k in observations)

    source_info = [{"title": "Prénoms INSEE", "url": names_url, "sha256": fingerprint(names_path), "modified": names_meta["modified"]},
                   {"title": "Décès data.gouv.fr / INSEE", "url": death_resource["url"], "sha256": fingerprint(deaths_path), "modified": death_resource["last_modified"]},
                   {"title": "Quotients de mortalité INSEE", "url": q_url, "sha256": fingerprint(q_path)},
                   {"title": "Espérance de vie INSEE", "url": e_url, "sha256": fingerprint(e_path)}]
    version = hashlib.sha256(json.dumps([source_info, cutoff, max_year, first_year, mortality["year"], fingerprint(__file__), fingerprint(Path(__file__).with_name("lifetable.py"))], sort_keys=True).encode()).hexdigest()[:16]
    staging = output.with_name(output.name + ".staging")
    shutil.rmtree(staging, ignore_errors=True)
    staging.mkdir(parents=True)
    top = {}
    source_rows = db.execute("SELECT name,sex,year,births,rank,key FROM births ORDER BY year,sex,rank,name").fetchall()
    by_year = {}
    for name, sex, year, births, rank, key in source_rows:
        if year >= first_year:
            by_year.setdefault(year, []).append([name, sex, births, rank])
            if rank <= 10:
                top.setdefault(str(year), {"M": [], "F": []})[sex].append([name, births, rank])
    for year, records in by_year.items():
        obs = {}
        for key, sex in {(clean_name(r[0]), r[1]) for r in records}:
            count, variants = pooled[key, sex, year]
            series = observations.get((key, sex, year), [])
            total = sum(x[1] for x in series)
            status = available_observation(year, count, total, coverage_start)
            previous = pooled.get((key, sex, year - 1))
            obs[f"{sex}:{key}"] = {"births": count, "variants": variants, "deaths": series if status == "available" else [],
                                     "status": status, "previousBirths": previous[0] if previous else None,
                                     "earlyCoverageWarning": coverage_start <= year <= incomplete_through}
        write_json(staging / "cohorts" / f"{year}.json", {"version": version, "year": year, "names": records, "observations": obs})
    write_json(staging / "top.json", {"version": version, "years": top})
    manifest = {"schemaVersion": 1, "version": version, "generatedAt": datetime.now(timezone.utc).isoformat(),
                "birthYears": sorted(by_year), "deathsThrough": cutoff,
                "deathsCoverageStart": coverage_start, "incompleteCoverageThrough": incomplete_through,
                "minObservationBirths": MIN_OBSERVATION_BIRTHS,
                "sources": source_info, "mortality": mortality}
    write_json(staging / "manifest.json", manifest)
    write_json(staging / "quality-report.json", report)
    validate_snapshot(staging)
    # La génération échouée ne doit jamais écraser le dernier snapshot valide.
    backup = output.with_name(output.name + ".previous")
    shutil.rmtree(backup, ignore_errors=True)
    if output.exists():
        output.replace(backup)
    try:
        staging.replace(output)
    except BaseException:
        if backup.exists():
            backup.replace(output)
        raise
    shutil.rmtree(backup, ignore_errors=True)
    db.close()
    work_dir.cleanup()
    print(f"Snapshot {version} : {min(by_year)}–{max_year}, décès au {cutoff}", flush=True)


def validate_snapshot(path):
    manifest = json.loads((path / "manifest.json").read_text())
    assert manifest["schemaVersion"] == 1
    years = manifest["birthYears"]
    assert years == list(range(years[0], years[-1] + 1))
    coverage_start = manifest["deathsCoverageStart"]
    assert json.loads((path / "top.json").read_text())["version"] == manifest["version"]
    for year in years:
        cohort = json.loads((path / "cohorts" / f"{year}.json").read_text())
        assert cohort["version"] == manifest["version"]
        assert cohort["year"] == year and cohort["names"]
        for row in cohort["names"]:
            assert len(row) == 4 and row[1] in ("M", "F") and row[2] > 0 and row[3] > 0
        for obs in cohort["observations"].values():
            if obs["status"] == "available":
                assert year >= coverage_start and 0 <= sum(x[1] for x in obs["deaths"]) <= obs["births"]
        assert (path / "cohorts" / f"{year}.json").stat().st_size < MAX_COHORT_BYTES


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--cache", type=Path, default=ROOT / ".cache/data")
    parser.add_argument("--output", type=Path, default=ROOT / "public/data")
    parser.add_argument("--offline", action="store_true")
    parser.add_argument("--first-year", type=int, default=FIRST_BIRTH_YEAR)
    parser.add_argument("--validate", type=Path)
    parser.add_argument("--stamp", action="store_true", help="afficher l'empreinte des sources amont sans les télécharger")
    args = parser.parse_args()
    if args.validate:
        validate_snapshot(args.validate)
    elif args.stamp:
        print(source_stamp(args.cache.resolve(), args.offline))
    else:
        build(args.cache.resolve(), args.output.resolve(), args.offline, args.first_year)
