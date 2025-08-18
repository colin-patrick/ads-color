export interface CustomStep {
  position: number;  // Position in color generation curve (e.g., 1, 1.5, 2, 9.5, 10, 11)
  tokenName: string; // Name used in Token Studio export (e.g., "95", "85", "90")
}

export interface PaletteControls {
  baseHue: number;
  lightnessMin: number;
  lightnessMax: number;
  chromaMode: 'manual' | 'curve';
  chromaValues: Record<string, number>; // Changed from Record<number, number>
  minChroma: number;
  maxChroma: number;
  chromaPeak: number;
  chromaCurveType: 'flat' | 'gaussian' | 'linear' | 'sine' | 'cubic' | 'quartic';
  chromaEasing?: 'none' | 'ease-in' | 'ease-out' | 'ease-in-out';
  lightHueDrift: number;  // Hue drift for light colors (extended range)
  darkHueDrift: number;   // Hue drift for dark colors (extended range)
  backgroundColor: string;
  // Custom steps array replacing hardcoded 1-11
  steps: CustomStep[];
  // Individual contrast targets for each step
  contrastTargets: Record<string, number>; // Changed from Record<number, number>
  // Individual lightness values - always reflects current effective values (calculated in auto, adjusted in manual)
  lightnessValues: Record<string, number>; // Changed from Record<number, number>
  // Track which lightness values have been manually overridden in manual mode
  lightnessOverrides: Record<string, boolean>; // Changed from Record<number, boolean>
  // Lightness calculation mode - always auto with individual overrides
  lightnessMode: 'auto';
}

export interface PaletteColor {
  step: number; // Keep as number for position in curve calculations
  tokenName: string; // Token name for export (e.g., "95", "85")
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