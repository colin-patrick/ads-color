import { oklch, rgb, p3, rec2020, inGamut, clampChroma } from 'culori';
import { ColorGamut, GamutValidation, PaletteColor } from '../../types';

/**
 * Gamut operations: detection, validation, boundary calculations, and clamping.
 * All functions dealing with the mathematical concept of color gamuts.
 */

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
 * Find the maximum achievable chroma for a specific lightness and hue within a gamut
 * Uses binary search to find the boundary of the gamut
 */
export function findMaxChromaForLightness(
  lightness: number,
  hue: number,
  gamut: 'sRGB' | 'P3' | 'Rec2020' = 'sRGB',
  precision: number = 0.001
): number {
  // Map our gamut names to Culori's gamut identifiers
  const gamutMap = {
    'sRGB': 'rgb',
    'P3': 'p3',
    'Rec2020': 'rec2020'
  } as const;
  
  const targetGamutId = gamutMap[gamut];
  const isInGamutFn = inGamut(targetGamutId);
  
  // Binary search for maximum chroma
  let low = 0;
  let high = getMaxChromaForGamut(gamut); // Start with theoretical max for this gamut
  let maxChroma = 0;
  
  // Ensure we don't get stuck in infinite loop
  let iterations = 0;
  const maxIterations = 100;
  
  while (high - low > precision && iterations < maxIterations) {
    const mid = (low + high) / 2;
    
    // Test if this chroma value is within the gamut
    const testColor = oklch({
      mode: 'oklch',
      l: Math.max(0, Math.min(1, lightness)),
      c: mid,
      h: hue % 360
    });
    
    if (testColor && isInGamutFn(testColor)) {
      // This chroma is achievable, try higher
      maxChroma = mid;
      low = mid;
    } else {
      // This chroma is too high, try lower
      high = mid;
    }
    
    iterations++;
  }
  
  return maxChroma;
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
 * Calculate gamut boundaries for a specific hue and lightness
 * Returns the maximum achievable chroma at given L and H values
 */
export function getMaxChromaAtLightnessHue(
  lightness: number, 
  hue: number, 
  gamutMode: 'sRGB' | 'P3' | 'Rec2020' = 'sRGB',
  precision: number = 0.001
): number {
  const gamutMap = {
    'sRGB': 'rgb',
    'P3': 'p3', 
    'Rec2020': 'rec2020'
  } as const;
  
  const targetGamut = gamutMap[gamutMode];
  const isInGamutFn = inGamut(targetGamut);
  
  let maxChroma = 0;
  let testChroma = 0.5; // Start with reasonable chroma
  let step = 0.25;
  
  // Binary search for maximum chroma
  while (step > precision) {
    const testColor = oklch({ mode: 'oklch', l: lightness, c: testChroma, h: hue });
    
    if (testColor && isInGamutFn(testColor)) {
      maxChroma = testChroma;
      testChroma += step;
    } else {
      testChroma -= step;
    }
    step /= 2;
  }
  
  return maxChroma;
}

/**
 * Generate gamut boundary data for visualization
 * Returns array of {lightness, maxChroma} points defining the gamut boundary
 */
export function generateGamutBoundary(
  hue: number,
  gamutMode: 'sRGB' | 'P3' | 'Rec2020' = 'sRGB',
  lightnessSteps: number = 100
): Array<{ lightness: number; maxChroma: number }> {
  const boundary: Array<{ lightness: number; maxChroma: number }> = [];
  
  for (let i = 0; i <= lightnessSteps; i++) {
    const lightness = i / lightnessSteps;
    const maxChroma = getMaxChromaAtLightnessHue(lightness, hue, gamutMode);
    
    boundary.push({ lightness, maxChroma });
  }
  
  return boundary;
}

/**
 * Check if a specific L,C,H combination is within gamut
 */
export function isColorInGamut(
  lightness: number,
  chroma: number, 
  hue: number,
  gamutMode: 'sRGB' | 'P3' | 'Rec2020' = 'sRGB'
): boolean {
  const gamutMap = {
    'sRGB': 'rgb',
    'P3': 'p3',
    'Rec2020': 'rec2020'  
  } as const;
  
  const targetGamut = gamutMap[gamutMode];
  const isInGamutFn = inGamut(targetGamut);
  const testColor = oklch({ mode: 'oklch', l: lightness, c: chroma, h: hue });
  
  return testColor ? isInGamutFn(testColor) : false;
}