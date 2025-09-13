/**
 * Type definitions for the Global Step Registry system with inheritance.
 * 
 * This system implements a hierarchical data model where:
 * - Global Step Settings define what steps exist across all palettes
 * - Palette Models inherit global steps and add personality 
 * - Step Overrides provide CSS-like inheritance with property-level mutations
 */

// ================================
// Global Step Registry Types
// ================================

/**
 * Defines the global step schema - the "folder settings" that all palettes inherit from
 */
export interface GlobalStepSettings {
  /** Ordered array of step definitions that apply to all palettes */
  steps: GlobalStepDefinition[]
  /** Background color used for contrast calculations across all palettes */
  contrastBackground: string
  /** Metadata */
  version: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Individual step definition in the global registry
 */
export interface GlobalStepDefinition {
  /** Token name like "95", "90", "80", "55" etc */
  tokenName: string
  /** Target contrast ratio like 1.1, 1.3, 1.7, 4.5 etc */
  contrastTarget: number
  /** Position for ordering (allows insertion like 5.5 between 5 and 6) */
  position: number
}

// ================================
// Palette Model Types  
// ================================

/**
 * Palette instance that inherits from global step settings and adds personality
 */
export interface PaletteModel {
  /** Unique identifier */
  id: string
  /** Display name */
  name: string
  
  /** Palette personality - these settings apply to ALL inherited steps */
  personality: PalettePersonality
  
  /** Step-level overrides - CSS-like inheritance with property mutations */
  stepOverrides: Record<string, StepOverride>
  
  /** Metadata */
  createdAt: Date
  updatedAt: Date
}

/**
 * Personality settings that define how this palette generates colors
 * These apply to all steps unless overridden
 */
export interface PalettePersonality {
  /** Base hue for the palette */
  baseHue: number
  
  /** Chroma behavior settings */
  chromaMode: 'manual' | 'curve' | 'perceptual'
  chromaCurveType: string
  minChroma: number
  maxChroma: number
  chromaPeak: number
  chromaEasing: string
  
  /** Hue drift settings */
  lightHueDrift: number
  darkHueDrift: number
  
  /** Manual chroma values (only used in manual mode) */
  chromaValues?: Record<string, number>
}

/**
 * Step-level override - allows CSS-like inheritance with property-level mutations
 */
export interface StepOverride {
  /** Override computed lightness value */
  lightness?: number
  /** Override computed chroma value */
  chroma?: number  
  /** Override computed hue value */
  hue?: number
  /** Override inherited token name */
  tokenName?: string
}

// ================================
// Resolved Types (Output)
// ================================

/**
 * Final resolved step after applying global + personality + overrides
 */
export interface ResolvedPaletteStep {
  /** Step position from global definition */
  position: number
  
  /** Computed values (from global + personality) */
  computed: {
    lightness: number
    chroma: number
    hue: number
    tokenName: string
    contrastTarget: number
  }
  
  /** Override values (user-specified mutations) */
  overrides: {
    lightness?: number
    chroma?: number
    hue?: number
    tokenName?: string
  }
  
  /** Final resolved values (computed + overrides applied) */
  resolved: {
    lightness: number
    chroma: number
    hue: number
    tokenName: string
    contrastTarget: number
  }
  
  /** Final color output */
  color: {
    css: string
    oklch: string
    contrast: number
  }
}

/**
 * Complete resolved palette with all steps
 */
export interface ResolvedPalette {
  /** Palette metadata */
  id: string
  name: string
  
  /** All resolved steps in position order */
  steps: ResolvedPaletteStep[]
  
  /** Generation metadata */
  generatedAt: Date
  globalStepsVersion: string
}

// ================================
// Operation Types
// ================================

/**
 * Operations for managing global steps
 */
export interface GlobalStepOperation {
  type: 'add' | 'remove' | 'update' | 'reorder'
  position?: number
  step?: Partial<GlobalStepDefinition>
}

/**
 * Configuration for step insertion
 */
export interface StepInsertionConfig {
  /** Position to insert at (e.g. 5.5 to insert between 5 and 6) */
  position: number
  /** Token name for new step */
  tokenName: string
  /** Interpolated contrast target (optional - can be calculated) */
  contrastTarget?: number
}

/**
 * Validation result for step operations
 */
export interface StepValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}