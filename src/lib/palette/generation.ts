import { oklch, formatHex, wcagContrast, interpolate, parse } from 'culori';
import { PaletteControls, PaletteColor } from '../../types';
import { clampColorToGamut, findMaxChromaForLightness } from '../color/gamut';
import { calculateChromaAwareLightness } from '../color/contrast';
import { formatOklchWithCulori, isValidColor } from '../color/core';
import { calculateChromaFactor } from '../math/curves';

/**
 * Core palette generation logic and algorithms.
 * Contains the main business logic of the color system application.
 */

/**
 * Token Studio mapping from step numbers to token names
 */
const STEP_TO_TOKEN_MAPPING: Record<number, string> = {
  0: '100',
  1: '95',
  2: '90',
  3: '80',
  4: '70',
  5: '60',
  6: '50',
  7: '40',
  8: '30',
  9: '20',
  10: '15',
  11: '10',
  12: '0'
};

/**
 * Generate token name for a step
 */
function generateTokenName(step: number, customTokenNames?: Record<string, string>): string {
  // Check for custom token name first
  if (customTokenNames?.[step.toString()]) {
    return customTokenNames[step.toString()];
  }
  
  // Core steps have predefined names
  if (STEP_TO_TOKEN_MAPPING[step]) {
    return STEP_TO_TOKEN_MAPPING[step];
  }
  
  // Intermediate steps: generate based on neighboring core steps
  const floor = Math.floor(step);
  const ceil = Math.ceil(step);
  
  if (floor === ceil) {
    // Shouldn't happen, but fallback
    return `step-${step}`;
  }
  
  const floorToken = STEP_TO_TOKEN_MAPPING[floor] || floor.toString();
  const ceilToken = STEP_TO_TOKEN_MAPPING[ceil] || ceil.toString();
  
  return `${floorToken}-${ceilToken}`;
}

/**
 * Check if a step is a color step (1-11, not white/black endpoints)
 */
function isColorStep(step: number): boolean {
  return Number.isInteger(step) && step >= 1 && step <= 11;
}

/**
 * Calculate chroma factor for perceptual mode using gamut-aware curve mapping
 * In perceptual mode, minChroma and maxChroma are treated as percentages (0-1) of the available chroma
 */
export function calculateGamutAwareChromaFactor(
  lightness: number,
  hue: number,
  distance: number,
  curveType: string,
  minChroma: number,
  maxChroma: number,
  gamut: 'sRGB' | 'P3' | 'Rec2020' = 'sRGB',
  easing: string = 'none'
): number {
  // Find the maximum available chroma for this lightness/hue combination
  const maxAvailableChroma = findMaxChromaForLightness(lightness, hue, gamut);
  
  // Treat minChroma and maxChroma as percentages of the available chroma
  // Clamp to valid percentage range (0-1)
  const minChromaPercent = Math.max(0, Math.min(1, minChroma));
  const maxChromaPercent = Math.max(0, Math.min(1, maxChroma));
  
  // Ensure maxChromaPercent is at least as large as minChromaPercent
  const effectiveMaxChromaPercent = Math.max(minChromaPercent, maxChromaPercent);
  
  // Convert percentages to actual chroma values
  const effectiveMinChroma = maxAvailableChroma * minChromaPercent;
  const effectiveMaxChroma = maxAvailableChroma * effectiveMaxChromaPercent;
  
  // Apply the curve within the effective range
  const curveFactor = calculateChromaFactor(distance, curveType, easing);
  
  return effectiveMinChroma + (effectiveMaxChroma - effectiveMinChroma) * curveFactor;
}

/**
 * Resolve relative palette background color references
 * Converts "palette-X" values to actual CSS colors from the current palette
 */
