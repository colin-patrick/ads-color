import { PaletteControls } from '../types';
import { getDefaultSteps, convertToStringRecord } from './migration';

// Professional contrast targets for accessibility
const defaultContrastTargetsNumeric = {
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

// Convert to string keys for new format
const defaultContrastTargets = convertToStringRecord(defaultContrastTargetsNumeric);
// Empty records for auto mode - lightness calculated from contrast targets
const defaultLightnessValues: Record<string, number> = {};
const defaultLightnessOverrides: Record<string, boolean> = {};

export const defaultControls: PaletteControls = {
  baseHue: 247,
  lightnessMin: 0.95,
  lightnessMax: 0.15,
  chromaMode: 'curve',
  chromaValues: convertToStringRecord({
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
  }),
  minChroma: 0.02,
  maxChroma: 0.24,
  chromaPeak: 0.55,
  chromaCurveType: 'gaussian',
  chromaEasing: 'none',
  lightHueDrift: -5,
  darkHueDrift: 5,
  backgroundColor: '#ffffff',
  steps: getDefaultSteps(),
  tokenNames: {},
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
    chromaValues: convertToStringRecord({
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
    }),
    minChroma: 0.02,
    maxChroma: 0.24,
    chromaPeak: 0.55,
    chromaCurveType: 'gaussian',
    chromaEasing: 'none',
    lightHueDrift: -5,
    darkHueDrift: 5,
    backgroundColor: '#ffffff',
    steps: getDefaultSteps(),
    tokenNames: {},
    contrastTargets: defaultContrastTargets,
    lightnessValues: defaultLightnessValues,
    lightnessOverrides: defaultLightnessOverrides,
    lightnessMode: 'auto'
  },
  
  purple: {
    baseHue: 302,
    lightnessMin: 0.97,
    lightnessMax: 0.15,
    chromaMode: 'curve',
    chromaValues: convertToStringRecord({
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
    }),
    minChroma: 0.01,
    maxChroma: 0.24,
    chromaPeak: 0.48,
    chromaCurveType: 'gaussian',
    chromaEasing: 'none',
    lightHueDrift: 0,
    darkHueDrift: 15,
    backgroundColor: '#ffffff',
    steps: getDefaultSteps(),
    tokenNames: {},
    contrastTargets: defaultContrastTargets,
    lightnessValues: defaultLightnessValues,
    lightnessOverrides: defaultLightnessOverrides,
    lightnessMode: 'auto'
  },
  
  error: {
    baseHue: 30,
    lightnessMin: 0.95,
    lightnessMax: 0.15,
    chromaMode: 'curve',
    chromaValues: convertToStringRecord({
      1: 0.02,
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
    }),
    minChroma: 0.015,
    maxChroma: 0.23,
    chromaPeak: 0.44,
    chromaCurveType: 'gaussian',
    chromaEasing: 'none',
    lightHueDrift: -5,
    darkHueDrift: 5,
    backgroundColor: '#ffffff',
    steps: getDefaultSteps(),
    tokenNames: {},
    contrastTargets: defaultContrastTargets,
    lightnessValues: defaultLightnessValues,
    lightnessOverrides: defaultLightnessOverrides,
    lightnessMode: 'auto'
  },
  
  success: {
    baseHue: 151,
    lightnessMin: 0.95,
    lightnessMax: 0.15,
    chromaMode: 'manual',
    chromaValues: convertToStringRecord({
      1: 0.052,
      2: 0.098,
      3: 0.137,
      4: 0.169,
      5: 0.191,
      6: 0.189,
      7: 0.189,
      8: 0.112,
      9: 0.09,
      10: 0.079,
      11: 0.055
    }),
    minChroma: 0.03,
    maxChroma: 0.37,
    chromaPeak: 0.51,
    chromaCurveType: 'gaussian',
    chromaEasing: 'none',
    lightHueDrift: -5,
    darkHueDrift: 5,
    backgroundColor: '#ffffff',
    steps: getDefaultSteps(),
    tokenNames: {},
    contrastTargets: defaultContrastTargets,
    lightnessValues: defaultLightnessValues,
    lightnessOverrides: defaultLightnessOverrides,
    lightnessMode: 'auto'
  },
  
  warning: {
    baseHue: 60,
    lightnessMin: 0.95,
    lightnessMax: 0.15,
    chromaMode: 'curve',
    chromaValues: convertToStringRecord({
      1: 0.02,
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
    }),
    minChroma: 0.02,
    maxChroma: 0.28,
    chromaPeak: 0.5,
    chromaCurveType: 'gaussian',
    chromaEasing: 'none',
    lightHueDrift: 20,
    darkHueDrift: -20,
    backgroundColor: '#ffffff',
    steps: getDefaultSteps(),
    tokenNames: {},
    contrastTargets: defaultContrastTargets,
    lightnessValues: defaultLightnessValues,
    lightnessOverrides: defaultLightnessOverrides,
    lightnessMode: 'auto'
  }
}; 