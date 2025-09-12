import { Palette } from '../../types';
import { migratePaletteControls } from '../migration';

/**
 * Data persistence operations for palette storage and retrieval.
 * Handles localStorage operations and import/export functionality.
 */

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
        id: palette.id,
        name: palette.name || 'Imported Palette',
        createdAt: palette.createdAt ? new Date(palette.createdAt) : new Date(),
        updatedAt: palette.updatedAt ? new Date(palette.updatedAt) : new Date(),
        controls: {
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