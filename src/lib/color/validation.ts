import { PaletteColor, PaletteControls, ColorGamut, GamutValidation } from '../../types';
import { validateColorGamut } from './gamut';

/**
 * Color validation functions for comprehensive color analysis and warnings.
 * Provides validation results and accuracy assessments.
 */

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