import { Palette, PaletteControls } from '../../types';
import { generatePalette } from '../palette/generation';
import { migratePaletteControls } from '../migration';
import { defaultControls, presets } from '../presets';
import { generateId, createNewPalette } from '../utils/system';
import defaultPalettesData from '../../data/default-palettes.json';

/**
 * External integration functions for data conversion and loading.
 * Handles data from external sources and systems.
 */

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