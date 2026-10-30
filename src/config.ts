/**
 * Paramètres centralisés de l'application : valeurs par défaut, presets,
 * paramètres des modèles et du rendu. Aucune dépendance vers le reste de `src/`
 * (les bornes de dates de naissance sont, elles, dérivées des données dans
 * `data/demographics.ts`).
 */

/** Année « courante » utilisée pour calculer les âges et libeller les taux de survie. */
export const REFERENCE_YEAR = new Date().getFullYear();

// ---------------------------------------------------------------------------
// État initial de l'application
// ---------------------------------------------------------------------------

export const DEFAULT_BIRTH_YEAR = 1970;
export const DEFAULT_COMPARED_NAMES: readonly string[] = [
  'Stéphane',
  'Alexandre',
  'Kevin',
  'Sandrine',
];

/** Délai avant montage de la scène WebGL, pour laisser passer le premier rendu de l'UI (ms). */
export const SCENE_MOUNT_DELAY_MS = 40;

// ---------------------------------------------------------------------------
// Presets de générations (palmarès)
// ---------------------------------------------------------------------------

export interface GenerationPreset {
  id: string;
  label: string;
  year: number;
  names: readonly string[];
  /** Classes Tailwind complètes (pas de concaténation : elles doivent rester détectables au build). */
  titleClass: string;
}

export const GENERATION_PRESETS: readonly GenerationPreset[] = [
  {
    id: 'baby-boom',
    label: 'Baby-Boom',
    year: 1950,
    names: ['Jean', 'Marie', 'Michel', 'Françoise'],
    titleClass: 'text-emerald-400 group-hover:text-emerald-300',
  },
  {
    id: 'generation-y',
    label: 'Génération Y',
    year: 1985,
    names: ['Nicolas', 'Julien', 'Aurélie', 'Céline'],
    titleClass: 'text-amber-400 group-hover:text-amber-300',
  },
  {
    id: 'xxi-siecle',
    label: 'XXIe Siècle',
    year: 2015,
    names: ['Gabriel', 'Emma', 'Lucas', 'Louise'],
    titleClass: 'text-pink-400 group-hover:text-pink-300',
  },
];

export const SCENE_RENDER = {
  fpsLimit: 30,
  maxPixelRatio: 1.25,
  softwarePixelRatio: 1,
} as const;
export const NAME_COLORS = ['#38bdf8', '#34d399', '#c084fc', '#fb7185', '#fbbf24', '#22d3ee'];
