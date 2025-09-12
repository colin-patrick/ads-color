import { oklch, wcagContrast, wcagLuminance } from 'culori';
import { ContrastResult, PaletteColor } from '../../types';
import { clampColorToGamut } from './gamut';
import { parseToOklch } from './core';

/**
 * Contrast and accessibility functions implementing WCAG standards
 * and providing human-centered color decisions.
 */

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
  
  // Return lightness value directly from Culori
  return oklchLightness;
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
      return Math.max(0, Math.min(1, lightness));
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
  return Math.max(0, Math.min(1, lightness));
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