export interface PaletteControls {
  baseHue: number;
  lightnessMin: number;
  lightnessMax: number;
  chromaMode: 'manual' | 'curve' | 'perceptual';
  chromaValues: Record<string, number>;
  minChroma: number;
  maxChroma: number;
  chromaPeak: number;
  chromaCurveType: 'flat' | 'gaussian' | 'linear' | 'sine' | 'cubic' | 'quartic';
  chromaEasing?: 'none' | 'ease-in' | 'ease-out' | 'ease-in-out';
  lightHueDrift: number;  // Hue drift for light colors (extended range)
  darkHueDrift: number;   // Hue drift for dark colors (extended range)
  backgroundColor: string;
  // Steps array: 0 (white), 1-11 (core palette), 12 (black), plus intermediate steps (0.5, 1.5, etc.)
  steps: number[];
  // Custom token names for intermediate steps (core steps use standard names)
  tokenNames?: Record<string, string>;
  // Individual contrast targets for each step (excluding 0 and 12 which are pure white/black)
  contrastTargets: Record<string, number>;
  // Individual lightness values - always reflects current effective values (calculated in auto, adjusted in manual)
  lightnessValues: Record<string, number>;
  // Track which lightness values have been manually overridden in manual mode
  lightnessOverrides: Record<string, boolean>;
  // Lightness calculation mode - always auto with individual overrides
  lightnessMode: 'auto';
}

export interface PaletteColor {
  step: number; // Step position (0, 1, 1.5, 2, ..., 11, 12)
  tokenName: string; // Auto-generated token name for export (e.g., "white", "95", "95-90", "black")
  lightness: number;
  chroma: number;
  hue: number;
  oklch: string;
  css: string;
  contrast: number;
  // New transparency properties
  gamutMapped: boolean;
  originalIntended?: { l: number; c: number; h: number };
  achievableChroma?: number;
  maxPossibleChroma?: number;
}

export interface Palette {
  id: string;
  name: string;
  controls: PaletteControls;
  colors: PaletteColor[];
  createdAt: Date;
  updatedAt: Date;
  steps?: number[]; // Optional for future extensibility
}

export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'oklch'

export interface ColorFormatValue {
  hex: string;
  rgb: string;
  hsl: string;
  oklch: string;
}

export interface ContrastResult {
  ratio: number;
  wcagAA: boolean;
  wcagAAA: boolean;
  wcagAALarge: boolean;
  wcagAAALarge: boolean;
}

export type ColorGamut = 'sRGB' | 'P3' | 'Rec2020' | 'Wide';

export interface GamutValidation {
  withinGamut: boolean;
  detectedGamut: ColorGamut | null;
  requiresGamut: ColorGamut | null;
  clamped: boolean;
}

export interface GamutSettings {
  gamutMode: 'sRGB' | 'P3' | 'Rec2020';
}

export interface LightnessSettings {
  mode: 'contrast' | 'range';
}

export interface AppState {
  palettes: Palette[];
  activePaletteId: string | null;
  colorFormat: ColorFormat;
  contrastAnalysis: {
    enabled: boolean;
    selectedColor: string;
    showCompliance: boolean;
  };
  gamutSettings: GamutSettings;
  lightnessSettings: LightnessSettings;
} 