export function resolveBackgroundColor(
  backgroundColor: string, 
  existingPalette?: PaletteColor[], 
  fallbackColor: string = '#ffffff'
): string {
  // If it's not a relative palette reference, return as-is
  if (!backgroundColor.startsWith('palette-')) {
    // Validate that it's a proper color format using Culori's built-in validation
    if (!isValidColor(backgroundColor)) {
      console.warn(`Invalid color format: ${backgroundColor}. Using fallback: ${fallbackColor}`);
      return fallbackColor;
    }
    return backgroundColor;
  }
  
  // Extract step number from "palette-X" format
  const stepMatch = backgroundColor.match(/^palette-(\d+)$/);
  if (!stepMatch) {
    console.warn(`Invalid palette reference format: ${backgroundColor}. Using fallback: ${fallbackColor}`);
    return fallbackColor;
  }
  
  const stepNumber = parseInt(stepMatch[1], 10);
  
  // Validate step number is within valid range
  if (stepNumber < 1 || stepNumber > 11) {
    console.warn(`Invalid step number ${stepNumber} in ${backgroundColor}. Must be 1-11. Using fallback: ${fallbackColor}`);
    return fallbackColor;
  }
  
  // If no existing palette is provided, use fallback
  if (!existingPalette || existingPalette.length === 0) {
    console.warn(`No palette available to resolve ${backgroundColor}. Using fallback: ${fallbackColor}`);
    return fallbackColor;
  }
  
  // Find the color for the requested step
  const targetColor = existingPalette.find(color => color.step === stepNumber);
  if (!targetColor) {
    console.warn(`Step ${stepNumber} not found in palette for ${backgroundColor}. Using fallback: ${fallbackColor}`);
    return fallbackColor;
  }
  
  // Validate the resolved color using Culori's built-in validation
  if (!isValidColor(targetColor.css)) {
    console.warn(`Resolved color ${targetColor.css} for ${backgroundColor} is invalid. Using fallback: ${fallbackColor}`);
    return fallbackColor;
  }
  
  return targetColor.css;
}

/**
 * Interpolate between two colors for intermediate steps using Culori's built-in interpolation
 */
function interpolateColors(color1: PaletteColor, color2: PaletteColor, ratio: number, targetStep: number, gamutMode: 'sRGB' | 'P3' | 'Rec2020' = 'sRGB'): PaletteColor {
  // Create OKLCH color objects for interpolation
  const oklchColor1 = oklch({
    mode: 'oklch',
    l: color1.lightness,
    c: color1.chroma,
    h: color1.hue
  });
  
  const oklchColor2 = oklch({
    mode: 'oklch',
    l: color2.lightness,
    c: color2.chroma,
    h: color2.hue
  });
  
  // Use Culori's interpolate function for better hue interpolation
  const interpolator = interpolate([oklchColor1, oklchColor2], 'oklch');
  const interpolatedColor = interpolator(ratio);
  
  // Use interpolated values directly from Culori
  const roundedLightness = interpolatedColor?.l || 0;
  const roundedChroma = interpolatedColor?.c || 0;
  const roundedHue = interpolatedColor?.h || 0;
  
  // Apply gamut clamping to prevent hue shifts during RGB conversion
  const clampedResult = clampColorToGamut(
    { l: roundedLightness, c: roundedChroma, h: roundedHue },
    gamutMode
  );
  
  // Track if gamut mapping occurred
  const wasGamutMapped = clampedResult.clamped;
  
  // Create final OKLCH color with clamped values
  const finalOklchColor = oklch({
    mode: 'oklch',
    l: clampedResult.l,
    c: clampedResult.c,
    h: clampedResult.h
  });
  
  const cssColor = formatHex(finalOklchColor) || '#000000';
  
  // Interpolate contrast (though this might not be perfectly accurate)
  const contrast = color1.contrast + (color2.contrast - color1.contrast) * ratio;
  
  // CRITICAL: Get the ACTUAL OKLCH values from the generated hex (round-trip verification)
  const parsedHexColor = parse(cssColor);
  const verifiedOklch = oklch(parsedHexColor);
  const actualL = verifiedOklch?.l || clampedResult.l;
  const actualC = verifiedOklch?.c || clampedResult.c;
  const actualH = verifiedOklch?.h || clampedResult.h;

  return {
    step: targetStep,
    tokenName: generateTokenName(targetStep),
    lightness: actualL,     // ACTUAL values from hex round-trip
    chroma: actualC,        // ACTUAL values from hex round-trip
    hue: actualH,           // ACTUAL values from hex round-trip
    oklch: formatOklchWithCulori({ l: actualL, c: actualC, h: actualH }),
    css: cssColor,
    contrast: Math.round(contrast * 100) / 100,
    gamutMapped: wasGamutMapped,
    originalIntended: wasGamutMapped ? {
      l: clampedResult.l,
      c: clampedResult.c,
      h: clampedResult.h
    } : undefined,
    // Store original calculated chroma (interpolated chroma before gamut clamping)
    originalCalculatedChroma: roundedChroma
  };
}

