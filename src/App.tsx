import { useState, useMemo, useEffect, useRef, Suspense, lazy } from 'react';
import { ShinyHeader, ScrollySectionId } from './components/ShinyHeader';
import { ControlDock, BentoComparatorSection } from './components/ControlDock';
import { computeNameStats, NameStats, Dataset, Manifest, Cohort, TopNames, readData, clampBirthYear } from './data/demographics';
import { DEFAULT_BIRTH_YEAR, DEFAULT_COMPARED_NAMES, SCENE_MOUNT_DELAY_MS, NAME_COLORS } from './config';

// Lazy-load heavy 3D WebGL renderer and scrollytelling sections to optimize initial LCP
const ThreeDemographicScene = lazy(() =>
  import('./components/ThreeDemographicScene').then((m) => ({ default: m.ThreeDemographicScene }))
);
const SurvivalCurveModal = lazy(() =>
  import('./components/SurvivalCurveModal').then((m) => ({ default: m.SurvivalCurveModal }))
);
const CohortTopNamesModal = lazy(() =>
  import('./components/CohortTopNamesModal').then((m) => ({ default: m.CohortTopNamesModal }))
);
const MethodologyModal = lazy(() =>
  import('./components/MethodologyModal').then((m) => ({ default: m.MethodologyModal }))
);

const SECTION_DOM_IDS: Record<ScrollySectionId, string> = {
  '3d': 'section-3d',
  bento: 'section-bento',
  curves: 'section-curves',
  topNames: 'section-top-names',
  methodology: 'section-methodology',
};

