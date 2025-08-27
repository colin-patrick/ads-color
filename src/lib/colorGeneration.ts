import { oklch, rgb, hsl, wcagContrast, wcagLuminance, formatHex, formatRgb, formatHsl, p3, rec2020, inGamut, clampChroma, interpolate, formatCss, parse } from 'culori';
import { PaletteControls, PaletteColor, Palette, ColorFormatValue, ContrastResult, ColorGamut, GamutValidation, GamutSettings, LightnessSettings, DEFAULT_PRECISION } from '../types';
import { defaultControls, presets } from './presets';
import { migratePaletteControls } from './migration';
import defaultPalettesData from '../data/default-palettes.json';

// Token Studio mapping from step numbers to token names
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
 * Interpolate between two colors for intermediate steps using Culori's built-in interpolation
 */
function interpolateColors(color1: PaletteColor, color2: PaletteColor, ratio: number, targetStep: number): PaletteColor {
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
  
  // Apply precision rounding to the interpolated values
  const roundedLightness = Math.round((interpolatedColor?.l || 0) / DEFAULT_PRECISION.lightness.step) * DEFAULT_PRECISION.lightness.step;
  const roundedChroma = Math.round((interpolatedColor?.c || 0) / DEFAULT_PRECISION.chroma.step) * DEFAULT_PRECISION.chroma.step;
  const roundedHue = Math.round((interpolatedColor?.h || 0) / DEFAULT_PRECISION.hue.step) * DEFAULT_PRECISION.hue.step;
  
  // Create final OKLCH color with rounded values
  const finalOklchColor = oklch({
    mode: 'oklch',
    l: roundedLightness,
    c: roundedChroma,
    h: roundedHue
  });
  
  const cssColor = formatHex(finalOklchColor) || '#000000';
  
  // Interpolate contrast (though this might not be perfectly accurate)
  const contrast = color1.contrast + (color2.contrast - color1.contrast) * ratio;
  
  return {
    step: targetStep,
    tokenName: generateTokenName(targetStep), // Will be updated by the calling function
    lightness: roundedLightness,
    chroma: roundedChroma,
    hue: roundedHue,
    oklch: formatOklchWithPrecision({ l: roundedLightness, c: roundedChroma, h: roundedHue }),
    css: cssColor,
    contrast: Math.round(contrast * 100) / 100
  };
}

/**
 * Get the maximum chroma value for a given gamut
 */
export function getMaxChromaForGamut(gamut: 'sRGB' | 'P3' | 'Rec2020'): number {
  const maxChromaByGamut = {
    'sRGB': 0.37,    // Current sRGB limit
    'P3': 0.50,      // P3 can achieve higher chroma
    'Rec2020': 0.55  // Rec2020 has the widest gamut
  };
  
  return maxChromaByGamut[gamut];
}

/**
 * Validate if a string is a valid color (any CSS color format)
 */
export function isValidColor(colorString: string): boolean {
  // Use Culori's parse function to validate - if it returns undefined, the color is invalid
  const parsedColor = parse(colorString);
  return parsedColor !== undefined;
}

/**
 * Validate if a string is a valid hex color (legacy function for compatibility)
 */
export function isValidHexColor(hex: string): boolean {
  // Use the more comprehensive validation
  return isValidColor(hex) && (hex.startsWith('#') || hex.toLowerCase().startsWith('0x'));
}

/**
 * Parse any CSS color string to OKLCH color object
 */
export function parseToOklch(colorString: string): { l: number; c: number; h: number } | null {
  // Use Culori's robust parsing for any CSS color format
  const parsedColor = parse(colorString);
  if (!parsedColor) {
    return null;
  }
  
  // Convert to OKLCH
  const oklchColor = oklch(parsedColor);
  if (!oklchColor) {
    return null;
  }
  
  return {
    l: oklchColor.l || 0,
    c: oklchColor.c || 0,
    h: oklchColor.h || 0
  };
}

/**
 * Format an OKLCH color to CSS string with custom precision
 */
