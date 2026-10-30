import React, { useState } from 'react';
import { clampBirthYear } from '../data/demographics';

interface YearInputProps {
  year: number;
  years: number[];
  onChange: (year: number) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * Champ d'année qui laisse saisir librement : une année complète et valide est appliquée
 * immédiatement, toute autre saisie est ramenée dans les bornes à la validation (Entrée / perte de focus).
 */
export const YearInput: React.FC<YearInputProps> = ({ year, years, onChange, ariaLabel, className }) => {
  const [draft, setDraft] = useState<string | null>(null);
  const [min, max] = [years[0], years[years.length - 1]];
  const commit = () => {
    if (draft !== null && draft.trim() !== '') onChange(clampBirthYear(Number(draft), years));
    setDraft(null);
  };
  return (
    <input
      type="number"
      aria-label={ariaLabel}
      min={min}
      max={max}
      value={draft ?? year}
      className={className}
      onChange={(e) => {
        const text = e.target.value;
        const value = Number(text);
        if (text.trim() !== '' && Number.isInteger(value) && value >= min && value <= max) {
          onChange(value);
          setDraft(null);
        } else {
          setDraft(text);
        }
      }}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && commit()}
    />
  );
};