export default function App() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [top, setTop] = useState<TopNames>({});
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [dataError, setDataError] = useState('');
  const [reload, setReload] = useState(0);
  // Authoritative Compared Names List
  const [namesList, setNamesList] = useState<string[]>([...DEFAULT_COMPARED_NAMES]);
  const [userPrimaryName, setUserPrimaryName] = useState(DEFAULT_COMPARED_NAMES[0]);
  const [birthYear, setBirthYearState] = useState(DEFAULT_BIRTH_YEAR);
  const setBirthYear = (year: number) => setBirthYearState(manifest ? clampBirthYear(year, manifest.birthYears) : year);
  const [gender, setGender] = useState<'M' | 'F' | 'X'>('M');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Scrollytelling Active Section & 3D Camera State
  const [activeSection, setActiveSection] = useState<ScrollySectionId>('3d');
  const [is3dInViewport, setIs3dInViewport] = useState(true);
  const [viewMode, setViewMode] = useState<'overview' | 'comparison' | 'closeUp'>('overview');
  const [cameraTrigger, setCameraTrigger] = useState(0);
  const [isAutoRotate, setIsAutoRotate] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Defer WebGL scene initialization until after first UI paint to minimize LCP render delay
  const [is3DReady, setIs3DReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setIs3DReady(true), SCENE_MOUNT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setDataError('');
    Promise.all([readData<Manifest>('manifest.json', controller.signal), readData<{ version: string; years: TopNames }>('top.json', controller.signal)])
      .then(([meta, rankings]) => {
        if (meta.schemaVersion !== 1 || !meta.birthYears?.length) throw new Error('Format des données non reconnu.');
        if (rankings.version !== meta.version) throw new Error('Le snapshot vient de changer. Réessayez pour charger la version actuelle.');
        setManifest(meta); setTop(rankings.years);
        setBirthYearState(y => clampBirthYear(y, meta.birthYears));
      }).catch(error => { if (error.name !== 'AbortError') setDataError(error.message); });
    return () => controller.abort();
  }, [reload]);
  useEffect(() => {
    if (!manifest) return;
    const controller = new AbortController();
    setDataset(null); setDataError('');
    readData<Cohort>('cohorts/' + birthYear + '.json', controller.signal)
      .then(cohort => {
        if (cohort.version !== manifest.version) throw new Error('Les données viennent d’être actualisées. Réessayez.');
        if (cohort.year !== birthYear) throw new Error('Cohorte incohérente.');
        setDataset({ manifest, cohort });
      }).catch(error => { if (error.name !== 'AbortError') setDataError(error.message); });
    return () => controller.abort();
  }, [manifest, birthYear, reload]);
  const computedStatsList: NameStats[] = useMemo(() => {
    if (!dataset || dataset.cohort.year !== birthYear) return [];
    return namesList.map((name, idx) => ({ ...computeNameStats(name, birthYear, dataset, idx === 0 && gender !== 'X' ? gender : undefined), colorHex: NAME_COLORS[idx % NAME_COLORS.length] }));
  }, [namesList, birthYear, gender, dataset]);

  // IntersectionObserver to sync Floating Glass Dock active state, fade-in Bento sections, and pause WebGL offscreen
  useEffect(() => {
    const rootEl = scrollContainerRef.current;
    if (!rootEl) return;

    const sectionEntries = new Map<string, number>();

    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.id;
          sectionEntries.set(id, entry.isIntersecting ? entry.intersectionRatio : 0);

          if (id === 'section-3d') {
            setIs3dInViewport(entry.isIntersecting && entry.intersectionRatio > 0.08);
          }

          if (entry.isIntersecting && entry.target.classList.contains('bento-section')) {
            entry.target.classList.add('visible');
          }
        });

        // Pick section with highest visibility ratio
        let bestId: ScrollySectionId | null = null;
        let bestRatio = 0;
        (Object.entries(SECTION_DOM_IDS) as [ScrollySectionId, string][]).forEach(([secKey, domId]) => {
          const ratio = sectionEntries.get(domId) || 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = secKey;
          }
        });

        if (bestId && bestRatio > 0.12) {
          setActiveSection(bestId);
        }
      },
      {
        root: rootEl,
        threshold: [0.05, 0.15, 0.3, 0.5, 0.75],
      }
    );

    const observeSections = () => {
      Object.values(SECTION_DOM_IDS).forEach((domId) => {
        const el = document.getElementById(domId);
        if (el) navObserver.observe(el);
      });
    };

    observeSections();
    const retryTimer = window.setTimeout(observeSections, 350);

    return () => {
      window.clearTimeout(retryTimer);
      navObserver.disconnect();
    };
  }, [manifest, dataset]);

  const handleNavigateSection = (target: ScrollySectionId) => {
    setActiveSection(target);
    const domId = SECTION_DOM_IDS[target];
    const el = document.getElementById(domId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Synchronize user primary name input with namesList[0]
  const handleUserPrimaryNameChange = (newName: string) => {
    setUserPrimaryName(newName);
    const trimmed = newName.trim();
    if (!trimmed) return;
    setNamesList((prev) => {
      if (prev.length === 0) return [trimmed];
      const copy = [...prev];
      copy[0] = trimmed;
      return copy;
    });
  };

  // Handlers for adding/removing names
  const handleAddComparisonName = (rawName: string) => {
    const trimmed = rawName.trim();
    if (!trimmed) return;
    const existingIdx = namesList.findIndex((n) => n.toLowerCase() === trimmed.toLowerCase());
    if (existingIdx !== -1) {
      setSelectedIndex(existingIdx);
      return;
    }
    const updated = [...namesList, trimmed];
    setNamesList(updated);
    if (updated.length === 1) {
      setUserPrimaryName(trimmed);
    }
    setSelectedIndex(updated.length - 1);
  };

  const handleRemoveComparisonName = (indexToRemove: number) => {
    const updated = namesList.filter((_, idx) => idx !== indexToRemove);
    setNamesList(updated);
    if (updated.length > 0) {
      setUserPrimaryName(updated[0]);
    } else {
      setUserPrimaryName('');
    }
    if (selectedIndex >= updated.length) {
      setSelectedIndex(Math.max(0, updated.length - 1));
    }
  };

  const handleApplyPreset = (presetNames: string[], presetYear?: number) => {
    if (presetNames.length === 0) return;
    if (presetYear !== undefined) {
      setBirthYear(presetYear);
    }
    setUserPrimaryName(presetNames[0]);
    setNamesList(presetNames);
    setSelectedIndex(0);
    handleNavigateSection('3d');
  };

  if (!manifest) return <main className="min-h-screen flex flex-col items-center justify-center gap-4 text-slate-300"><h1 className="text-2xl">Prénoms & Longévité</h1><p role="status">{dataError || 'Chargement des données officielles…'}</p>{dataError && <button type="button" onClick={() => setReload(r => r + 1)} className="bg-sky-700 rounded-lg p-3">Réessayer</button>}</main>;
  return (
    <div
      ref={scrollContainerRef}
      className="smooth-scroll-container relative w-screen h-screen bg-[#060911] text-white"
    >
      {/* Sticky Glassmorphic Navigation Dock */}
      <ShinyHeader
        years={manifest.birthYears}
        birthYear={birthYear}
        setBirthYear={setBirthYear}
        totalCompared={computedStatsList.length}
        activeSection={activeSection}
        onNavigateSection={handleNavigateSection}
      />

      <div className="max-w-7xl mx-auto px-6 text-xs text-slate-400" role="status">Naissances INSEE jusqu’en {manifest.birthYears.at(-1)} · décès enregistrés au {manifest.deathsThrough} · projections aux conditions {manifest.mortality.year}.
        {(!dataset || dataset.cohort.year !== birthYear) && <p className="mt-2 text-amber-200">{dataError || 'Chargement de la cohorte…'}{dataError && <button type="button" className="underline ml-3" onClick={() => setReload(r => r + 1)}>Réessayer</button>}</p>}
      </div>
      {/* Section 1: Interactive 3D Viewport + Integrated Stage Control Dock */}
      <section
        id="section-3d"
        aria-label="Visualisation Piliers 3D"
        className="relative w-full min-h-[86vh] h-[86vh] shrink-0 overflow-hidden border-b border-white/[0.06] -mt-16 pt-16"
      >
        {is3DReady && (
          <Suspense fallback={<div className="absolute inset-0 bg-[#0a0f1d]" />}>
            <ThreeDemographicScene
              names={computedStatsList}
              selectedIndex={selectedIndex}
              onSelectName={setSelectedIndex}
              isAutoRotate={isAutoRotate}
              viewMode={viewMode}
              cameraTrigger={cameraTrigger}
              isPaused={!is3dInViewport}
            />
          </Suspense>
        )}

        <ControlDock
          names={computedStatsList}
          manifest={manifest}
          suggestions={dataset?.cohort.names.map(r => r[0]) ?? []}
          userPrimaryName={userPrimaryName}
          setUserPrimaryName={handleUserPrimaryNameChange}
          birthYear={birthYear}
          setBirthYear={setBirthYear}
          gender={gender}
          setGender={setGender}
          selectedIndex={selectedIndex}
          setSelectedIndex={setSelectedIndex}
          onAddComparisonName={handleAddComparisonName}
          onRemoveComparisonName={handleRemoveComparisonName}
          isAutoRotate={isAutoRotate}
          setIsAutoRotate={setIsAutoRotate}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onTriggerCameraReset={() => setCameraTrigger((c) => c + 1)}
          onOpenTopNames={() => handleNavigateSection('topNames')}
        />
      </section>

      {/* Section 2: Asymmetrical Bento Grid Comparator & Sociological Studio */}
      <section
        id="section-bento"
        aria-label="Studio Comparatif Bento"
        className="bento-section visible scroll-mt-44 lg:scroll-mt-32"
      >
        <BentoComparatorSection
          names={computedStatsList}
          manifest={manifest}
          suggestions={dataset?.cohort.names.map(r => r[0]) ?? []}
          userPrimaryName={userPrimaryName}
          setUserPrimaryName={handleUserPrimaryNameChange}
          birthYear={birthYear}
          setBirthYear={setBirthYear}
          gender={gender}
          setGender={setGender}
          selectedIndex={selectedIndex}
          setSelectedIndex={setSelectedIndex}
          onAddComparisonName={handleAddComparisonName}
          onRemoveComparisonName={handleRemoveComparisonName}
          isAutoRotate={isAutoRotate}
          setIsAutoRotate={setIsAutoRotate}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onTriggerCameraReset={() => setCameraTrigger((c) => c + 1)}
          onOpenTopNames={() => handleNavigateSection('topNames')}
        />
      </section>

      {/* Section 3: Inline Survival Curves & Actuarial Matrix */}
      <section
        id="section-curves"
        aria-label="Courbes de Survie"
        className="bento-section visible scroll-mt-44 lg:scroll-mt-32"
      >
        <Suspense fallback={<div className="max-w-7xl mx-auto px-6 py-12 text-slate-400 text-sm">Chargement des courbes de survie...</div>}>
          <SurvivalCurveModal
            names={computedStatsList}
            manifest={manifest}
            birthYear={birthYear}
            setBirthYear={setBirthYear}
          />
        </Suspense>
      </section>

      {/* Section 4: Inline Cohort Top Names & Generation Presets */}
      <section
        id="section-top-names"
        aria-label="Palmarès des Prénoms"
        className="bento-section visible scroll-mt-44 lg:scroll-mt-32"
      >
        <Suspense fallback={<div className="max-w-7xl mx-auto px-6 py-12 text-slate-400 text-sm">Chargement du palmarès...</div>}>
          <CohortTopNamesModal
            manifest={manifest}
            top={top}
            birthYear={birthYear}
            setBirthYear={setBirthYear}
            currentlyCompared={namesList}
            onAddName={handleAddComparisonName}
            onApplyPreset={handleApplyPreset}
          />
        </Suspense>
      </section>

      {/* Section 5: Inline Sociological & Actuarial Methodology */}
      <section
        id="section-methodology"
        aria-label="Méthodologie et Sources"
        className="bento-section visible scroll-mt-44 lg:scroll-mt-32"
      >
        <Suspense fallback={<div className="max-w-7xl mx-auto px-6 py-12 text-slate-400 text-sm">Chargement de la méthodologie...</div>}>
          <MethodologyModal manifest={manifest} />
        </Suspense>
      </section>
    </div>
  );
}