function formatOklchWithPrecision(color: { l: number; c: number; h: number }): string {
  const oklchColor = oklch({ mode: 'oklch', l: color.l, c: color.c, h: color.h });
  
  // Try using formatCss first, but fall back to manual formatting if precision is critical
  const cssString = formatCss(oklchColor);
  if (cssString && cssString.startsWith('oklch(')) {
    return cssString;
  }
  
  // Fallback to manual formatting with our precision requirements
  return `oklch(${(color.l * 100).toFixed(DEFAULT_PRECISION.lightness.displayDecimals)}% ${color.c.toFixed(DEFAULT_PRECISION.chroma.displayDecimals)} ${color.h.toFixed(DEFAULT_PRECISION.hue.displayDecimals)})`;
}

/**
 * Get luminance from a hex color (normalized to 0-1 range)
 */
function getLuminance(hexColor: string): number {
  const color = oklch(hexColor);
  if (!color) return 0;
  return wcagLuminance(color);
}

/**
 * Calculate lightness value needed to achieve target contrast ratio
 */
export function calculateLightnessForContrast(
  targetContrast: number,
  backgroundColor: string
): number {
  const backgroundLuminance = getLuminance(backgroundColor);
  
  // Calculate target luminance using WCAG formula
  let targetLuminance: number;
  if (backgroundLuminance > 0.18) {
    // Light background - need darker foreground
    targetLuminance = (backgroundLuminance + 0.05) / targetContrast - 0.05;
  } else {
    // Dark background - need lighter foreground
    targetLuminance = targetContrast * (backgroundLuminance + 0.05) - 0.05;
  }
  
  // Clamp to valid range
  targetLuminance = Math.max(0, Math.min(1, targetLuminance));
  
  // Convert luminance to OKLCH lightness (simplified approximation)
  const oklchLightness = Math.cbrt(targetLuminance);
  
  // Round to precision for consistency
  return Math.round(oklchLightness / DEFAULT_PRECISION.lightness.step) * DEFAULT_PRECISION.lightness.step;
}

/**
 * Calculate lightness value needed to achieve target contrast ratio (chroma-aware)
 * Uses iterative solving to account for chroma's impact on final contrast
 */
export function calculateChromaAwareLightness(
  targetContrast: number,
  backgroundColor: string,
  chroma: number,
  hue: number,
  gamutMode: 'sRGB' | 'P3' | 'Rec2020' = 'sRGB',
  maxIterations: number = 50,
  tolerance: number = 0.01
): number {
  // Start with the simple calculation as initial guess
  let lightness = calculateLightnessForContrast(targetContrast, backgroundColor);
  
  // If chroma is very low, simple calculation should be accurate enough
  if (chroma < 0.001) {
    return lightness;
  }
  
  // Calculate background luminance once and reuse
  const backgroundLuminance = getLuminance(backgroundColor);
  const isLightBackground = backgroundLuminance > 0.18;
  
  // Use binary search to find the correct lightness
  let lowerBound = 0;
  let upperBound = 1;
  let iterations = 0;
  
  while (iterations < maxIterations) {
    // Create test color with current lightness and apply gamut clamping immediately
    const testColorUnclamped = { l: lightness, c: chroma, h: hue };
    const clampedColor = clampColorToGamut(testColorUnclamped, gamutMode);
    
    // Create the actual color that will be used (with clamped values)
    const testColor = oklch({
      mode: 'oklch',
      l: clampedColor.l,
      c: clampedColor.c,
      h: clampedColor.h
    });
    
    // Calculate actual contrast with the clamped color
    const actualContrast = wcagContrast(testColor, backgroundColor) || 1;
    const contrastDelta = Math.abs(actualContrast - targetContrast);
    
    // If we're close enough, return current lightness
    if (contrastDelta <= tolerance) {
      const clampedLightness = Math.max(0, Math.min(1, lightness));
      return Math.round(clampedLightness / DEFAULT_PRECISION.lightness.step) * DEFAULT_PRECISION.lightness.step;
    }
    
    // Adjust search bounds and lightness based on whether we're above or below target
    if (actualContrast > targetContrast) {
      // Too much contrast, need to move lightness toward background
      if (isLightBackground) {
        // Light background, make foreground lighter
        lowerBound = lightness;
        lightness = (lightness + upperBound) / 2;
      } else {
        // Dark background, make foreground darker
        upperBound = lightness;
        lightness = (lowerBound + lightness) / 2;
      }
    } else {
      // Too little contrast, need to move lightness away from background
      if (isLightBackground) {
        // Light background, make foreground darker
        upperBound = lightness;
        lightness = (lowerBound + lightness) / 2;
      } else {
        // Dark background, make foreground lighter
        lowerBound = lightness;
        lightness = (lightness + upperBound) / 2;
      }
    }
    
    iterations++;
  }
  
  // If we couldn't converge, return the best attempt
  // Round to precision to avoid long decimal values from binary search
  const clampedLightness = Math.max(0, Math.min(1, lightness));
  return Math.round(clampedLightness / DEFAULT_PRECISION.lightness.step) * DEFAULT_PRECISION.lightness.step;
}

