import { PaletteControls } from '../types';

// Professional contrast targets for accessibility
const defaultContrastTargets = {
  1: 1.1,
  2: 1.3,
  3: 1.7,
  4: 2.3,
  5: 3.2,
  6: 4.5,  // AA compliance
  7: 6.7,
  8: 9.3,  // AAA compliance
  9: 13.1,
  10: 15.2,
  11: 17.2
};

// Professional lightness values for better contrast
const defaultLightnessValues = {
  1: 0.97,
  2: 0.91,
  3: 0.83,
  4: 0.73,
  5: 0.65,
  6: 0.56,
  7: 0.49,
  8: 0.41,
  9: 0.32,
  10: 0.26,
  11: 0.22
};

// Default lightness overrides - all false since we start in auto mode
const defaultLightnessOverrides = {
  1: false,
  2: false,
  3: false,
  4: false,
  5: false,
  6: false,
  7: false,
  8: false,
  9: false,
  10: false,
  11: false
};

export const defaultControls: PaletteControls = {
  baseHue: 247,
  lightnessMin: 0.95,
  lightnessMax: 0.15,
  chromaMode: 'curve',
  chromaValues: {
    1: 0.01,
    2: 0.05,
    3: 0.08,
    4: 0.11,
    5: 0.13,
    6: 0.15,
    7: 0.16,
    8: 0.14,
    9: 0.12,
    10: 0.10,
    11: 0.08
  },
  minChroma: 0.02,
  maxChroma: 0.24,
  chromaPeak: 0.55,
  chromaCurveType: 'gaussian',
  chromaEasing: 'none',
  lightHueDrift: -5,
  darkHueDrift: 5,
  backgroundColor: '#ffffff',
  contrastTargets: defaultContrastTargets,
  lightnessValues: defaultLightnessValues,
  lightnessOverrides: defaultLightnessOverrides,
  lightnessMode: 'auto'
};

export const presets: { [key: string]: PaletteControls } = {
  blue: {
    baseHue: 247,
    lightnessMin: 0.95,
    lightnessMax: 0.15,
    chromaMode: 'curve',
    chromaValues: {
      1: 0.01,
      2: 0.05,
      3: 0.08,
      4: 0.11,
      5: 0.13,
      6: 0.15,
      7: 0.16,
      8: 0.14,
      9: 0.12,
      10: 0.10,
      11: 0.08
    },
    minChroma: 0.02,
    maxChroma: 0.24,
    chromaPeak: 0.55,
    chromaCurveType: 'gaussian',
    chromaEasing: 'none',
    lightHueDrift: -5,
    darkHueDrift: 5,
    backgroundColor: '#ffffff',
    contrastTargets: defaultContrastTargets,
    lightnessValues: {
      1: 0.97,
      2: 0.91,
      3: 0.83,
      4: 0.73,
      5: 0.65,
      6: 0.56,
      7: 0.49,
      8: 0.41,
      9: 0.32,
      10: 0.26,
      11: 0.22
    },
    lightnessOverrides: defaultLightnessOverrides,
    lightnessMode: 'auto'
  },
  
  purple: {
    baseHue: 302,
    lightnessMin: 0.97,
    lightnessMax: 0.15,
    chromaMode: 'curve',
    chromaValues: {
      1: 0.01,
      2: 0.04,
      3: 0.08,
      4: 0.11,
      5: 0.13,
      6: 0.15,
      7: 0.16,
      8: 0.14,
      9: 0.12,
      10: 0.09,
      11: 0.07
    },
    minChroma: 0.01,
    maxChroma: 0.24,
    chromaPeak: 0.48,
    chromaCurveType: 'gaussian',
    chromaEasing: 'none',
    lightHueDrift: 0,
    darkHueDrift: 15,
    backgroundColor: '#ffffff',
    contrastTargets: defaultContrastTargets,
    lightnessValues: {
      50: 0.97,
      100: 0.91,
      200: 0.83,
      300: 0.76,
      400: 0.67,
      500: 0.59,
      600: 0.5,
      700: 0.42,
      800: 0.32,
      900: 0.27,
      950: 0.23
    },
    lightnessOverrides: defaultLightnessOverrides,
    lightnessMode: 'auto'
  },
  
  error: {
    baseHue: 30,
    lightnessMin: 0.95,
    lightnessMax: 0.15,
    chromaMode: 'curve',
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
    minChroma: 0.015,
    maxChroma: 0.23,
    chromaPeak: 0.44,
    chromaCurveType: 'gaussian',
    chromaEasing: 'none',
    lightHueDrift: -5,
    darkHueDrift: 5,
    backgroundColor: '#ffffff',
    contrastTargets: defaultContrastTargets,
    lightnessValues: {
      50: 0.97,
      100: 0.92,
      200: 0.84,
      300: 0.75,
      400: 0.67,
      500: 0.59,
      600: 0.5,
      700: 0.41,
      800: 0.32,
      900: 0.27,
      950: 0.23
    },
    lightnessOverrides: defaultLightnessOverrides,
    lightnessMode: 'auto'
  },
  
  success: {
    baseHue: 151,
    lightnessMin: 0.95,
    lightnessMax: 0.15,
    chromaMode: 'manual',
    chromaValues: {
      50: 0.052,
      100: 0.098,
      200: 0.137,
      300: 0.169,
      400: 0.191,
      500: 0.189,
      600: 0.189,
      700: 0.112,
      800: 0.09,
      900: 0.079,
      950: 0.055
    },
    minChroma: 0.03,
    maxChroma: 0.37,
    chromaPeak: 0.51,
    chromaCurveType: 'gaussian',
    chromaEasing: 'none',
    lightHueDrift: -5,
    darkHueDrift: 5,
    backgroundColor: '#ffffff',
    contrastTargets: defaultContrastTargets,
    lightnessValues: {
      50: 0.95,
      100: 0.9,
      200: 0.82,
      300: 0.72,
      400: 0.63,
      500: 0.55,
      600: 0.46,
      700: 0.39,
      800: 0.3,
      900: 0.26,
      950: 0.22
    },
    lightnessOverrides: defaultLightnessOverrides,
    lightnessMode: 'auto'
  },
  
  warning: {
    baseHue: 60,
    lightnessMin: 0.95,
    lightnessMax: 0.15,
    chromaMode: 'curve',
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
    minChroma: 0.02,
    maxChroma: 0.28,
    chromaPeak: 0.5,
    chromaCurveType: 'gaussian',
    chromaEasing: 'none',
    lightHueDrift: 20,
    darkHueDrift: -20,
    backgroundColor: '#ffffff',
    contrastTargets: defaultContrastTargets,
    lightnessValues: {
      50: 0.9671120588933685,
      100: 0.9116559261129418,
      200: 0.8279919808823784,
      300: 0.75,
      400: 0.66,
      500: 0.58,
      600: 0.48,
      700: 0.41,
      800: 0.32,
      900: 0.27,
      950: 0.23
    },
    lightnessOverrides: defaultLightnessOverrides,
    lightnessMode: 'auto'
  }
}; 