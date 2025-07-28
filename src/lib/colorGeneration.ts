import { oklch, rgb, hsl, wcagContrast, formatHex, formatRgb, formatHsl, p3, rec2020 } from 'culori';
import { PaletteControls, PaletteColor, Palette, ColorFormatValue, ContrastResult, ColorGamut, GamutValidation, GamutSettings, LightnessSettings, DEFAULT_PRECISION } from '../types';
import { defaultControls, presets } from './presets';
import defaultPalettesData from '../data/default-palettes.json';

// Color steps for the 11-step palette - using sequential numbering 1-11
export const COLOR_STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

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
 * Validate if a string is a valid hex color
 */
export function isValidHexColor(hex: string): boolean {
  // Check if it's a valid hex color using culori
  const color = oklch(hex);
  return color !== undefined;
}

/**
 * Get luminance from a hex color (normalized to 0-1 range)
 */
function getLuminance(hexColor: string): number {
  const color = oklch(hexColor);
  if (!color) return 0;
  return wcagContrast(color, '#000000') / 21;
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
  maxIterations: number = 20,
  tolerance: number = 0.05
): number {
  // Start with the simple calculation as initial guess
  let lightness = calculateLightnessForContrast(targetContrast, backgroundColor);
  
  // If chroma is very low, simple calculation should be accurate enough
  if (chroma < 0.001) {
    return lightness;
  }
  
  // Use binary search to find the correct lightness
  let lowerBound = 0;
  let upperBound = 1;
  let iterations = 0;
  
  while (iterations < maxIterations) {
    // Create test color with current lightness
    const testColor = oklch({
      mode: 'oklch',
      l: lightness,
      c: chroma,
      h: hue
    });
    
    // Calculate actual contrast
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
      const backgroundLuminance = getLuminance(backgroundColor);
      if (backgroundLuminance > 0.18) {
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
      const backgroundLuminance = getLuminance(backgroundColor);
      if (backgroundLuminance > 0.18) {
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
    // Validate that it's a proper color format
    try {
      const testColor = oklch(backgroundColor);
      if (!testColor) {
        console.warn(`Invalid color format: ${backgroundColor}. Using fallback: ${fallbackColor}`);
        return fallbackColor;
      }
    } catch (error) {
      console.warn(`Error parsing color ${backgroundColor}:`, error, `Using fallback: ${fallbackColor}`);
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
  
  // Validate the resolved color
  try {
    const testColor = oklch(targetColor.css);
    if (!testColor) {
      console.warn(`Resolved color ${targetColor.css} for ${backgroundColor} is invalid. Using fallback: ${fallbackColor}`);
      return fallbackColor;
    }
  } catch (error) {
    console.warn(`Error parsing resolved color ${targetColor.css} for ${backgroundColor}:`, error, `Using fallback: ${fallbackColor}`);
    return fallbackColor;
  }
  
  return targetColor.css;
}

/**
 * Generate a complete 11-step OKLCH color palette with automatic resolution of relative background colors
 */
export function generatePalette(controls: PaletteControls, gamutSettings?: { gamutMode: 'sRGB' | 'P3' | 'Rec2020' }, lightnessSettings?: { mode: 'contrast' | 'range' }, steps: number[] = COLOR_STEPS, existingPalette?: PaletteColor[]): PaletteColor[] {
  // Handle circular dependency for relative palette references
  if (controls.backgroundColor.startsWith('palette-') && !existingPalette) {
    // First pass: generate palette with fallback background color to create initial palette
    const firstPassPalette = generatePaletteInternal(
      { ...controls, backgroundColor: '#ffffff' }, // Use white as fallback
      gamutSettings, 
      lightnessSettings, 
      steps
    );
    
    // Second pass: regenerate with resolved background color using first pass results
    return generatePaletteInternal(controls, gamutSettings, lightnessSettings, steps, firstPassPalette);
  }
  
  // Normal generation path
  return generatePaletteInternal(controls, gamutSettings, lightnessSettings, steps, existingPalette);
}

/**
 * Internal palette generation function
 */
function generatePaletteInternal(controls: PaletteControls, gamutSettings?: { gamutMode: 'sRGB' | 'P3' | 'Rec2020' }, lightnessSettings?: { mode: 'contrast' | 'range' }, steps: number[] = COLOR_STEPS, existingPalette?: PaletteColor[]): PaletteColor[] {
  // Resolve background color early to handle relative palette references
  const resolvedBackgroundColor = resolveBackgroundColor(controls.backgroundColor, existingPalette);
  
  return steps.map((step, index) => {
    // Normalize step to 0-1 range using index instead of step values
    const normalizedStep = index / (steps.length - 1);
    
    let lightness: number;
    
    // Use provided lightness settings or defaults for backward compatibility
    const effectiveLightnessSettings = lightnessSettings || { mode: 'contrast' };
    
    if (effectiveLightnessSettings.mode === 'contrast') {
      // Always auto mode with individual overrides
      if (controls.lightnessOverrides?.[step] && controls.lightnessValues[step] !== undefined) {
        // Step has been manually overridden
        lightness = controls.lightnessValues[step];
      } else {
        // Calculate lightness automatically
        const targetContrast = controls.contrastTargets[step];
        
        // Determine the final chroma after gamut clamping for chroma-aware calculation
        // First, calculate what the chroma will be after clamping
        let tempChroma: number;
        if (controls.chromaMode === 'manual') {
          tempChroma = controls.chromaValues[step] ?? 0.1;
        } else { // curve mode
          const peak = controls.chromaPeak;
          const chromaPosition = Math.abs(normalizedStep - peak);
          const chromaFactor = calculateChromaFactor(
            chromaPosition, 
            controls.chromaCurveType || 'gaussian',
            controls.chromaEasing
          );
          tempChroma = controls.minChroma + (controls.maxChroma - controls.minChroma) * chromaFactor;
        }
        
        // Calculate hue using index-based logic
        let tempHue: number;
        const midIndex = Math.floor(steps.length / 2);
        if (index <= midIndex) {
          const lightProgress = (midIndex - index) / midIndex;
          tempHue = controls.baseHue + (lightProgress * controls.lightHueDrift);
        } else {
          const darkProgress = (index - midIndex) / (steps.length - 1 - midIndex);
          tempHue = controls.baseHue + (darkProgress * controls.darkHueDrift);
        }
        tempHue = tempHue % 360;
        if (tempHue < 0) tempHue += 360;
        
        // Test what happens to chroma after gamut clamping with initial lightness estimate
        const initialLightness = calculateLightnessForContrast(targetContrast, resolvedBackgroundColor);
        const effectiveGamutSettings = gamutSettings || { gamutMode: 'sRGB' };
        const clampedResult = clampColorToGamut(
          { l: initialLightness, c: tempChroma, h: tempHue },
          effectiveGamutSettings.gamutMode
        );
        
        // Now calculate lightness using the FINAL chroma values after clamping
        lightness = calculateChromaAwareLightness(
          targetContrast, 
          resolvedBackgroundColor, 
          clampedResult.c,  // Use clamped chroma
          clampedResult.h   // Use clamped hue
        );
      }
    } else {
      // Use manual lightness calculation
      lightness = controls.lightnessMin + normalizedStep * (controls.lightnessMax - controls.lightnessMin);
    }
    
    // Calculate chroma based on mode
    let chroma: number;
    if (controls.chromaMode === 'manual') {
      chroma = controls.chromaValues[step] ?? 0.1;
    } else { // curve mode
      // Curve-based distribution
      const peak = controls.chromaPeak; // Use configurable peak position
      const chromaPosition = Math.abs(normalizedStep - peak);
      const chromaFactor = calculateChromaFactor(
        chromaPosition, 
        controls.chromaCurveType || 'gaussian',
        controls.chromaEasing
      );
      // Use min/max chroma range like lightness system
      chroma = controls.minChroma + (controls.maxChroma - controls.minChroma) * chromaFactor;
    }
    
    // Calculate hue with three-hue system
    // Base hue (middle step) is the anchor point in the middle
    let hue: number;
    const midIndex = Math.floor(steps.length / 2);
    
    if (index <= midIndex) {
      // Light colors: interpolate between baseHue + lightHueDrift (at step 1) and baseHue (at middle step)
      const lightProgress = (midIndex - index) / midIndex; // 1 at step 1, 0 at middle step
      hue = controls.baseHue + (lightProgress * controls.lightHueDrift);
    } else {
      // Dark colors: interpolate between baseHue (at middle step) and baseHue + darkHueDrift (at last step)
      const darkProgress = (index - midIndex) / (steps.length - 1 - midIndex); // 0 at middle step, 1 at last step
      hue = controls.baseHue + (darkProgress * controls.darkHueDrift);
    }
    
    // Ensure hue is in valid range
    hue = hue % 360;
    if (hue < 0) hue += 360;
    
    // Apply gamut constraints - always enforce gamut clamping
    let finalLightness = lightness;
    let finalChroma = chroma;
    let finalHue = hue;
    
    // Use provided gamut settings or defaults for backward compatibility
    const effectiveGamutSettings = gamutSettings || { gamutMode: 'sRGB' };
    
    // Always clamp colors to the selected gamut
    const clampedResult = clampColorToGamut(
      { l: lightness, c: chroma, h: hue },
      effectiveGamutSettings.gamutMode
    );
    
    if (clampedResult.clamped) {
      finalLightness = clampedResult.l;
      finalChroma = clampedResult.c;
      finalHue = clampedResult.h;
    }
    
    // Round values to match precision settings for consistency
    const roundedLightness = Math.round(finalLightness / DEFAULT_PRECISION.lightness.step) * DEFAULT_PRECISION.lightness.step;
    const roundedChroma = Math.round(finalChroma / DEFAULT_PRECISION.chroma.step) * DEFAULT_PRECISION.chroma.step;
    const roundedHue = Math.round(finalHue / DEFAULT_PRECISION.hue.step) * DEFAULT_PRECISION.hue.step;
    
    // Create OKLCH color with rounded values
    const oklchColor = oklch({
      mode: 'oklch',
      l: roundedLightness,
      c: roundedChroma,
      h: roundedHue
    });
    
    // Convert to CSS color
    const cssColor = formatHex(oklchColor) || '#000000';
    
    // Calculate contrast against background
    const contrastBackground = effectiveLightnessSettings.mode === 'contrast' ? resolvedBackgroundColor : '#ffffff';
    const contrast = wcagContrast(oklchColor, contrastBackground) || 1;
    
    return {
      step,
      lightness: roundedLightness,
      chroma: roundedChroma,
      hue: roundedHue,
      oklch: `oklch(${(roundedLightness * 100).toFixed(DEFAULT_PRECISION.lightness.displayDecimals)}% ${roundedChroma.toFixed(DEFAULT_PRECISION.chroma.displayDecimals)} ${roundedHue.toFixed(DEFAULT_PRECISION.hue.displayDecimals)})`,
      css: cssColor,
      contrast: Math.round(contrast * 100) / 100
    };
  });
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
 * Clamp a color to fit within a specific gamut
 */
export function clampColorToGamut(color: { l: number; c: number; h: number }, targetGamut: ColorGamut): { l: number; c: number; h: number; clamped: boolean } {
  const oklchColor = oklch({ mode: 'oklch', l: color.l, c: color.c, h: color.h });
  
  let clampedColor = oklchColor;
  let wasClamped = false;
  
  // Try to clamp to the target gamut
  if (targetGamut === 'sRGB') {
    // For sRGB, we need to reduce chroma until it fits
    const rgbColor = rgb(oklchColor);
    if (!rgbColor || rgbColor.r < 0 || rgbColor.r > 1 || rgbColor.g < 0 || rgbColor.g > 1 || rgbColor.b < 0 || rgbColor.b > 1) {
      // Binary search to find maximum chroma that fits in sRGB
      let minChroma = 0;
      let maxChroma = color.c;
      let bestChroma = 0;
      
      for (let i = 0; i < 20; i++) { // 20 iterations should be enough for precision
        const testChroma = (minChroma + maxChroma) / 2;
        const testColor = oklch({ mode: 'oklch', l: color.l, c: testChroma, h: color.h });
        const testRgb = rgb(testColor);
        
        if (testRgb && testRgb.r >= 0 && testRgb.r <= 1 && testRgb.g >= 0 && testRgb.g <= 1 && testRgb.b >= 0 && testRgb.b <= 1) {
          bestChroma = testChroma;
          minChroma = testChroma;
        } else {
          maxChroma = testChroma;
        }
      }
      
      clampedColor = oklch({ mode: 'oklch', l: color.l, c: bestChroma, h: color.h });
      wasClamped = true;
    }
  } else if (targetGamut === 'P3') {
    // For P3, clamp to P3 gamut
    const p3Color = p3(oklchColor);
    if (!p3Color || p3Color.r < 0 || p3Color.r > 1 || p3Color.g < 0 || p3Color.g > 1 || p3Color.b < 0 || p3Color.b > 1) {
      // Binary search to find maximum chroma that fits in P3
      let minChroma = 0;
      let maxChroma = color.c;
      let bestChroma = 0;
      
      for (let i = 0; i < 20; i++) {
        const testChroma = (minChroma + maxChroma) / 2;
        const testColor = oklch({ mode: 'oklch', l: color.l, c: testChroma, h: color.h });
        const testP3 = p3(testColor);
        
        if (testP3 && testP3.r >= 0 && testP3.r <= 1 && testP3.g >= 0 && testP3.g <= 1 && testP3.b >= 0 && testP3.b <= 1) {
          bestChroma = testChroma;
          minChroma = testChroma;
        } else {
          maxChroma = testChroma;
        }
      }
      
      clampedColor = oklch({ mode: 'oklch', l: color.l, c: bestChroma, h: color.h });
      wasClamped = true;
    }
  } else if (targetGamut === 'Rec2020') {
    // For Rec2020, clamp to Rec2020 gamut
    const rec2020Color = rec2020(oklchColor);
    if (!rec2020Color || rec2020Color.r < 0 || rec2020Color.r > 1 || rec2020Color.g < 0 || rec2020Color.g > 1 || rec2020Color.b < 0 || rec2020Color.b > 1) {
      // Binary search to find maximum chroma that fits in Rec2020
      let minChroma = 0;
      let maxChroma = color.c;
      let bestChroma = 0;
      
      for (let i = 0; i < 20; i++) {
        const testChroma = (minChroma + maxChroma) / 2;
        const testColor = oklch({ mode: 'oklch', l: color.l, c: testChroma, h: color.h });
        const testRec2020 = rec2020(testColor);
        
        if (testRec2020 && testRec2020.r >= 0 && testRec2020.r <= 1 && testRec2020.g >= 0 && testRec2020.g <= 1 && testRec2020.b >= 0 && testRec2020.b <= 1) {
          bestChroma = testChroma;
          minChroma = testChroma;
        } else {
          maxChroma = testChroma;
        }
      }
      
      clampedColor = oklch({ mode: 'oklch', l: color.l, c: bestChroma, h: color.h });
      wasClamped = true;
    }
  }
  
  return {
    l: clampedColor?.l || color.l,
    c: clampedColor?.c || color.c,
    h: clampedColor?.h || color.h,
    clamped: wasClamped
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
    const targetContrast = controls.contrastTargets[color.step];
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
    `  --${paletteName}-${color.step}: ${color.css};`
  ).join('\n');
  
  return `:root {\n${cssVariables}\n}`;
}

/**
 * Generate Tailwind config for a palette
 */
export function generateTailwindConfig(palette: PaletteColor[], paletteName: string = 'custom'): string {
  const colorObject = palette.reduce((acc, color) => {
    acc[color.step] = color.css;
    return acc;
  }, {} as Record<number, string>);
  
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
      controls: {
        // Ensure all required properties exist with defaults
        ...defaultControls,
        // Override with actual stored values (migrating step keys if needed)
        ...palette.controls,
        // Migrate old step keys to new format
        contrastTargets: migrateStepKeys(palette.controls?.contrastTargets || {}),
        lightnessValues: migrateStepKeys(palette.controls?.lightnessValues || {}),
        lightnessOverrides: migrateStepKeys(palette.controls?.lightnessOverrides || {}),
        chromaValues: migrateStepKeys(palette.controls?.chromaValues || {})
      }
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
          // Override with actual imported values
          ...palette.controls,
          // Migrate old step keys to new format
          contrastTargets: migrateStepKeys(palette.controls?.contrastTargets || {}),
          lightnessValues: migrateStepKeys(palette.controls?.lightnessValues || {}),
          lightnessOverrides: migrateStepKeys(palette.controls?.lightnessOverrides || {}),
          chromaValues: migrateStepKeys(palette.controls?.chromaValues || {})
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
 * Migration utility to convert old step keys (50, 100, 200...) to new step keys (1, 2, 3...)
 */
function migrateStepKeys(recordData: Record<string | number, any>): Record<number, any> {
  const stepMigration: Record<string | number, number> = {
    50: 1, 100: 2, 200: 3, 300: 4, 400: 5, 500: 6,
    600: 7, 700: 8, 800: 9, 900: 10, 950: 11
  };
  
  const migratedData: Record<number, any> = {};
  
  for (const [key, value] of Object.entries(recordData)) {
    const newKey = stepMigration[key] || parseInt(key);
    if (newKey) {
      migratedData[newKey] = value;
    }
  }
  
  return migratedData;
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
    oklch: `oklch(${(color.lightness * 100).toFixed(DEFAULT_PRECISION.lightness.displayDecimals)}% 0 ${roundedHue.toFixed(DEFAULT_PRECISION.hue.displayDecimals)})`
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

  // Add relative palette options
  COLOR_STEPS.forEach(step => {
    options.push({
      value: `palette-${step}`,
      label: `Step ${step}`,
      color: '', // No specific color - it's relative
      group: 'Relative to Palette',
      isRelative: true
    })
  })

  // Add colors from all palettes
  palettes.forEach(palette => {
    const colors = generatePalette(palette.controls, gamutSettings, lightnessSettings)
    
    colors.forEach(color => {
      options.push({
        value: color.css,
        label: `${palette.name} ${color.step}`,
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
      // Ensure all required properties exist
      const controls: PaletteControls = {
        ...defaultControls,
        ...palette.controls,
        // Migrate old step keys to new format
        contrastTargets: migrateStepKeys(palette.controls?.contrastTargets || {}),
        lightnessValues: migrateStepKeys(palette.controls?.lightnessValues || {}),
        lightnessOverrides: migrateStepKeys(palette.controls?.lightnessOverrides || {}),
        chromaValues: migrateStepKeys(palette.controls?.chromaValues || {})
      };
      
      // Regenerate colors from controls to ensure they're accurate
      const colors = generatePalette(controls);
      
      return {
        id: palette.id,
        name: palette.name,
        controls,
        colors,
        createdAt: palette.createdAt ? new Date(palette.createdAt) : new Date(),
        updatedAt: palette.updatedAt ? new Date(palette.updatedAt) : new Date(),
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