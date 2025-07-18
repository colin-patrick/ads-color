import { PaletteControls } from '../types';

// Default contrast targets that roughly follow a typical scale
const defaultContrastTargets = {
  50: 1.05,
  100: 1.15,
  200: 1.5,
  300: 2.0,
  400: 3.0,
  500: 4.5,  // AA compliance
  600: 6.0,
  700: 7.0,  // AAA compliance
  800: 10.0,
  900: 15.0,
  950: 20.0
};

// Default lightness values (will be used as starting point)
const defaultLightnessValues = {
  50: 0.95,
  100: 0.90,
  200: 0.80,
  300: 0.70,
  400: 0.60,
  500: 0.50,
  600: 0.40,
  700: 0.30,
  800: 0.25,
  900: 0.20,
  950: 0.15
};

export const defaultControls: PaletteControls = {
  baseHue: 220,
  lightnessMin: 0.95,
  lightnessMax: 0.15,
  chromaMode: 'smooth',
  chromaValues: {
    50: 0.02,
    100: 0.05,
    200: 0.08,
    300: 0.11,
    400: 0.13,
    500: 0.15,
    600: 0.16,
    700: 0.14,
    800: 0.12,
    900: 0.10,
    950: 0.08
  },
  maxChroma: 0.15,
  chromaPeak: 0.5,
  lightHueDrift: 0,
  darkHueDrift: 15,
  contrastMode: false,
  backgroundColor: '#ffffff',
  contrastTargets: defaultContrastTargets,
  lightnessValues: defaultLightnessValues,
  gamutMode: 'sRGB',
  enforceGamut: false
};

export const presets: { [key: string]: PaletteControls } = {
  blue: {
    baseHue: 220,
    lightnessMin: 0.95,
    lightnessMax: 0.15,
    chromaMode: 'smooth',
    chromaValues: {
      50: 0.02,
      100: 0.05,
      200: 0.08,
      300: 0.11,
      400: 0.13,
      500: 0.15,
      600: 0.16,
      700: 0.14,
      800: 0.12,
      900: 0.10,
      950: 0.08
    },
    maxChroma: 0.15,
    chromaPeak: 0.5,
    lightHueDrift: 0,
    darkHueDrift: 15,
    contrastMode: false,
    backgroundColor: '#ffffff',
    contrastTargets: defaultContrastTargets,
    lightnessValues: defaultLightnessValues,
    gamutMode: 'sRGB',
    enforceGamut: false
  },
  
  red: {
    baseHue: 0,
    lightnessMin: 0.95,
    lightnessMax: 0.15,
    chromaMode: 'smooth',
    chromaValues: {
      50: 0.02,
      100: 0.05,
      200: 0.08,
      300: 0.11,
      400: 0.13,
      500: 0.15,
      600: 0.16,
      700: 0.14,
      800: 0.12,
      900: 0.10,
      950: 0.08
    },
    maxChroma: 0.15,
    chromaPeak: 0.5,
    lightHueDrift: 0,
    darkHueDrift: 10,
    contrastMode: false,
    backgroundColor: '#ffffff',
    contrastTargets: defaultContrastTargets,
    lightnessValues: defaultLightnessValues,
    gamutMode: 'sRGB',
    enforceGamut: false
  },
  
  green: {
    baseHue: 140,
    lightnessMin: 0.95,
    lightnessMax: 0.15,
    chromaMode: 'smooth',
    chromaValues: {
      50: 0.02,
      100: 0.05,
      200: 0.08,
      300: 0.11,
      400: 0.13,
      500: 0.15,
      600: 0.16,
      700: 0.14,
      800: 0.12,
      900: 0.10,
      950: 0.08
    },
    maxChroma: 0.15,
    chromaPeak: 0.5,
    lightHueDrift: 0,
    darkHueDrift: 20,
    contrastMode: false,
    backgroundColor: '#ffffff',
    contrastTargets: defaultContrastTargets,
    lightnessValues: defaultLightnessValues,
    gamutMode: 'sRGB',
    enforceGamut: false
  },
  
  purple: {
    baseHue: 280,
    lightnessMin: 0.95,
    lightnessMax: 0.15,
    chromaMode: 'smooth',
    chromaValues: {
      50: 0.02,
      100: 0.05,
      200: 0.08,
      300: 0.11,
      400: 0.13,
      500: 0.15,
      600: 0.16,
      700: 0.14,
      800: 0.12,
      900: 0.10,
      950: 0.08
    },
    maxChroma: 0.15,
    chromaPeak: 0.5,
    lightHueDrift: 0,
    darkHueDrift: 25,
    contrastMode: false,
    backgroundColor: '#ffffff',
    contrastTargets: defaultContrastTargets,
    lightnessValues: defaultLightnessValues,
    gamutMode: 'sRGB',
    enforceGamut: false
  },
  
  orange: {
    baseHue: 35,
    lightnessMin: 0.95,
    lightnessMax: 0.15,
    chromaMode: 'vibrant',
    chromaValues: {
      50: 0.03,
      100: 0.06,
      200: 0.09,
      300: 0.12,
      400: 0.15,
      500: 0.17,
      600: 0.18,
      700: 0.16,
      800: 0.14,
      900: 0.12,
      950: 0.10
    },
    maxChroma: 0.18,
    chromaPeak: 0.6,
    lightHueDrift: 0,
    darkHueDrift: 5,
    contrastMode: false,
    backgroundColor: '#ffffff',
    contrastTargets: defaultContrastTargets,
    lightnessValues: defaultLightnessValues,
    gamutMode: 'sRGB',
    enforceGamut: false
  },

  yellow: {
    baseHue: 60,
    lightnessMin: 0.95,
    lightnessMax: 0.15,
    chromaMode: 'smooth',
    chromaValues: {
      50: 0.03,
      100: 0.06,
      200: 0.09,
      300: 0.12,
      400: 0.15,
      500: 0.17,
      600: 0.18,
      700: 0.16,
      800: 0.14,
      900: 0.12,
      950: 0.10
    },
    maxChroma: 0.18,
    chromaPeak: 0.5,
    lightHueDrift: 0,     // Keep light colors yellow
    darkHueDrift: 30,     // Make dark colors more orange
    contrastMode: false,
    backgroundColor: '#ffffff',
    contrastTargets: defaultContrastTargets,
    lightnessValues: defaultLightnessValues,
    gamutMode: 'sRGB',
    enforceGamut: false
  }
}; 