/**
 * Apply easing function to a normalized factor (0-1)
 */
function applyEasing(factor: number, easing: string = 'none'): number {
  switch (easing) {
    case 'ease-in':
      return factor * factor;
    case 'ease-out':
      return 1 - Math.pow(1 - factor, 2);
    case 'ease-in-out':
      return factor < 0.5 
        ? 2 * factor * factor 
        : 1 - Math.pow(-2 * factor + 2, 2) / 2;
    default:
      return factor;
  }
}

/**
 * Calculate chroma factor based on curve type and distance from peak
 */
function calculateChromaFactor(
  distance: number, 
  curveType: string, 
  easing: string = 'none'
): number {
  let baseFactor: number;
  
  switch (curveType) {
    case 'flat':
      // Flat distribution (replaces old 'vibrant' mode)
      baseFactor = 1;
      break;
    case 'gaussian':
      // Normalized Gaussian bell curve that reaches 0 at distance 0.5
      const rawGaussian = Math.exp(-Math.pow(distance, 2) / 0.15);
      const minGaussian = Math.exp(-Math.pow(0.5, 2) / 0.15); // Value at distance 0.5
      baseFactor = distance >= 0.5 ? 0 : (rawGaussian - minGaussian) / (1 - minGaussian);
      break;
    case 'linear':
      // Triangular distribution - fix to work with full distance range
      baseFactor = Math.max(0, 1 - distance * 2);
      break;
    case 'sine':
      // Sine wave curve - fix to work with full distance range
      baseFactor = distance <= 0.5 ? Math.cos(distance * Math.PI) : 0;
      break;
    case 'cubic':
      // Cubic curve - fix to work with full distance range
      baseFactor = distance <= 0.5 ? Math.pow(1 - distance * 2, 3) : 0;
      break;
    case 'quartic':
      // Quartic curve - fix to work with full distance range
      baseFactor = distance <= 0.5 ? Math.pow(1 - distance * 2, 4) : 0;
      break;
    default:
      // Fallback to Gaussian
      baseFactor = Math.exp(-Math.pow(distance, 2) / 0.15);
  }
  
  // Apply easing transformation
  return applyEasing(baseFactor, easing);
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

/**
 * Internal palette generation function
 */
function generatePaletteInternal(controls: PaletteControls, gamutSettings?: { gamutMode: 'sRGB' | 'P3' | 'Rec2020' }, lightnessSettings?: { mode: 'contrast' | 'range' }, existingPalette?: PaletteColor[]): PaletteColor[] {
  // Resolve background color early to handle relative palette references
  const resolvedBackgroundColor = resolveBackgroundColor(controls.backgroundColor, existingPalette);
  
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
        oklch: formatOklchWithPrecision({ l: 1, c: 0, h: controls.baseHue }),
        css: '#ffffff',
        contrast: wcagContrast('#ffffff', resolvedBackgroundColor) || 1
      });
    } else if (step === 12) {
      // Pure black - use palette base hue for consistent interpolation
      coreColors.set(12, {
        step: 12,
        tokenName: '0',
        lightness: 0,
        chroma: 0,
        hue: controls.baseHue, // Use palette hue instead of 0
        oklch: formatOklchWithPrecision({ l: 0, c: 0, h: controls.baseHue }),
        css: '#000000',
        contrast: wcagContrast('#000000', resolvedBackgroundColor) || 1
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
        const interpolatedColor = interpolateColors(floorColor, ceilColor, ratio, step);
        
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
          
          const oklchString = formatOklchWithPrecision({ l: overriddenLightness, c: interpolatedColor.chroma, h: interpolatedColor.hue });
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
          contrast: 1
        });
      }
    }
  }
  
  return results;
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
      } else {
        // Curve-based chroma distribution
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
  
  // Round values
  const roundedLightness = Math.round(finalLightness / DEFAULT_PRECISION.lightness.step) * DEFAULT_PRECISION.lightness.step;
  const roundedChroma = Math.round(finalChroma / DEFAULT_PRECISION.chroma.step) * DEFAULT_PRECISION.chroma.step;
  const roundedHue = Math.round(finalHue / DEFAULT_PRECISION.hue.step) * DEFAULT_PRECISION.hue.step;
  
  // Create color
  const oklchColor = oklch({
    mode: 'oklch',
    l: roundedLightness,
    c: roundedChroma,
    h: roundedHue
  });
  
  const cssColor = formatHex(oklchColor) || '#000000';
  const contrast = wcagContrast(oklchColor, backgroundForContrast) || 1;
  
  return {
    step,
    tokenName: generateTokenName(step), // Core steps always use standard names
    lightness: roundedLightness,
    chroma: roundedChroma,
    hue: roundedHue,
    oklch: formatOklchWithPrecision({ l: roundedLightness, c: roundedChroma, h: roundedHue }),
    css: cssColor,
    contrast: Math.round(contrast * 100) / 100
  };
}

