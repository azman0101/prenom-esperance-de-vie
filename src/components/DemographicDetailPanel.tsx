import React from 'react';
import { NameStats } from '../data/demographics';
import { StatsCard } from './ControlDock';
export const DemographicDetailPanel: React.FC<{
  selectedName: NameStats;
  onClose?: () => void;
}> = ({ selectedName, onClose }) => (
  <aside className="bento-card p-5">
    <button type="button" onClick={onClose} className="text-xs text-slate-400">
      Fermer
    </button>
    <StatsCard item={selectedName} />
  </aside>
);
