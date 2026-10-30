import React, { useState, useMemo } from 'react';
import { ThreeDemographicScene } from './components/ThreeDemographicScene';
import { ShinyHeader } from './components/ShinyHeader';
import { ControlDock } from './components/ControlDock';
import { DemographicDetailPanel } from './components/DemographicDetailPanel';
import { SurvivalCurveModal } from './components/SurvivalCurveModal';
import { CohortTopNamesModal } from './components/CohortTopNamesModal';
import { MethodologyModal } from './components/MethodologyModal';
import { computeNameStats, ComputedNameStats } from './data/demographics';

export default function App() {
  // Primary User Profile State
  const [userPrimaryName, setUserPrimaryName] = useState('Stéphane');
  const [birthYear, setBirthYear] = useState(1970);
  const [gender, setGender] = useState<'M' | 'F' | 'X'>('M');

  // Compared Names List (Defaults inspired by Coulmont's 1970 study cohort)
  const [comparedNamesList, setComparedNamesList] = useState<string[]>([
    'Stéphane',
    'Alexandre',
    'Kevin',
    'Sandrine',
  ]);

  const [selectedIndex, setSelectedIndex] = useState(0);

  // 3D Camera & Display State
  const [activeTab, setActiveTab] = useState<'3d' | 'curves' | 'topNames'>('3d');
  const [viewMode, setViewMode] = useState<'overview' | 'comparison' | 'closeUp'>('overview');
  const [cameraTrigger, setCameraTrigger] = useState(0);
  const [isAutoRotate, setIsAutoRotate] = useState(false);

  // Modals
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);
  const [isTopNamesOpen, setIsTopNamesOpen] = useState(false);

  // Synchronize primary user name in compared list (first item)
  const effectiveComparedList = useMemo(() => {
    const trimmed = userPrimaryName.trim() || 'Stéphane';
    const rest = comparedNamesList.filter(
      (n, idx) => idx > 0 && n.toLowerCase() !== trimmed.toLowerCase()
    );
    return [trimmed, ...rest];
  }, [userPrimaryName, comparedNamesList]);

  // Compute Actuarial & Demographic Data for all compared names
  const computedStatsList: ComputedNameStats[] = useMemo(() => {
    return effectiveComparedList.map((name, idx) => {
      // First name follows the user-selected gender, others use their natural gender
      const g = idx === 0 && gender !== 'X' ? gender : undefined;
      return computeNameStats(name, birthYear, g);
    });
  }, [effectiveComparedList, birthYear, gender]);

  // Handlers for adding/removing names
  const handleAddComparisonName = (rawName: string) => {
    const trimmed = rawName.trim();
    if (!trimmed) return;
    if (effectiveComparedList.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      // Highlight existing
      const existingIdx = effectiveComparedList.findIndex(
        (n) => n.toLowerCase() === trimmed.toLowerCase()
      );
      setSelectedIndex(existingIdx);
      return;
    }
    const updated = [...effectiveComparedList, trimmed];
    setComparedNamesList(updated);
    setSelectedIndex(updated.length - 1);
  };

  const handleRemoveComparisonName = (indexToRemove: number) => {
    if (effectiveComparedList.length <= 1) return;
    const updated = effectiveComparedList.filter((_, idx) => idx !== indexToRemove);
    setComparedNamesList(updated);
    if (selectedIndex >= updated.length) {
      setSelectedIndex(updated.length - 1);
    }
  };

  const handleApplyPreset = (names: string[], presetYear?: number) => {
    if (names.length === 0) return;
    if (presetYear !== undefined) {
      setBirthYear(presetYear);
    }
    setUserPrimaryName(names[0]);
    setComparedNamesList(names);
    setSelectedIndex(0);
  };

  const selectedStat = computedStatsList[selectedIndex] || computedStatsList[0];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a0f1d] text-white">
      {/* 1. Full-Bleed 3D Scene Viewport */}
      <ThreeDemographicScene
        names={computedStatsList}
        selectedIndex={selectedIndex}
        onSelectName={setSelectedIndex}
        isAutoRotate={isAutoRotate}
        viewMode={viewMode}
        cameraTrigger={cameraTrigger}
      />

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
        setUserPrimaryName={setUserPrimaryName}
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

      {/* 5. Survival Curves Modal / Full View */}
      {activeTab === 'curves' && (
        <SurvivalCurveModal
          names={computedStatsList}
          birthYear={birthYear}
          setBirthYear={setBirthYear}
          onClose={() => setActiveTab('3d')}
        />
      )}

      {/* 6. Top Names for Cohort Modal */}
      {isTopNamesOpen && (
        <CohortTopNamesModal
          birthYear={birthYear}
          setBirthYear={setBirthYear}
          currentlyCompared={effectiveComparedList}
          onAddName={handleAddComparisonName}
          onApplyPreset={handleApplyPreset}
          onClose={() => setIsTopNamesOpen(false)}
        />
      )}

      {/* 7. Methodology & Insee Research Modal */}
      {isMethodologyOpen && (
        <MethodologyModal onClose={() => setIsMethodologyOpen(false)} />
      )}
    </div>
  );
}