/**
 * Detect which color gamut a color falls into
 */
export function detectColorGamut(color: PaletteColor): ColorGamut | null {
  const oklchColor = oklch({
    mode: 'oklch',
    l: color.lightness,
    c: color.chroma,
    h: color.hue
  });

  // Check if color is within sRGB gamut
  const rgbColor = rgb(oklchColor);
  const inSRGB = rgbColor && 
    rgbColor.r >= 0 && rgbColor.r <= 1 &&
    rgbColor.g >= 0 && rgbColor.g <= 1 &&
    rgbColor.b >= 0 && rgbColor.b <= 1;

  if (inSRGB) {
    return null; // No warning needed for sRGB
  }

  // Check if color is within P3 gamut
  const p3Color = p3(oklchColor);
  const inP3 = p3Color && 
    p3Color.r >= 0 && p3Color.r <= 1 &&
    p3Color.g >= 0 && p3Color.g <= 1 &&
    p3Color.b >= 0 && p3Color.b <= 1;

  if (inP3) {
    return 'P3';
  }

  // Check if color is within Rec2020 gamut
  const rec2020Color = rec2020(oklchColor);
  const inRec2020 = rec2020Color && 
    rec2020Color.r >= 0 && rec2020Color.r <= 1 &&
    rec2020Color.g >= 0 && rec2020Color.g <= 1 &&
    rec2020Color.b >= 0 && rec2020Color.b <= 1;

  if (inRec2020) {
    return 'Rec2020';
  }

  // Color is outside all known gamuts
  return 'Wide';
}

/**
 * Clamp a color to fit within a specific gamut using Culori's built-in functions
 */
export function clampColorToGamut(color: { l: number; c: number; h: number }, targetGamut: ColorGamut): { l: number; c: number; h: number; clamped: boolean } {
  const oklchColor = oklch({ mode: 'oklch', l: color.l, c: color.c, h: color.h });
  
  // Map our gamut names to Culori's gamut identifiers
  const gamutMap: { [key in ColorGamut]: 'rgb' | 'p3' | 'rec2020' } = {
    'sRGB': 'rgb',
    'P3': 'p3',
    'Rec2020': 'rec2020',
    'Wide': 'rgb' // Fallback to sRGB for wide gamut
  };
  
  const targetGamutId = gamutMap[targetGamut];
  const isInGamutFn = inGamut(targetGamutId);
  
  // Check if color is already in gamut
  if (oklchColor && isInGamutFn(oklchColor)) {
    return {
      l: color.l,
      c: color.c,
      h: color.h,
      clamped: false
    };
  }
  
  // Use Culori's clampChroma to reduce chroma while preserving hue and lightness
  const clampedColor = clampChroma(oklchColor, 'oklch', targetGamutId);
  
  // Ensure we have a valid OKLCH color result
  const clampedOklch = oklch(clampedColor);
  
  return {
    l: clampedOklch?.l || color.l,
    c: clampedOklch?.c || color.c,
    h: clampedOklch?.h || color.h,
    clamped: true
  };
}

/**
 * Validate color against gamut constraints
 */
