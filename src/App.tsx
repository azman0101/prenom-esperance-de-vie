import React, { useState, useMemo, useEffect, Suspense, lazy } from 'react';
import { ShinyHeader } from './components/ShinyHeader';
import { ControlDock } from './components/ControlDock';
import { computeNameStats, ComputedNameStats } from './data/demographics';

// Lazy-load heavy 3D WebGL renderer and modal views to improve LCP and reduce initial main-thread compilation
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

export default function App() {
  // Authoritative Compared Names List
  const [namesList, setNamesList] = useState<string[]>([
    'Stéphane',
    'Alexandre',
    'Kevin',
    'Sandrine',
  ]);
  const [userPrimaryName, setUserPrimaryName] = useState('Stéphane');
  const [birthYear, setBirthYear] = useState(1970);
  const [gender, setGender] = useState<'M' | 'F' | 'X'>('M');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // 3D Camera & Display State
  const [activeTab, setActiveTab] = useState<'3d' | 'curves' | 'topNames'>('3d');
  const [viewMode, setViewMode] = useState<'overview' | 'comparison' | 'closeUp'>('overview');
  const [cameraTrigger, setCameraTrigger] = useState(0);
  const [isAutoRotate, setIsAutoRotate] = useState(false);

  // Modals
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);
  const [isTopNamesOpen, setIsTopNamesOpen] = useState(false);

  // Defer WebGL scene initialization until after first UI paint to minimize LCP render delay
  const [is3DReady, setIs3DReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setIs3DReady(true), 40);
    return () => window.clearTimeout(timer);
  }, []);

  // Compute Actuarial & Demographic Data for all compared names
  const computedStatsList: ComputedNameStats[] = useMemo(() => {
    return namesList.map((name, idx) => {
      // First name follows the user-selected gender, others use their natural gender
      const g = idx === 0 && gender !== 'X' ? gender : undefined;
      return computeNameStats(name, birthYear, g);
    });
  }, [namesList, birthYear, gender]);

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
  };

  const isAnyModalOpen = activeTab === 'curves' || isTopNamesOpen || isMethodologyOpen;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a0f1d] text-white">
      {/* 1. Full-Bleed 3D Scene Viewport (Deferred & Lazy-Loaded) */}
      {is3DReady && (
        <Suspense fallback={<div className="absolute inset-0 bg-[#0a0f1d]" />}>
          <ThreeDemographicScene
            names={computedStatsList}
            selectedIndex={selectedIndex}
            onSelectName={setSelectedIndex}
            isAutoRotate={isAutoRotate}
            viewMode={viewMode}
            cameraTrigger={cameraTrigger}
            isPaused={isAnyModalOpen}
          />
        </Suspense>
      )}

      {/* 2. Shiny Navigation Header */}
      <ShinyHeader
        birthYear={birthYear}
        setBirthYear={setBirthYear}
        totalCompared={computedStatsList.length}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'topNames') {
            setIsTopNamesOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        onOpenMethodology={() => setIsMethodologyOpen(true)}
        onOpenTopNames={() => setIsTopNamesOpen(true)}
      />

      {/* 3. Unified Collapsible Bottom Control Dock (Zero Viewport Occlusion) */}
      <ControlDock
        names={computedStatsList}
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
        onOpenTopNames={() => setIsTopNamesOpen(true)}
      />

      {/* 4. Lazy-Loaded Modals */}
      <Suspense fallback={null}>
        {activeTab === 'curves' && (
          <SurvivalCurveModal
            names={computedStatsList}
            birthYear={birthYear}
            setBirthYear={setBirthYear}
            onClose={() => setActiveTab('3d')}
          />
        )}

        {isTopNamesOpen && (
          <CohortTopNamesModal
            birthYear={birthYear}
            setBirthYear={setBirthYear}
            currentlyCompared={namesList}
            onAddName={handleAddComparisonName}
            onApplyPreset={handleApplyPreset}
            onClose={() => setIsTopNamesOpen(false)}
          />
        )}

        {isMethodologyOpen && (
          <MethodologyModal onClose={() => setIsMethodologyOpen(false)} />
        )}
      </Suspense>
    </div>
  );
}
