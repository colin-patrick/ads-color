/**
 * Mathematical functions for curve calculations and transformations.
 * Pure mathematical functions with no color-specific knowledge.
 */

/**
 * Apply easing function to a normalized factor (0-1)
 */
export function applyEasing(factor: number, easing: string = 'none'): number {
  switch (easing) {
    case 'ease-in':
      return factor * factor;
    case 'ease-out':
      return 1 - Math.pow(1 - factor, 2);
    case 'ease-in-out':
      return factor < 0.5 
        ? 2 * factor * factor 
        : 1 - Math.pow(-2 * factor + 2, 2) / 2;
    default:
      return factor;
  }
}

/**
 * Calculate chroma factor based on curve type and distance from peak
 */
export function calculateChromaFactor(
  distance: number, 
  curveType: string, 
  easing: string = 'none'
): number {
  let baseFactor: number;
  
  switch (curveType) {
    case 'flat':
      // Flat distribution (replaces old 'vibrant' mode)
      baseFactor = 1;
      break;
    case 'gaussian':
      // Normalized Gaussian bell curve that reaches 0 at distance 0.5
      const rawGaussian = Math.exp(-Math.pow(distance, 2) / 0.15);
      const minGaussian = Math.exp(-Math.pow(0.5, 2) / 0.15); // Value at distance 0.5
      baseFactor = distance >= 0.5 ? 0 : (rawGaussian - minGaussian) / (1 - minGaussian);
      break;
    case 'linear':
      // Triangular distribution - fix to work with full distance range
      baseFactor = Math.max(0, 1 - distance * 2);
      break;
    case 'sine':
      // Sine wave curve - fix to work with full distance range
      baseFactor = distance <= 0.5 ? Math.cos(distance * Math.PI) : 0;
      break;
    case 'cubic':
      // Cubic curve - fix to work with full distance range
      baseFactor = distance <= 0.5 ? Math.pow(1 - distance * 2, 3) : 0;
      break;
    case 'quartic':
      // Quartic curve - fix to work with full distance range
      baseFactor = distance <= 0.5 ? Math.pow(1 - distance * 2, 4) : 0;
      break;
    default:
      // Fallback to Gaussian
      baseFactor = Math.exp(-Math.pow(distance, 2) / 0.15);
  }
  
  // Apply easing transformation
  return applyEasing(baseFactor, easing);
}