export function validateColorGamut(color: PaletteColor, targetGamut: ColorGamut): GamutValidation {
  const detectedGamut = detectColorGamut(color);
  
  // Define gamut hierarchy: sRGB < P3 < Rec2020 < Wide
  const gamutHierarchy: { [key in ColorGamut]: number } = {
    'sRGB': 0,
    'P3': 1,
    'Rec2020': 2,
    'Wide': 3
  };
  
  const targetLevel = gamutHierarchy[targetGamut];
  const detectedLevel = detectedGamut ? gamutHierarchy[detectedGamut] : 0; // null means sRGB
  
  const withinGamut = detectedLevel <= targetLevel;
  const requiresGamut = detectedGamut && detectedLevel > targetLevel ? detectedGamut : null;
  
  return {
    withinGamut,
    detectedGamut,
    requiresGamut,
    clamped: false
  };
}

/**
 * Validate color and provide warnings
 */
export function validateColor(color: PaletteColor, controls: PaletteControls, gamutSettings?: { gamutMode: 'sRGB' | 'P3' | 'Rec2020' }, lightnessSettings?: { mode: 'contrast' | 'range' }): {
  inGamut: boolean;
  gamut: ColorGamut | null;
  gamutValidation: GamutValidation;
  contrastAccuracy?: 'GOOD' | 'OK' | 'POOR';
  contrastDelta?: number;
  warnings: string[];
} {
  const warnings: string[] = [];
  
  // Use provided gamut settings or defaults for backward compatibility
  const effectiveGamutSettings = gamutSettings || { gamutMode: 'sRGB' };
  
  // Validate against target gamut
  const gamutValidation = validateColorGamut(color, effectiveGamutSettings.gamutMode);
  const gamut = gamutValidation.detectedGamut;
  const inGamut = gamutValidation.withinGamut;
  
  // Since we always clamp colors, gamut warnings are no longer needed
  // Colors will always be within the selected gamut
  
  // Check contrast accuracy if in contrast mode
  let contrastAccuracy: 'GOOD' | 'OK' | 'POOR' | undefined;
  let contrastDelta: number | undefined;
  
  // Use provided lightness settings or defaults for backward compatibility
  const effectiveLightnessSettings = lightnessSettings || { mode: 'contrast' };
  
  if (effectiveLightnessSettings.mode === 'contrast' && controls.contrastTargets) {
    const targetContrast = controls.contrastTargets[color.step.toString()];
    if (targetContrast) {
      contrastDelta = Math.abs(color.contrast - targetContrast);
      
      if (contrastDelta < 0.3) {
        contrastAccuracy = 'GOOD';
      } else if (contrastDelta < 0.8) {
        contrastAccuracy = 'OK';
      } else {
        contrastAccuracy = 'POOR';
        warnings.push(`Contrast ratio ${color.contrast.toFixed(1)} is far from target ${targetContrast}`);
      }
    }
  }
  
  return {
    inGamut,
    gamut,
    gamutValidation,
    contrastAccuracy,
    contrastDelta,
    warnings
  };
}

/**
 * Convert a color to multiple formats
 */
export function getColorFormats(color: PaletteColor): ColorFormatValue {
  const oklchColor = oklch({
    mode: 'oklch',
    l: color.lightness,
    c: color.chroma,
    h: color.hue
  });
  
  const rgbColor = rgb(oklchColor);
  const hslColor = hsl(oklchColor);
  
  return {
    hex: formatHex(oklchColor) || '#000000',
    rgb: formatRgb(rgbColor) || 'rgb(0, 0, 0)',
    hsl: formatHsl(hslColor) || 'hsl(0, 0%, 0%)',
    oklch: color.oklch
  };
}

/**
 * Calculate contrast analysis for a color against a background
 */
export function analyzeContrast(color: PaletteColor, backgroundColor: string, textSize: 'normal' | 'large' = 'normal'): ContrastResult {
  const oklchColor = oklch({
    mode: 'oklch',
    l: color.lightness,
    c: color.chroma,
    h: color.hue
  });
  
  const contrast = wcagContrast(oklchColor, backgroundColor) || 1;
  
  // WCAG 2.1 requirements
  const normalTextAA = contrast >= 4.5;
  const normalTextAAA = contrast >= 7;
  const largeTextAA = contrast >= 3;
  const largeTextAAA = contrast >= 4.5;
  
  return {
    ratio: Math.round(contrast * 100) / 100,
    wcagAA: textSize === 'normal' ? normalTextAA : largeTextAA,
    wcagAAA: textSize === 'normal' ? normalTextAAA : largeTextAAA,
    wcagAALarge: largeTextAA,
    wcagAAALarge: largeTextAAA
  };
}

