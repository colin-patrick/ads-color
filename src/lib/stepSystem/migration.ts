/**
 * Migration utilities to convert existing palette data to new step system format
 * 
 * This handles the conversion from the current scattered property format
 * to the new normalized global step registry + palette model format.
 */

import { 
  GlobalStepSettings, 
  GlobalStepDefinition, 
  PaletteModel, 
  PalettePersonality,
  StepOverride
} from '../../types/stepSystem';
import { PaletteControls, Palette } from '../../types';

/**
 * Extracts global step settings from a collection of existing palettes
 * This analyzes all palettes to determine the common step structure
 */
export function extractGlobalStepSettings(existingPalettes: Palette[]): GlobalStepSettings {
  // Analyze all palettes to find the common step structure
  const stepAnalysis = analyzeStepsAcrossPalettes(existingPalettes);
  
  // Create global step definitions
  const steps: GlobalStepDefinition[] = stepAnalysis.commonSteps.map(stepInfo => ({
    tokenName: stepInfo.tokenName,
    contrastTarget: stepInfo.averageContrastTarget,
    position: stepInfo.position
  }));
  
  return {
    steps: steps.sort((a, b) => a.position - b.position),
    contrastBackground: '#ffffff', // Default background from existing system
    version: '1.0',
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * Converts an existing palette to the new palette model format
 */
export function migratePaletteToModel(
  existingPalette: Palette,
  globalSettings: GlobalStepSettings
): PaletteModel {
  const controls = existingPalette.controls;
  
  // Extract personality from controls
  const personality: PalettePersonality = {
    baseHue: controls.baseHue,
    chromaMode: controls.chromaMode || 'curve',
    chromaCurveType: controls.chromaCurveType || 'gaussian',
    minChroma: controls.minChroma || 0.05,
    maxChroma: controls.maxChroma || 0.2,
    chromaPeak: controls.chromaPeak || 0.5,
    chromaEasing: controls.chromaEasing || 'none',
    lightHueDrift: controls.lightHueDrift || 0,
    darkHueDrift: controls.darkHueDrift || 0,
    chromaValues: controls.chromaValues
  };
  
  // Extract step overrides
  const stepOverrides: Record<string, StepOverride> = {};
  
  // Check for lightness overrides
  if (controls.lightnessOverrides && controls.lightnessValues) {
    Object.entries(controls.lightnessOverrides).forEach(([stepKey, isOverridden]) => {
      if (isOverridden && controls.lightnessValues![stepKey] !== undefined) {
        if (!stepOverrides[stepKey]) stepOverrides[stepKey] = {};
        stepOverrides[stepKey].lightness = controls.lightnessValues![stepKey];
      }
    });
  }
  
  // Check for custom token names
  if (controls.tokenNames) {
    Object.entries(controls.tokenNames).forEach(([stepKey, tokenName]) => {
      if (!stepOverrides[stepKey]) stepOverrides[stepKey] = {};
      stepOverrides[stepKey].tokenName = tokenName;
    });
  }
  
  return {
    id: existingPalette.id,
    name: existingPalette.name,
    personality,
    stepOverrides,
    createdAt: existingPalette.createdAt || new Date(),
    updatedAt: existingPalette.updatedAt || new Date()
  };
}

/**
 * Analyzes steps across all palettes to determine common structure
 */
function analyzeStepsAcrossPalettes(palettes: Palette[]) {
  const stepMap = new Map<string, {
    tokenName: string;
    position: number;
    contrastTargets: number[];
    count: number;
  }>();
  
  // Default token mapping for core steps
  const defaultTokenMapping: Record<number, string> = {
    0: '100', 1: '95', 2: '90', 3: '80', 4: '70', 5: '60', 6: '50',
    7: '40', 8: '30', 9: '20', 10: '15', 11: '10', 12: '0'
  };
  
  palettes.forEach(palette => {
    const controls = palette.controls;
    const steps = controls.steps || [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const contrastTargets = controls.contrastTargets || {};
    const tokenNames = controls.tokenNames || {};
    
    steps.forEach(step => {
      // Determine token name (custom or default)
      const tokenName = tokenNames[step.toString()] || defaultTokenMapping[step] || step.toString();
      
      // Get contrast target
      const contrastTarget = contrastTargets[step.toString()] || getDefaultContrastTarget(step);
      
      const key = `${step}-${tokenName}`;
      
      if (stepMap.has(key)) {
        const existing = stepMap.get(key)!;
        existing.contrastTargets.push(contrastTarget);
        existing.count++;
      } else {
        stepMap.set(key, {
          tokenName,
          position: step,
          contrastTargets: [contrastTarget],
          count: 1
        });
      }
    });
  });
  
  // Find common steps (appear in most palettes)
  const totalPalettes = palettes.length;
  const commonSteps = Array.from(stepMap.values())
    .filter(step => step.count >= Math.ceil(totalPalettes * 0.5)) // Appears in at least 50% of palettes
    .map(step => ({
      tokenName: step.tokenName,
      position: step.position,
      averageContrastTarget: step.contrastTargets.reduce((a, b) => a + b, 0) / step.contrastTargets.length
    }));
  
  return { commonSteps };
}

/**
 * Gets default contrast target for a step position
 */
function getDefaultContrastTarget(step: number): number {
  const defaults: Record<number, number> = {
    0: 1, 1: 1.1, 2: 1.3, 3: 1.7, 4: 2.3, 5: 3.2, 6: 4.5,
    7: 6.7, 8: 9.3, 9: 13.1, 10: 15.2, 11: 17.2, 12: 21
  };
  
  return defaults[step] || 4.5;
}

/**
 * Converts new format back to legacy format (for testing/compatibility)
 */
export function convertToLegacyFormat(
  globalSettings: GlobalStepSettings,
  paletteModel: PaletteModel
): PaletteControls {
  const personality = paletteModel.personality;
  const overrides = paletteModel.stepOverrides;
  
  // Build steps array
  const steps = globalSettings.steps.map(step => step.position);
  
  // Build contrast targets
  const contrastTargets: Record<string, number> = {};
  globalSettings.steps.forEach(step => {
    contrastTargets[step.position.toString()] = step.contrastTarget;
  });
  
  // Build lightness overrides and values
  const lightnessOverrides: Record<string, boolean> = {};
  const lightnessValues: Record<string, number> = {};
  
  Object.entries(overrides).forEach(([stepKey, override]) => {
    if (override.lightness !== undefined) {
      lightnessOverrides[stepKey] = true;
      lightnessValues[stepKey] = override.lightness;
    }
  });
  
  // Build token names (only custom ones)
  const tokenNames: Record<string, string> = {};
  Object.entries(overrides).forEach(([stepKey, override]) => {
    if (override.tokenName !== undefined) {
      tokenNames[stepKey] = override.tokenName;
    }
  });
  
  return {
    baseHue: personality.baseHue,
    chromaMode: personality.chromaMode,
    chromaCurveType: personality.chromaCurveType,
    minChroma: personality.minChroma,
    maxChroma: personality.maxChroma,
    chromaPeak: personality.chromaPeak,
    chromaEasing: personality.chromaEasing,
    lightHueDrift: personality.lightHueDrift,
    darkHueDrift: personality.darkHueDrift,
    chromaValues: personality.chromaValues || {},
    backgroundColor: globalSettings.contrastBackground,
    contrastTargets,
    steps,
    lightnessOverrides,
    lightnessValues,
    tokenNames,
    // Default values for compatibility
    lightnessMin: 0.95,
    lightnessMax: 0.15,
    lightnessMode: 'auto',
    sourceColorActive: null
  };
}