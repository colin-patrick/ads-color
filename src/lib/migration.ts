import { PaletteControls, CustomStep } from '../types';

// Token Studio mapping from step numbers (1-11) to token names
const STEP_TO_TOKEN_MAPPING = ['95', '90', '80', '70', '60', '50', '40', '30', '20', '15', '10'];

/**
 * Convert old PaletteControls with numeric Record keys to new CustomStep format
 */
export function migratePaletteControls(oldControls: any): PaletteControls {
  // If already migrated (has steps array), return as-is
  if (oldControls.steps && Array.isArray(oldControls.steps)) {
    return oldControls as PaletteControls;
  }

  // Create default 11 steps with Token Studio mapping
  const defaultSteps: CustomStep[] = [];
  for (let i = 1; i <= 11; i++) {
    defaultSteps.push({
      position: i,
      tokenName: STEP_TO_TOKEN_MAPPING[i - 1] // Convert 1-based to 0-based index
    });
  }

  // Convert Record<number|string, X> to Record<string, X> with proper key handling
  const migrateRecord = (record: Record<string | number, any>): Record<string, any> => {
    const result: Record<string, any> = {};
    
    if (!record) return result;
    
    Object.entries(record).forEach(([key, value]) => {
      // Handle both numeric keys and string keys
      const numericKey = typeof key === 'string' ? parseInt(key, 10) : key;
      
      // If it's a valid number between 1-11, use it directly
      if (!isNaN(numericKey) && numericKey >= 1 && numericKey <= 11) {
        result[numericKey.toString()] = value;
      }
      // Otherwise, keep the original key as string
      else {
        result[key.toString()] = value;
      }
    });
    
    return result;
  };

  return {
    ...oldControls,
    steps: defaultSteps,
    chromaValues: migrateRecord(oldControls.chromaValues || {}),
    contrastTargets: migrateRecord(oldControls.contrastTargets || {}),
    lightnessValues: migrateRecord(oldControls.lightnessValues || {}),
    lightnessOverrides: migrateRecord(oldControls.lightnessOverrides || {})
  };
}

/**
 * Get default 11-step configuration for new palettes
 */
export function getDefaultSteps(): CustomStep[] {
  const steps: CustomStep[] = [];
  for (let i = 1; i <= 11; i++) {
    steps.push({
      position: i,
      tokenName: STEP_TO_TOKEN_MAPPING[i - 1]
    });
  }
  return steps;
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
