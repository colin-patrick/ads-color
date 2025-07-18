import { PaletteControls } from '../types';

// Professional contrast targets for accessibility
const defaultContrastTargets = {
  50: 1.1,
  100: 1.3,
  200: 1.7,
  300: 2.3,
  400: 3.2,
  500: 4.5,  // AA compliance
  600: 6.7,
  700: 9.3,  // AAA compliance
  800: 13.1,
  900: 15.2,
  950: 17.2
};

// Professional lightness values for better contrast
const defaultLightnessValues = {
  50: 0.97,
  100: 0.91,
  200: 0.83,
  300: 0.73,
  400: 0.65,
  500: 0.56,
  600: 0.49,
  700: 0.41,
  800: 0.32,
  900: 0.26,
  950: 0.22
};

export const defaultControls: PaletteControls = {
  baseHue: 247,
  lightnessMin: 0.95,
  lightnessMax: 0.15,
  chromaMode: 'smooth',
  chromaValues: {
    50: 0.01,
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
  maxChroma: 0.24,
  chromaPeak: 0.55,
  lightHueDrift: -5,
  darkHueDrift: 5,
  backgroundColor: '#ffffff',
  contrastTargets: defaultContrastTargets,
  lightnessValues: defaultLightnessValues
};

export const presets: { [key: string]: PaletteControls } = {
  blue: {
    baseHue: 247,
    lightnessMin: 0.95,
    lightnessMax: 0.15,
    chromaMode: 'smooth',
    chromaValues: {
      50: 0.01,
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
    maxChroma: 0.24,
    chromaPeak: 0.55,
    lightHueDrift: -5,
    darkHueDrift: 5,
    backgroundColor: '#ffffff',
    contrastTargets: defaultContrastTargets,
    lightnessValues: {
      50: 0.97,
      100: 0.91,
      200: 0.83,
      300: 0.73,
      400: 0.65,
      500: 0.56,
      600: 0.49,
      700: 0.41,
      800: 0.32,
      900: 0.26,
      950: 0.22
    }
  },
  
  purple: {
    baseHue: 302,
    lightnessMin: 0.97,
    lightnessMax: 0.15,
    chromaMode: 'smooth',
    chromaValues: {
      50: 0.01,
      100: 0.04,
      200: 0.08,
      300: 0.11,
      400: 0.13,
      500: 0.15,
      600: 0.16,
      700: 0.14,
      800: 0.12,
      900: 0.09,
      950: 0.07
    },
    maxChroma: 0.24,
    chromaPeak: 0.48,
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
    }
  },
  
  error: {
    baseHue: 30,
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
    maxChroma: 0.23,
    chromaPeak: 0.44,
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
    }
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
    maxChroma: 0.37,
    chromaPeak: 0.51,
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
    }
  },
  
  warning: {
    baseHue: 60,
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
    maxChroma: 0.28,
    chromaPeak: 0.5,
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
    }
  }
}; 