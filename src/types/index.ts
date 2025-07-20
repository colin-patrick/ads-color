export interface PaletteControls {
  baseHue: number;
  lightnessMin: number;
  lightnessMax: number;
  chromaMode: 'manual' | 'smooth' | 'vibrant';
  chromaValues: Record<number, number>;
  maxChroma: number;
  chromaPeak: number;
  lightHueDrift: number;  // Hue drift for light colors (50-400)
  darkHueDrift: number;   // Hue drift for dark colors (600-950)
  backgroundColor: string;
  // Individual contrast targets for each step
  contrastTargets: {
    50: number;
    100: number;
    200: number;
    300: number;
    400: number;
    500: number;
    600: number;
    700: number;
    800: number;
    900: number;
    950: number;
  };
  // Individual lightness values for manual adjustment
  lightnessValues: Record<number, number>;
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
  enforceGamut: boolean;
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