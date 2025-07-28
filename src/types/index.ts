export interface PaletteControls {
  baseHue: number;
  lightnessMin: number;
  lightnessMax: number;
  chromaMode: 'manual' | 'curve';
  chromaValues: Record<number, number>;
  minChroma: number;
  maxChroma: number;
  chromaPeak: number;
  chromaCurveType: 'flat' | 'gaussian' | 'linear' | 'sine' | 'cubic' | 'quartic';
  chromaEasing?: 'none' | 'ease-in' | 'ease-out' | 'ease-in-out';
  lightHueDrift: number;  // Hue drift for light colors (steps 1-5)
  darkHueDrift: number;   // Hue drift for dark colors (steps 7-11)
  backgroundColor: string;
  // Individual contrast targets for each step
  contrastTargets: Record<number, number>;
  // Individual lightness values - always reflects current effective values (calculated in auto, adjusted in manual)
  lightnessValues: Record<number, number>;
  // Track which lightness values have been manually overridden in manual mode
  lightnessOverrides: Record<number, boolean>;
  // Lightness calculation mode - always auto with individual overrides
  lightnessMode: 'auto';
}

export interface PaletteColor {
  step: number;
  lightness: number;
  chroma: number;
  hue: number;
  oklch: string;
  css: string;
  contrast: number;
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

export interface PrecisionSettings {
  lightness: {
    step: number;
    displayDecimals: number;
  };
  chroma: {
    step: number;
    displayDecimals: number;
  };
  hue: {
    step: number;
    displayDecimals: number;
  };
}

export const DEFAULT_PRECISION: PrecisionSettings = {
  lightness: { step: 0.0001, displayDecimals: 2 },
  chroma: { step: 0.001, displayDecimals: 3 },
  hue: { step: 0.1, displayDecimals: 2 }
};

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