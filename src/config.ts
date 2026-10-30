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
export const DEFAULT_COMPARED_NAMES: readonly string[] = ['Stéphane', 'Alexandre', 'Kevin', 'Sandrine'];

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

// ---------------------------------------------------------------------------
// Modèle de prénom (data/demographics.ts → computeNameStats)
// ---------------------------------------------------------------------------

export const NAME_MODEL = {
  /** Terminaisons utilisées pour deviner le genre d'un prénom absent de la base. */
  femaleEndings: ['e', 'a', 'ine', 'elle', 'ie', 'ette', 'ence'],
  /** Bornes de la survie ajustée (fraction de 1) pour éviter 0 % / 100 %. */
  survivalBounds: { min: 0.001, max: 0.999 },
  /** Courbe de naissances estimée : max / (1 + (écart_au_pic / spread)²), plancher `minBirths`. */
  births: { knownPeak: 15000, spread: 8, minBirths: 120 },
  /** Prénoms personnalisés : paramètres dérivés d'un hash déterministe du prénom. */
  custom: {
    /** Amplitude totale du gain/perte d'espérance de vie (années), centrée sur 0. */
    lifeExpDeltaSpan: 5,
    /** Sensibilité du hazard ratio à l'écart d'espérance de vie : HR = 1 - delta × slope. */
    hazardSlope: 0.1,
    /** Seuil (années) au-delà duquel le profil devient « diplômé » ou « populaire ». */
    profileThresholdYears: 1.2,
    peakYear: { base: 1945, span: 65 },
    maxBirths: { base: 3200, span: 6800 },
    rank: { slope: 2.2, offset: 10, min: 8, max: 98 },
    /** Palette attribuée par hash aux prénoms personnalisés. */
    palette: ['#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4'],
    accentHex: '#cbd5e1',
  },
  /** Rang estimé des prénoms de la base selon l'écart à leur décennie pic. */
  knownRank: { nearYears: 5, farSlope: 2.5, farOffset: 6, farMax: 95 },
} as const;

// ---------------------------------------------------------------------------
// Courbes de survie (components/SurvivalCurveModal.tsx)
// ---------------------------------------------------------------------------

export const SURVIVAL_CHART = {
  /** Vue « focus » : l'axe démarre N ans avant l'âge actuel. */
  focusLeadYears: 5,
  /** Âge maximal affiché au minimum, et marge ajoutée au-dessus de l'âge actuel. */
  minMaxAge: 105,
  maxAgeMargin: 10,
  minAgeSpan: 10,
  /** Pas des graduations de l'axe des âges (plus fin quand l'étendue est courte). */
  tickStep: { fine: 5, coarse: 10, fineMaxSpan: 65 },
  /** Pas des boutons de saut d'année de naissance. */
  yearJump: 5,
  svg: { width: 720, height: 330, padding: { top: 34, right: 36, bottom: 46, left: 55 } },
  /** Weibull/Gompertz simplifié : S(age) = exp(-(age / (espérance + thetaOffset))^beta × HR). */
  model: { thetaOffset: 3, beta: 7.8 },
} as const;

// ---------------------------------------------------------------------------
// Rendu 3D (components/ThreeDemographicScene.tsx)
// ---------------------------------------------------------------------------

export const SCENE_RENDER = {
  /** Plafond de la boucle de rendu (économie GPU / thermique). */
  fpsLimit: 30,
  /** Plafond du devicePixelRatio sur écrans haute densité. */
  maxPixelRatio: 1.25,
  /** Ratio de pixels forcé en rendu logiciel (SwiftShader). */
  softwarePixelRatio: 1,
} as const;
