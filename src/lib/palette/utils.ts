import { oklch, rgb, hsl, formatHex, formatRgb, formatHsl } from 'culori';
import { PaletteColor, ColorFormatValue, Palette, GamutSettings, LightnessSettings } from '../../types';
import { generatePalette } from './generation';
import { formatOklchWithCulori } from '../color/core';

/**
 * Helper functions for working with generated palettes.
 * Formatting, naming, and transforming palettes for different use cases.
 */

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
 * Convert a color to luminance-only by removing chroma
 */
export function convertToLuminance(color: PaletteColor): PaletteColor {
  // Use hue directly from color
  const roundedHue = color.hue;
  
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
    oklch: formatOklchWithCulori({ l: color.lightness, c: 0, h: roundedHue })
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