/**
 * Get contrast badge information for UI display
 */
export function getContrastBadge(contrastResult: ContrastResult, color: PaletteColor, showCompliance: boolean = true) {
  const { wcagAA, wcagAAA, ratio } = contrastResult;
  const textColor = getTextColorForBackground(color);
  const isLightBackground = textColor === '#000000';
  
  // Use accessible colors based on the background
  const badgeStyle = isLightBackground 
    ? { backgroundColor: '#000000', color: '#ffffff' }
    : { backgroundColor: '#ffffff', color: '#000000' };
  
  // Determine compliance level
  let complianceLevel = '';
  let description = '';
  
  if (wcagAAA) {
    complianceLevel = 'AAA';
    description = 'Excellent contrast - exceeds all accessibility standards';
  } else if (wcagAA) {
    complianceLevel = 'AA';
    description = 'Good contrast - meets WCAG AA standards';
  } else {
    complianceLevel = 'FAIL';
    description = 'Poor contrast - fails accessibility standards';
  }
  
  // Create label based on showCompliance setting
  const label = showCompliance ? `${complianceLevel} ${ratio}` : `${ratio}`;
  
  return {
    label,
    style: badgeStyle,
    description
  };
}

/**
 * Calculate the appropriate text color (white or black) for readability on a given color
 */
export function getTextColorForBackground(color: PaletteColor): string {
  const oklchColor = oklch({
    mode: 'oklch',
    l: color.lightness,
    c: color.chroma,
    h: color.hue
  });
  
  // Calculate contrast ratios with both white and black text
  const contrastWithWhite = wcagContrast(oklchColor, '#ffffff') || 1;
  const contrastWithBlack = wcagContrast(oklchColor, '#000000') || 1;
  
  // Return the color that provides better contrast
  return contrastWithWhite > contrastWithBlack ? '#ffffff' : '#000000';
}

/**
 * Generate CSS custom properties for a palette
 */
export function generateCSSVariables(palette: PaletteColor[], paletteName: string = 'palette'): string {
  const cssVariables = palette.map(color => 
    `  --${paletteName}-${color.tokenName}: ${color.css};`
  ).join('\n');
  
  return `:root {\n${cssVariables}\n}`;
}

/**
 * Generate Tailwind config for a palette
 */
export function generateTailwindConfig(palette: PaletteColor[], paletteName: string = 'custom'): string {
  const colorObject = palette.reduce((acc, color) => {
    acc[color.tokenName] = color.css;
    return acc;
  }, {} as Record<string, string>);
  
  return `// Add to your tailwind.config.js colors section
colors: {
  ${paletteName}: ${JSON.stringify(colorObject, null, 4)}
}`;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy text to clipboard:', err);
    return false;
  }
}

/**
 * Generate unique ID for palettes
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Create a new palette with default values
 */
