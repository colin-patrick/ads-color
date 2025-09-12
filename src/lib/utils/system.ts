import { Palette, PaletteControls } from '../../types';
import { generatePalette } from '../palette/generation';

/**
 * System utilities for browser integration and application infrastructure.
 * Clipboard, ID generation, and other system-level operations.
 */

/**
 * Generate unique ID for palettes
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
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