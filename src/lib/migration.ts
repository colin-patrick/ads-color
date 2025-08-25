import { PaletteControls } from '../types';

/**
 * Convert old PaletteControls to new simplified steps format
 */
export function migratePaletteControls(oldControls: any): PaletteControls {
  // If already migrated to new format (has steps as number array), return as-is
  if (oldControls.steps && Array.isArray(oldControls.steps) && typeof oldControls.steps[0] === 'number') {
    // Clean up automatic lightness calculation for existing palettes
    const cleanedControls = { ...oldControls };
    
    // If lightnessMode is 'auto' but we have hardcoded values with false overrides,
    // clear the hardcoded values to force automatic calculation
    if (cleanedControls.lightnessMode === 'auto' && cleanedControls.lightnessValues && cleanedControls.lightnessOverrides) {
      const newLightnessValues: Record<string, number> = {};
      const newLightnessOverrides: Record<string, boolean> = {};
      
      // Only keep lightness values that are explicitly overridden
      Object.keys(cleanedControls.lightnessOverrides).forEach(stepKey => {
        if (cleanedControls.lightnessOverrides[stepKey] === true && cleanedControls.lightnessValues[stepKey] !== undefined) {
          newLightnessValues[stepKey] = cleanedControls.lightnessValues[stepKey];
          newLightnessOverrides[stepKey] = true;
        }
        // If override is false, don't include the lightness value (force automatic calculation)
      });
      
      cleanedControls.lightnessValues = newLightnessValues;
      cleanedControls.lightnessOverrides = newLightnessOverrides;
    }
    
    return cleanedControls as PaletteControls;
  }

  // Create default steps: 0 (white), 1-11 (core palette), 12 (black)
  const coreSteps = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  
  // If old format had CustomStep array, extract any intermediate steps
  const existingIntermediates: number[] = [];
  if (oldControls.steps && Array.isArray(oldControls.steps)) {
    oldControls.steps.forEach((step: any) => {
      const position = typeof step === 'object' ? step.position : step;
      if (typeof position === 'number' && !Number.isInteger(position)) {
        existingIntermediates.push(position);
      }
    });
  }

  // Convert Record<number|string, X> to Record<string, X> with proper key handling
  const migrateRecord = (record: Record<string | number, any>): Record<string, any> => {
    const result: Record<string, any> = {};
    
    if (!record) return result;
    
    Object.entries(record).forEach(([key, value]) => {
      // Handle both numeric keys and string keys
      const numericKey = typeof key === 'string' ? parseFloat(key) : key;
      
      // If it's a valid number, use string representation
      if (!isNaN(numericKey)) {
        result[numericKey.toString()] = value;
      } else {
        result[key.toString()] = value;
      }
    });
    
    return result;
  };

  return {
    ...oldControls,
    steps: [...coreSteps, ...existingIntermediates].sort((a, b) => a - b),
    tokenNames: oldControls.tokenNames || {}, // Keep existing custom token names
    chromaValues: migrateRecord(oldControls.chromaValues || {}),
    contrastTargets: migrateRecord(oldControls.contrastTargets || {}),
    lightnessValues: migrateRecord(oldControls.lightnessValues || {}),
    lightnessOverrides: migrateRecord(oldControls.lightnessOverrides || {})
  };
}

/**
 * Get default steps configuration for new palettes: 0 (white) through 12 (black)
 */
export function getDefaultSteps(): number[] {
  return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
}

/**
 * Convert numeric records to string records for consistency
 */
export function convertToStringRecord<T>(record: Record<number, T>): Record<string, T> {
  const result: Record<string, T> = {};
  Object.entries(record).forEach(([key, value]) => {
    result[key.toString()] = value;
  });
  return result;
}