/**
 * Generate a core color step (1-11) using the original logic
 */
function generateCoreColorStep(
  step: number,
  controls: PaletteControls,
  gamutSettings?: { gamutMode: 'sRGB' | 'P3' | 'Rec2020' },
  lightnessSettings?: { mode: 'contrast' | 'range' },
  resolvedBackgroundColor?: string
): PaletteColor {
  // Normalize step position within 1-11 range for curve calculations
  const normalizedStep = (step - 1) / 10; // 0 to 1 for steps 1 to 11
  
  const effectiveLightnessSettings = lightnessSettings || { mode: 'contrast' };
  const effectiveGamutSettings = gamutSettings || { gamutMode: 'sRGB' };
  const backgroundForContrast = resolvedBackgroundColor || '#ffffff';
  
  let lightness: number;
  
  if (effectiveLightnessSettings.mode === 'contrast') {
    const stepKey = step.toString();
    if (controls.lightnessOverrides?.[stepKey] === true && controls.lightnessValues[stepKey] !== undefined) {
      // Step has been manually overridden
      lightness = controls.lightnessValues[stepKey];
    } else {
      // Calculate lightness automatically based on contrast target
      const targetContrast = controls.contrastTargets[stepKey] || 4.5;
      
      // Calculate chroma first so we can use it for chroma-aware lightness calculation
      let chroma: number;
      if (controls.chromaMode === 'manual') {
        chroma = controls.chromaValues[stepKey] ?? 0.1;
      } else if (controls.chromaMode === 'perceptual') {
        // Calculate hue first for perceptual chroma calculation
        const anchorStep = 6;
        let tempHue: number;
        if (step <= anchorStep) {
          const lightProgress = (anchorStep - step) / (anchorStep - 1);
          tempHue = controls.baseHue + (lightProgress * controls.lightHueDrift);
        } else {
          const darkProgress = (step - anchorStep) / (11 - anchorStep);
          tempHue = controls.baseHue + (darkProgress * controls.darkHueDrift);
        }
        tempHue = tempHue % 360;
        if (tempHue < 0) tempHue += 360;
        
        // Use a rough lightness estimate for perceptual calculation
        // We'll refine this in the lightness calculation step
        const roughLightness = controls.lightnessMin + normalizedStep * (controls.lightnessMax - controls.lightnessMin);
        
        // Perceptual chroma distribution - gamut-aware curve
        const peak = controls.chromaPeak;
        const chromaPosition = Math.abs(normalizedStep - peak);
        chroma = calculateGamutAwareChromaFactor(
          roughLightness,
          tempHue,
          chromaPosition,
          controls.chromaCurveType || 'gaussian',
          controls.minChroma,
          controls.maxChroma,
          effectiveGamutSettings.gamutMode,
          controls.chromaEasing
        );
      } else {
        // Curve-based chroma distribution (legacy mode)
        const peak = controls.chromaPeak;
        const chromaPosition = Math.abs(normalizedStep - peak);
        const chromaFactor = calculateChromaFactor(
          chromaPosition,
          controls.chromaCurveType || 'gaussian',
          controls.chromaEasing
        );
        chroma = controls.minChroma + (controls.maxChroma - controls.minChroma) * chromaFactor;
      }
      
      // Calculate hue for chroma-aware calculation
      let hue: number;
      const anchorStep = 6;
      if (step <= anchorStep) {
        const lightProgress = (anchorStep - step) / (anchorStep - 1);
        hue = controls.baseHue + (lightProgress * controls.lightHueDrift);
      } else {
        const darkProgress = (step - anchorStep) / (11 - anchorStep);
        hue = controls.baseHue + (darkProgress * controls.darkHueDrift);
      }
      hue = hue % 360;
      if (hue < 0) hue += 360;
      
              // Use chroma-aware lightness calculation with gamut awareness
        lightness = calculateChromaAwareLightness(targetContrast, backgroundForContrast, chroma, hue, effectiveGamutSettings.gamutMode);
    }
  } else {
    // Use manual lightness range
    lightness = controls.lightnessMin + normalizedStep * (controls.lightnessMax - controls.lightnessMin);
  }
  
  // Calculate chroma (if not already calculated above for chroma-aware lightness)
  let chroma: number;
  let hue: number;
  
  if (effectiveLightnessSettings.mode === 'contrast' && !(controls.lightnessOverrides?.[step.toString()] === true)) {
    // Chroma and hue were already calculated above for chroma-aware lightness
    // Re-calculate them here for consistency (they should be the same)
    const stepKey = step.toString();
    if (controls.chromaMode === 'manual') {
      chroma = controls.chromaValues[stepKey] ?? 0.1;
    } else if (controls.chromaMode === 'perceptual') {
      // Calculate hue first for perceptual chroma calculation
      const anchorStep = 6;
      let tempHue: number;
      if (step <= anchorStep) {
        const lightProgress = (anchorStep - step) / (anchorStep - 1);
        tempHue = controls.baseHue + (lightProgress * controls.lightHueDrift);
      } else {
        const darkProgress = (step - anchorStep) / (11 - anchorStep);
        tempHue = controls.baseHue + (darkProgress * controls.darkHueDrift);
      }
      tempHue = tempHue % 360;
      if (tempHue < 0) tempHue += 360;
      
      // Perceptual chroma distribution - gamut-aware curve
      const peak = controls.chromaPeak;
      const chromaPosition = Math.abs(normalizedStep - peak);
      chroma = calculateGamutAwareChromaFactor(
        lightness,
        tempHue,
        chromaPosition,
        controls.chromaCurveType || 'gaussian',
        controls.minChroma,
        controls.maxChroma,
        effectiveGamutSettings.gamutMode,
        controls.chromaEasing
      );
    } else {
      const peak = controls.chromaPeak;
      const chromaPosition = Math.abs(normalizedStep - peak);
      const chromaFactor = calculateChromaFactor(
        chromaPosition,
        controls.chromaCurveType || 'gaussian',
        controls.chromaEasing
      );
      chroma = controls.minChroma + (controls.maxChroma - controls.minChroma) * chromaFactor;
    }
    
    const anchorStep = 6;
    if (step <= anchorStep) {
      const lightProgress = (anchorStep - step) / (anchorStep - 1);
      hue = controls.baseHue + (lightProgress * controls.lightHueDrift);
    } else {
      const darkProgress = (step - anchorStep) / (11 - anchorStep);
      hue = controls.baseHue + (darkProgress * controls.darkHueDrift);
    }
    hue = hue % 360;
    if (hue < 0) hue += 360;
  } else {
    // Calculate chroma and hue normally
    const stepKey = step.toString();
    if (controls.chromaMode === 'manual') {
      chroma = controls.chromaValues[stepKey] ?? 0.1;
    } else if (controls.chromaMode === 'perceptual') {
      // Calculate hue first for perceptual chroma calculation
      const anchorStep = 6;
      let tempHue: number;
      if (step <= anchorStep) {
        const lightProgress = (anchorStep - step) / (anchorStep - 1);
        tempHue = controls.baseHue + (lightProgress * controls.lightHueDrift);
      } else {
        const darkProgress = (step - anchorStep) / (11 - anchorStep);
        tempHue = controls.baseHue + (darkProgress * controls.darkHueDrift);
      }
      tempHue = tempHue % 360;
      if (tempHue < 0) tempHue += 360;
      
      // Perceptual chroma distribution - gamut-aware curve
      const peak = controls.chromaPeak;
      const chromaPosition = Math.abs(normalizedStep - peak);
      chroma = calculateGamutAwareChromaFactor(
        lightness,
        tempHue,
        chromaPosition,
        controls.chromaCurveType || 'gaussian',
        controls.minChroma,
        controls.maxChroma,
        effectiveGamutSettings.gamutMode,
        controls.chromaEasing
      );
    } else {
      const peak = controls.chromaPeak;
      const chromaPosition = Math.abs(normalizedStep - peak);
      const chromaFactor = calculateChromaFactor(
        chromaPosition,
        controls.chromaCurveType || 'gaussian',
        controls.chromaEasing
      );
      chroma = controls.minChroma + (controls.maxChroma - controls.minChroma) * chromaFactor;
    }
    
    const anchorStep = 6;
    if (step <= anchorStep) {
      const lightProgress = (anchorStep - step) / (anchorStep - 1);
      hue = controls.baseHue + (lightProgress * controls.lightHueDrift);
    } else {
      const darkProgress = (step - anchorStep) / (11 - anchorStep);
      hue = controls.baseHue + (darkProgress * controls.darkHueDrift);
    }
    hue = hue % 360;
    if (hue < 0) hue += 360;
  }
  
  // Apply gamut clamping
  const clampedResult = clampColorToGamut(
    { l: lightness, c: chroma, h: hue },
    effectiveGamutSettings.gamutMode
  );
  
  const finalLightness = clampedResult.clamped ? clampedResult.l : lightness;
  const finalChroma = clampedResult.clamped ? clampedResult.c : chroma;
  const finalHue = clampedResult.clamped ? clampedResult.h : hue;
  
  // Use final values directly from Culori
  const roundedLightness = finalLightness;
  const roundedChroma = finalChroma;
  const roundedHue = finalHue;
  
  // Create color
  const oklchColor = oklch({
    mode: 'oklch',
    l: roundedLightness,
    c: roundedChroma,
    h: roundedHue
  });
  
  const cssColor = formatHex(oklchColor) || '#000000';
  
  // CRITICAL: Get the ACTUAL OKLCH values from the generated hex (round-trip verification)
  const parsedHexColor = parse(cssColor);
  const verifiedOklch = oklch(parsedHexColor);
  const actualL = verifiedOklch?.l || roundedLightness;
  const actualC = verifiedOklch?.c || roundedChroma;
  const actualH = verifiedOklch?.h || roundedHue;
  
  const contrast = wcagContrast(oklchColor, backgroundForContrast) || 1;
  
  // Check if there was a difference between clamped and actual values
  const hueDelta = Math.abs(actualH - roundedHue);
  const chromaDelta = Math.abs(actualC - roundedChroma);
  const lightnessDelta = Math.abs(actualL - roundedLightness);
  const wasGamutMapped = clampedResult.clamped || hueDelta > 0.1 || chromaDelta > 0.001 || lightnessDelta > 0.001;
  
  return {
    step,
    tokenName: generateTokenName(step), // Core steps always use standard names
    lightness: actualL,     // ACTUAL values from hex round-trip
    chroma: actualC,        // ACTUAL values from hex round-trip
    hue: actualH,           // ACTUAL values from hex round-trip
    oklch: formatOklchWithCulori({ l: actualL, c: actualC, h: actualH }),
    css: cssColor,
    contrast: Math.round(contrast * 100) / 100,
    gamutMapped: wasGamutMapped,
    originalIntended: wasGamutMapped ? {
      l: roundedLightness,
      c: roundedChroma,
      h: roundedHue
    } : undefined,
    // Store original calculated chroma for manual mode switching
    originalCalculatedChroma: chroma
  };
}

