import { oklch, formatCss, parse } from 'culori';

/**
 * Core color space operations and validation functions.
 * These are fundamental, stateless operations with no business logic dependencies.
 */

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
 * Format an OKLCH color to CSS string using Culori's built-in formatting
 */
export function formatOklchWithCulori(color: { l: number; c: number; h: number }): string {
  const oklchColor = oklch({ mode: 'oklch', l: color.l, c: color.c, h: color.h });
  return formatCss(oklchColor) || '#000000';
}