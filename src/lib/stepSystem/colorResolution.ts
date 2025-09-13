/**
 * Color Resolution Engine - Implements the inheritance logic for the step system
 * 
 * This engine takes Global Steps + Palette Personality + Step Overrides 
 * and resolves them into final colors using CSS-like inheritance patterns.
 */

import { oklch, formatHex } from 'culori';
import { 
  GlobalStepSettings, 
  PaletteModel, 
  ResolvedPaletteStep, 
  ResolvedPalette,
  GlobalStepDefinition,
  PalettePersonality,
  StepOverride
} from '../../types/stepSystem';
import { calculateChromaFactor } from '../math/curves';
import { generatePalette } from '../palette/generation';

/**
 * Core resolution function - transforms global steps + personality + overrides into final colors
 */
export function resolvePaletteColors(
  globalSettings: GlobalStepSettings,
  palette: PaletteModel
): ResolvedPalette {
  // Sort global steps by position
  const orderedSteps = [...globalSettings.steps].sort((a, b) => a.position - b.position);
  
  // Resolve each step
  const resolvedSteps = orderedSteps.map(globalStep => 
    resolveStep(globalStep, palette.personality, palette.stepOverrides[globalStep.tokenName])
  );
  
  return {
    id: palette.id,
    name: palette.name,
    steps: resolvedSteps,
    generatedAt: new Date(),
    globalStepsVersion: globalSettings.version
  };
}

/**
 * Resolves a single step using inheritance hierarchy
 */
function resolveStep(
  globalStep: GlobalStepDefinition,
  personality: PalettePersonality,
  override?: StepOverride
): ResolvedPaletteStep {
  // Step 1: Compute base values from global step + personality
  const computed = computeStepValues(globalStep, personality);
  
  // Step 2: Apply any overrides (CSS-like inheritance)
  const resolved = {
    lightness: override?.lightness ?? computed.lightness,
    chroma: override?.chroma ?? computed.chroma, 
    hue: override?.hue ?? computed.hue,
    tokenName: override?.tokenName ?? computed.tokenName,
    contrastTarget: computed.contrastTarget // Contrast target cannot be overridden at step level
  };
  
  // Step 3: Generate final color
  const color = generateFinalColor(resolved);
  
  return {
    position: globalStep.position,
    computed,
    overrides: {
      lightness: override?.lightness,
      chroma: override?.chroma,
      hue: override?.hue,
      tokenName: override?.tokenName
    },
    resolved,
    color
  };
}

/**
 * Computes step values by applying personality to global step definition
 */
function computeStepValues(
  globalStep: GlobalStepDefinition,
  personality: PalettePersonality
) {
  // Start with base personality values
  let hue = personality.baseHue;
  let chroma: number;
  
  // Apply hue drift based on step position
  // Note: This is simplified - real implementation would need step index relative to anchor
  const isDarkStep = globalStep.position > 6; // Assuming step 6 is middle
  const isLightStep = globalStep.position < 6;
  
  if (isLightStep) {
    hue += personality.lightHueDrift;
  } else if (isDarkStep) {
    hue += personality.darkHueDrift;
  }
  
  // Normalize hue
  hue = hue % 360;
  if (hue < 0) hue += 360;
  
  // Compute chroma based on chroma mode
  chroma = computeChromaValue(globalStep, personality);
  
  // Compute lightness based on contrast target
  // Note: This is simplified - real implementation would use contrast calculation engine
  const lightness = computeLightnessFromContrast(
    globalStep.contrastTarget, 
    '#ffffff' // TODO: Use globalSettings.contrastBackground
  );
  
  return {
    lightness,
    chroma,
    hue,
    tokenName: globalStep.tokenName,
    contrastTarget: globalStep.contrastTarget
  };
}

/**
 * Computes chroma value based on personality chroma mode
 */
function computeChromaValue(
  globalStep: GlobalStepDefinition,
  personality: PalettePersonality
): number {
  switch (personality.chromaMode) {
    case 'manual':
      // Use manual chroma values if available
      return personality.chromaValues?.[globalStep.tokenName] ?? personality.minChroma;
      
    case 'curve':
    case 'perceptual':
      // Calculate chroma using curve algorithm
      // Note: This is simplified - real implementation needs full step array context
      const distance = Math.abs((globalStep.position / 11) - personality.chromaPeak);
      const chromaFactor = calculateChromaFactor(
        distance,
        personality.chromaCurveType,
        personality.chromaEasing
      );
      return personality.minChroma + (personality.maxChroma - personality.minChroma) * chromaFactor;
      
    default:
      return personality.minChroma;
  }
}

/**
 * Simplified lightness computation from contrast target
 * Note: This is a placeholder - real implementation would use the full contrast calculation engine
 */
function computeLightnessFromContrast(
  contrastTarget: number,
  backgroundColor: string
): number {
  // Simplified approximation for now
  // Real implementation would use the existing contrast calculation logic
  if (contrastTarget <= 1.5) return 0.95;
  if (contrastTarget <= 2.0) return 0.85;
  if (contrastTarget <= 3.0) return 0.7;
  if (contrastTarget <= 5.0) return 0.5;
  if (contrastTarget <= 10.0) return 0.3;
  return 0.2;
}

/**
 * Generates final color values from resolved step values
 */
function generateFinalColor(resolved: {
  lightness: number;
  chroma: number;
  hue: number;
  contrastTarget: number;
}) {
  // Create OKLCH color
  const oklchColor = oklch({
    mode: 'oklch',
    l: resolved.lightness,
    c: resolved.chroma,
    h: resolved.hue
  });
  
  // Generate CSS hex value
  const css = formatHex(oklchColor) || '#000000';
  
  // Format OKLCH string
  const oklchStr = `oklch(${(resolved.lightness * 100).toFixed(2)}% ${resolved.chroma.toFixed(3)} ${resolved.hue.toFixed(2)})`;
  
  return {
    css,
    oklch: oklchStr,
    contrast: resolved.contrastTarget // Placeholder - would calculate actual contrast
  };
}

/**
 * Utility: Interpolates contrast target for new step insertion
 */
export function interpolateContrastTarget(
  position: number,
  globalSteps: GlobalStepDefinition[]
): number {
  const sortedSteps = [...globalSteps].sort((a, b) => a.position - b.position);
  
  // Find adjacent steps
  let lowerStep: GlobalStepDefinition | undefined;
  let upperStep: GlobalStepDefinition | undefined;
  
  for (const step of sortedSteps) {
    if (step.position < position) {
      lowerStep = step;
    } else if (step.position > position && !upperStep) {
      upperStep = step;
      break;
    }
  }
  
  // Interpolate between adjacent steps
  if (lowerStep && upperStep) {
    const ratio = (position - lowerStep.position) / (upperStep.position - lowerStep.position);
    return lowerStep.contrastTarget + (upperStep.contrastTarget - lowerStep.contrastTarget) * ratio;
  } else if (lowerStep) {
    // Extrapolate from lower step
    return Math.min(lowerStep.contrastTarget * 1.5, 21);
  } else if (upperStep) {
    // Extrapolate from upper step
    return Math.max(upperStep.contrastTarget * 0.7, 1.1);
  } else {
    // Default fallback
    return 4.5;
  }
}