/**
 * Internal palette generation function
 */
function generatePaletteInternal(controls: PaletteControls, gamutSettings?: { gamutMode: 'sRGB' | 'P3' | 'Rec2020' }, lightnessSettings?: { mode: 'contrast' | 'range' }, existingPalette?: PaletteColor[]): PaletteColor[] {
  // Resolve background color early to handle relative palette references
  const resolvedBackgroundColor = resolveBackgroundColor(controls.backgroundColor, existingPalette);
  
  // Set up effective settings with defaults
  const effectiveGamutSettings = gamutSettings || { gamutMode: 'sRGB' };
  
  // Use steps from controls, ensuring we have the core steps
  const steps = controls.steps || [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const sortedSteps = [...steps].sort((a, b) => a - b);
  
  // First, generate all core color steps (1-11) and endpoints (0, 12)
  const coreColors = new Map<number, PaletteColor>();
  
  // Generate core steps
  for (const step of sortedSteps) {
    if (step === 0) {
      // Pure white - use palette base hue for consistent interpolation
      coreColors.set(0, {
        step: 0,
        tokenName: '100',
        lightness: 1,
        chroma: 0,
        hue: controls.baseHue, // Use palette hue instead of 0
        oklch: formatOklchWithCulori({ l: 1, c: 0, h: controls.baseHue }),
        css: '#ffffff',
        contrast: wcagContrast('#ffffff', resolvedBackgroundColor) || 1,
        gamutMapped: false
      });
    } else if (step === 12) {
      // Pure black - use palette base hue for consistent interpolation
      coreColors.set(12, {
        step: 12,
        tokenName: '0',
        lightness: 0,
        chroma: 0,
        hue: controls.baseHue, // Use palette hue instead of 0
        oklch: formatOklchWithCulori({ l: 0, c: 0, h: controls.baseHue }),
        css: '#000000',
        contrast: wcagContrast('#000000', resolvedBackgroundColor) || 1,
        gamutMapped: false
      });
    } else if (isColorStep(step)) {
      // Core color steps (1-11) - use existing logic
      coreColors.set(step, generateCoreColorStep(step, controls, gamutSettings, lightnessSettings, resolvedBackgroundColor));
    }
  }
  
  // Now generate all steps (including intermediates)
  const results: PaletteColor[] = [];
  
  for (const step of sortedSteps) {
    if (coreColors.has(step)) {
      // Core step - use pre-generated color
      results.push(coreColors.get(step)!);
    } else {
      // Intermediate step - interpolate between adjacent core steps
      const floor = Math.floor(step);
      const ceil = Math.ceil(step);
      const ratio = step - floor;
      
      const floorColor = coreColors.get(floor);
      const ceilColor = coreColors.get(ceil);
      
      if (floorColor && ceilColor) {
        // First get the interpolated color (this is our "calculated" value)
        const interpolatedColor = interpolateColors(floorColor, ceilColor, ratio, step, effectiveGamutSettings.gamutMode);
        
        // Check if user has manually overridden the lightness for this intermediate step
        const stepKey = step.toString();
        if (controls.lightnessOverrides?.[stepKey] === true && controls.lightnessValues[stepKey] !== undefined) {
          // Use the manually overridden lightness value
          const overriddenLightness = controls.lightnessValues[stepKey];
          
          // Recalculate the color with the overridden lightness using culori
          const oklchColor = oklch({
            mode: 'oklch',
            l: overriddenLightness,
            c: interpolatedColor.chroma,
            h: interpolatedColor.hue
          });
          
          const oklchString = formatOklchWithCulori({ l: overriddenLightness, c: interpolatedColor.chroma, h: interpolatedColor.hue });
          const cssColor = formatHex(oklchColor) || '#000000';
          const backgroundForContrast = resolveBackgroundColor(controls.backgroundColor, existingPalette);
          
          interpolatedColor.lightness = overriddenLightness;
          interpolatedColor.oklch = oklchString;
          interpolatedColor.css = cssColor;
          interpolatedColor.contrast = wcagContrast(cssColor, backgroundForContrast) || 1;
        }
        
        // Update token name with custom name if available
        interpolatedColor.tokenName = generateTokenName(step, controls.tokenNames);
        results.push(interpolatedColor);
      } else {
        console.warn(`Cannot interpolate step ${step}: missing adjacent core steps ${floor} or ${ceil}`);
        // Fallback: create a basic color
        results.push({
          step,
          tokenName: generateTokenName(step, controls.tokenNames),
          lightness: 0.5,
          chroma: 0.1,
          hue: controls.baseHue,
          oklch: 'oklch(50% 0.1 0)',
          css: '#808080',
          contrast: 1,
          gamutMapped: false
        });
      }
    }
  }
  
  return results;
}

/**
 * Generate a complete OKLCH color palette with automatic resolution of relative background colors
 */
export function generatePalette(controls: PaletteControls, gamutSettings?: { gamutMode: 'sRGB' | 'P3' | 'Rec2020' }, lightnessSettings?: { mode: 'contrast' | 'range' }, existingPalette?: PaletteColor[]): PaletteColor[] {
  // Handle circular dependency for relative palette references
  if (controls.backgroundColor.startsWith('palette-') && !existingPalette) {
    console.warn(`Palette reference ${controls.backgroundColor} requires existing palette. Using fallback: #ffffff`);
    // Use fallback instead of complex two-pass generation that causes instability
    const fallbackControls = { ...controls, backgroundColor: '#ffffff' };
    return generatePaletteInternal(fallbackControls, gamutSettings, lightnessSettings, existingPalette);
  }
  
  // Normal generation path
  return generatePaletteInternal(controls, gamutSettings, lightnessSettings, existingPalette);
}