export function createNewPalette(name: string, controls: PaletteControls): Palette {
  const id = generateId();
  const colors = generatePalette(controls);
  const now = new Date();
  
  return {
    id,
    name,
    controls,
    colors,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Save palettes to local storage
 */
export function savePalettesToStorage(palettes: Palette[], activePaletteId: string) {
  try {
    const data = {
      palettes,
      activePaletteId,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem('ads-color-generator-palettes', JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save palettes to localStorage:', error);
  }
}

/**
 * Load palettes from local storage
 */
export function loadPalettesFromStorage(): { palettes: Palette[], activePaletteId: string } | null {
  try {
    const data = localStorage.getItem('ads-color-generator-palettes');
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    
    // Convert date strings back to Date objects and ensure all properties exist
    const palettes = parsed.palettes.map((palette: any) => ({
      ...palette,
      createdAt: new Date(palette.createdAt),
      updatedAt: new Date(palette.updatedAt),
      // Apply migration if needed
      controls: migratePaletteControls(palette.controls || {})
    }));
    
    return {
      palettes,
      activePaletteId: parsed.activePaletteId
    };
  } catch (error) {
    console.error('Failed to load palettes from localStorage:', error);
    return null;
  }
}

/**
 * Clear palettes from local storage
 */
export function clearPalettesFromStorage() {
  try {
    localStorage.removeItem('ads-color-generator-palettes');
  } catch (error) {
    console.error('Failed to clear palettes from localStorage:', error);
  }
}

/**
 * Export palettes to JSON format
 */
export function exportPalettes(palettes: Palette[], activePaletteId: string): string {
  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    palettes,
    activePaletteId,
    metadata: {
      totalPalettes: palettes.length,
      tool: 'ADS Color Generator'
    }
  };
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * Import palettes from JSON format
 */
export function importPalettes(jsonData: string): { palettes: Palette[], activePaletteId: string } | null {
  try {
    const importData = JSON.parse(jsonData);
    
    // Validate import data structure
    if (!importData.palettes || !Array.isArray(importData.palettes)) {
      throw new Error('Invalid import data: missing or invalid palettes array');
    }
    
    // Convert date strings back to Date objects and ensure all properties exist
    const palettes = importData.palettes.map((palette: any) => {
      // Ensure the palette has all required properties
      if (!palette.id || !palette.name || !palette.controls) {
        throw new Error('Invalid palette data: missing required properties');
      }
      
      return {
        ...palette,
        id: palette.id || generateId(),
        name: palette.name || 'Imported Palette',
        createdAt: palette.createdAt ? new Date(palette.createdAt) : new Date(),
        updatedAt: palette.updatedAt ? new Date(palette.updatedAt) : new Date(),
        controls: {
          // Ensure all required properties exist with defaults
          ...defaultControls,
          // Apply migration to ensure new format
          ...migratePaletteControls(palette.controls || {})
        }
      };
    });
    
    return {
      palettes,
      activePaletteId: importData.activePaletteId || (palettes.length > 0 ? palettes[0].id : '')
    };
  } catch (error) {
    console.error('Failed to import palettes:', error);
    return null;
  }
}

/**
 * Download palettes as JSON file
 */
export function downloadPalettes(palettes: Palette[], activePaletteId: string, filename: string = 'color-palettes.json') {
  const jsonData = exportPalettes(palettes, activePaletteId);
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}



/**
 * Convert external palette data to internal format
 * This helper function can be customized based on the structure of your localhost:5185 palettes
 */
export function convertExternalPalettes(externalData: any): Palette[] {
  try {
    // This is a flexible converter that can handle different formats
    let palettesData = externalData;
    
    // Handle different possible structures
    if (externalData.palettes) {
      palettesData = externalData.palettes;
    } else if (Array.isArray(externalData)) {
      palettesData = externalData;
    }
    
    if (!Array.isArray(palettesData)) {
      throw new Error('Expected an array of palettes');
    }
    
    return palettesData.map((paletteData: any, index: number) => {
      const id = paletteData.id || generateId();
      const name = paletteData.name || `Imported Palette ${index + 1}`;
      
      // Build controls from various possible sources
      const controls: PaletteControls = {
        ...defaultControls,
        // Try to extract meaningful values from the external data
        baseHue: paletteData.baseHue || paletteData.hue || paletteData.controls?.baseHue || defaultControls.baseHue,
        lightnessMin: paletteData.lightnessMin || paletteData.controls?.lightnessMin || defaultControls.lightnessMin,
        lightnessMax: paletteData.lightnessMax || paletteData.controls?.lightnessMax || defaultControls.lightnessMax,
        chromaMode: paletteData.chromaMode || paletteData.controls?.chromaMode || defaultControls.chromaMode,
        maxChroma: paletteData.maxChroma || paletteData.controls?.maxChroma || defaultControls.maxChroma,
        chromaPeak: paletteData.chromaPeak || paletteData.controls?.chromaPeak || defaultControls.chromaPeak,
        lightHueDrift: paletteData.lightHueDrift || paletteData.controls?.lightHueDrift || defaultControls.lightHueDrift,
        darkHueDrift: paletteData.darkHueDrift || paletteData.controls?.darkHueDrift || defaultControls.darkHueDrift,
        // Use provided controls or defaults
        ...(paletteData.controls || {})
      };
      
      const colors = generatePalette(controls);
      const now = new Date();
      
      return {
        id,
        name,
        controls,
        colors,
        createdAt: paletteData.createdAt ? new Date(paletteData.createdAt) : now,
        updatedAt: paletteData.updatedAt ? new Date(paletteData.updatedAt) : now
      };
    });
  } catch (error) {
    console.error('Failed to convert external palettes:', error);
    throw new Error('Failed to convert external palette data');
  }
}

/**
 * Convert a color to luminance-only by removing chroma
 */
export function convertToLuminance(color: PaletteColor): PaletteColor {
  // Round hue to maintain precision consistency
  const roundedHue = Math.round(color.hue / DEFAULT_PRECISION.hue.step) * DEFAULT_PRECISION.hue.step;
  
  // Create OKLCH color with chroma = 0 to get pure luminance
  const luminanceColor = oklch({
    mode: 'oklch',
    l: color.lightness, // Already rounded in generatePalette
    c: 0, // Remove all chroma
    h: roundedHue
  });
  
  // Convert to CSS color
  const luminanceCss = formatHex(luminanceColor) || '#000000';
  
  return {
    ...color,
    chroma: 0,
    hue: roundedHue,
    css: luminanceCss,
    oklch: formatOklchWithPrecision({ l: color.lightness, c: 0, h: roundedHue })
  };
}

/**
 * Convert an array of colors to luminance-only
 */
export function convertPaletteToLuminance(colors: PaletteColor[]): PaletteColor[] {
  return colors.map(convertToLuminance);
}

/**
 * Generate color options for contrast analysis combobox
 */
export function generateColorOptions(palettes: Palette[], gamutSettings: GamutSettings, lightnessSettings: LightnessSettings): Array<{
  value: string
  label: string
  color: string
  group?: string
  isRelative?: boolean
}> {
  const options: Array<{
    value: string
    label: string
    color: string
    group?: string
    isRelative?: boolean
  }> = []

  // Add pure colors first
  options.push(
    {
      value: '#ffffff',
      label: 'White',
      color: '#ffffff',
      group: 'Pure Colors'
    },
    {
      value: '#000000',
      label: 'Black',
      color: '#000000',
      group: 'Pure Colors'
    }
  )

  // Add relative palette options - use common steps 1-11 for relative references
  // Token Studio mapping from step numbers (1-11) to token names
  const stepToTokenMapping = ['95', '90', '80', '70', '60', '50', '40', '30', '20', '15', '10'];
  
  for (let step = 1; step <= 11; step++) {
    const tokenName = stepToTokenMapping[step - 1]; // Array is 0-indexed
    options.push({
      value: `palette-${step}`,
      label: `Step ${tokenName}`,
      color: '', // No specific color - it's relative
      group: 'Relative to Palette',
      isRelative: true
    })
  }

  // Add colors from all palettes
  palettes.forEach(palette => {
    const colors = generatePalette(palette.controls, gamutSettings, lightnessSettings)
    
    colors.forEach(color => {
      options.push({
        value: color.css,
        label: `${palette.name} ${color.tokenName}`,
        color: color.css,
        group: palette.name
      })
    })
  })

  return options
}

/**
 * Load default palettes from JSON file
 */
export function loadDefaultPalettes(): { palettes: Palette[], activePaletteId: string } {
  try {
    // Use the imported default palettes data
    const importData = defaultPalettesData;
    
    // Convert the data to proper Palette objects and regenerate colors
    const palettes = importData.palettes.map((palette: any) => {
      // Migrate and ensure all required properties exist
      const controls: PaletteControls = migratePaletteControls(palette.controls || {});
      
      // Regenerate colors from controls to ensure they're accurate with new system
      const colors = generatePalette(controls);
      
      return {
        id: palette.id,
        name: palette.name,
        controls,
        colors, // Use freshly generated colors
        createdAt: palette.createdAt ? new Date(palette.createdAt) : new Date(),
        updatedAt: new Date(), // Update timestamp since we regenerated colors
      };
    });
    
    return {
      palettes,
      activePaletteId: importData.activePaletteId || (palettes.length > 0 ? palettes[0].id : '')
    };
  } catch (error) {
    console.error('Failed to load default palettes, falling back to single blue palette:', error);
    // Fallback to single blue palette if loading fails
    const fallbackPalette = createNewPalette('Blue', presets.blue);
    return {
      palettes: [fallbackPalette],
      activePaletteId: fallbackPalette.id
    };
  }
}