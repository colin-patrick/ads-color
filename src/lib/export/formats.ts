import { PaletteColor } from '../../types';

/**
 * Export utilities for transforming palette data into external formats.
 * Pure transformation functions for different output systems.
 */

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