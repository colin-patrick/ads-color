import { oklch, rgb, hsl, wcagContrast, formatHex, formatRgb, formatHsl, p3, rec2020 } from 'culori';
import { PaletteControls, PaletteColor, Palette, ColorFormatValue, ContrastResult, ColorGamut, GamutValidation } from '../types';
import { defaultControls } from './presets';

// Color steps for the 11-step palette
export const COLOR_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

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
  
  return oklchLightness;
}

/**
 * Generate a complete 11-step OKLCH color palette
 */
export function generatePalette(controls: PaletteControls, gamutSettings?: { gamutMode: 'sRGB' | 'P3' | 'Rec2020'; enforceGamut: boolean }, lightnessSettings?: { mode: 'contrast' | 'range' }): PaletteColor[] {
  const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  
  return steps.map(step => {
    // Normalize step to 0-1 range
    const normalizedStep = (step - 50) / (950 - 50);
    
    let lightness: number;
    
    // Use provided lightness settings or defaults for backward compatibility
    const effectiveLightnessSettings = lightnessSettings || { mode: 'contrast' };
    
    if (effectiveLightnessSettings.mode === 'contrast') {
      // Check if there's a manual lightness override for this step
      if (controls.lightnessValues[step] !== undefined) {
        lightness = controls.lightnessValues[step];
      } else {
        // Fall back to calculated lightness from contrast target
        const targetContrast = controls.contrastTargets[step as keyof typeof controls.contrastTargets];
        lightness = calculateLightnessForContrast(targetContrast, controls.backgroundColor);
      }
    } else {
      // Use manual lightness calculation
      lightness = controls.lightnessMin + normalizedStep * (controls.lightnessMax - controls.lightnessMin);
    }
    
    // Calculate chroma based on mode
    let chroma: number;
    if (controls.chromaMode === 'manual') {
      chroma = controls.chromaValues[step] || 0.1;
    } else if (controls.chromaMode === 'smooth') {
      // Bell curve distribution
      const peak = controls.chromaPeak; // Use configurable peak position
      const chromaPosition = Math.abs(normalizedStep - peak);
      const chromaFactor = Math.exp(-Math.pow(chromaPosition, 2) / 0.15);
      chroma = controls.maxChroma * chromaFactor;
    } else { // vibrant
      chroma = controls.maxChroma;
    }
    
    // Calculate hue with three-hue system
    // Base hue (step 500) is the anchor point in the middle
    let hue: number;
    
    if (step <= 500) {
      // Light colors: interpolate between baseHue + lightHueDrift (at step 50) and baseHue (at step 500)
      const lightProgress = (500 - step) / (500 - 50); // 1 at step 50, 0 at step 500
      hue = controls.baseHue + (lightProgress * controls.lightHueDrift);
    } else {
      // Dark colors: interpolate between baseHue (at step 500) and baseHue + darkHueDrift (at step 950)
      const darkProgress = (step - 500) / (950 - 500); // 0 at step 500, 1 at step 950
      hue = controls.baseHue + (darkProgress * controls.darkHueDrift);
    }
    
    // Ensure hue is in valid range
    hue = hue % 360;
    if (hue < 0) hue += 360;
    
    // Apply gamut constraints if enabled
    let finalLightness = lightness;
    let finalChroma = chroma;
    let finalHue = hue;
    
    // Use provided gamut settings or defaults for backward compatibility
    const effectiveGamutSettings = gamutSettings || { gamutMode: 'sRGB', enforceGamut: true };
    
    if (effectiveGamutSettings.enforceGamut) {
      const clampedResult = clampColorToGamut(
        { l: lightness, c: chroma, h: hue },
        effectiveGamutSettings.gamutMode
      );
      
      if (clampedResult.clamped) {
        finalLightness = clampedResult.l;
        finalChroma = clampedResult.c;
        finalHue = clampedResult.h;
      }
    }
    
    // Create OKLCH color with final values
    const oklchColor = oklch({
      mode: 'oklch',
      l: finalLightness,
      c: finalChroma,
      h: finalHue
    });
    
    // Convert to CSS color
    const cssColor = formatHex(oklchColor) || '#000000';
    
    // Calculate contrast against background
    const contrastBackground = effectiveLightnessSettings.mode === 'contrast' ? (controls.backgroundColor || '#ffffff') : '#ffffff';
    const contrast = wcagContrast(oklchColor, contrastBackground) || 1;
    
    return {
      step,
      lightness: finalLightness,
      chroma: finalChroma,
      hue: finalHue,
      oklch: `oklch(${(finalLightness * 100).toFixed(1)}% ${finalChroma.toFixed(3)} ${finalHue.toFixed(1)})`,
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
export function validateColor(color: PaletteColor, controls: PaletteControls, gamutSettings?: { gamutMode: 'sRGB' | 'P3' | 'Rec2020'; enforceGamut: boolean }, lightnessSettings?: { mode: 'contrast' | 'range' }): {
  inGamut: boolean;
  gamut: ColorGamut | null;
  gamutValidation: GamutValidation;
  contrastAccuracy?: 'GOOD' | 'OK' | 'POOR';
  contrastDelta?: number;
  warnings: string[];
} {
  const warnings: string[] = [];
  
  // Use provided gamut settings or defaults for backward compatibility
  const effectiveGamutSettings = gamutSettings || { gamutMode: 'sRGB', enforceGamut: true };
  
  // Validate against target gamut
  const gamutValidation = validateColorGamut(color, effectiveGamutSettings.gamutMode);
  const gamut = gamutValidation.detectedGamut;
  const inGamut = gamutValidation.withinGamut;
  
  if (!inGamut && effectiveGamutSettings.enforceGamut) {
    if (gamutValidation.requiresGamut) {
      warnings.push(`Color requires ${gamutValidation.requiresGamut} gamut support (current target: ${effectiveGamutSettings.gamutMode})`);
    }
  } else if (!inGamut && !effectiveGamutSettings.enforceGamut) {
    if (gamutValidation.requiresGamut) {
      warnings.push(`Color extends beyond ${effectiveGamutSettings.gamutMode} into ${gamutValidation.requiresGamut} gamut`);
    }
  }
  
  // Check contrast accuracy if in contrast mode
  let contrastAccuracy: 'GOOD' | 'OK' | 'POOR' | undefined;
  let contrastDelta: number | undefined;
  
  // Use provided lightness settings or defaults for backward compatibility
  const effectiveLightnessSettings = lightnessSettings || { mode: 'contrast' };
  
  if (effectiveLightnessSettings.mode === 'contrast' && controls.contrastTargets) {
    const targetContrast = controls.contrastTargets[color.step as keyof typeof controls.contrastTargets];
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
        // Override with actual stored values
        ...palette.controls
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
          ...palette.controls
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