/**
 * Global Step Manager - CRUD operations for managing the global step registry
 * 
 * This manager handles all operations for creating, reading, updating, and deleting
 * global step definitions that all palettes inherit from.
 */

import { 
  GlobalStepSettings, 
  GlobalStepDefinition, 
  StepInsertionConfig,
  StepValidationResult,
  GlobalStepOperation 
} from '../../types/stepSystem';
import { interpolateContrastTarget } from './colorResolution';

/**
 * Global Step Manager class that handles all step registry operations
 */
export class GlobalStepManager {
  private settings: GlobalStepSettings;
  private listeners: Array<(settings: GlobalStepSettings) => void> = [];

  constructor(initialSettings: GlobalStepSettings) {
    this.settings = { ...initialSettings };
  }

  /**
   * Get current global step settings
   */
  getSettings(): GlobalStepSettings {
    return { ...this.settings };
  }

  /**
   * Get all steps sorted by position
   */
  getSteps(): GlobalStepDefinition[] {
    return [...this.settings.steps].sort((a, b) => a.position - b.position);
  }

  /**
   * Get a specific step by token name
   */
  getStepByTokenName(tokenName: string): GlobalStepDefinition | undefined {
    return this.settings.steps.find(step => step.tokenName === tokenName);
  }

  /**
   * Get a specific step by position
   */
  getStepByPosition(position: number): GlobalStepDefinition | undefined {
    return this.settings.steps.find(step => step.position === position);
  }

  /**
   * Add a new step to the global registry
   */
  addStep(config: StepInsertionConfig): StepValidationResult {
    const validation = this.validateStepInsertion(config);
    if (!validation.isValid) {
      return validation;
    }

    const newStep: GlobalStepDefinition = {
      tokenName: config.tokenName,
      contrastTarget: config.contrastTarget || this.calculateInterpolatedContrastTarget(config.position),
      position: config.position
    };

    this.settings = {
      ...this.settings,
      steps: [...this.settings.steps, newStep],
      updatedAt: new Date()
    };

    this.notifyListeners();
    
    return { isValid: true, errors: [], warnings: [] };
  }

  /**
   * Remove a step from the global registry
   */
  removeStep(tokenName: string): StepValidationResult {
    const step = this.getStepByTokenName(tokenName);
    if (!step) {
      return {
        isValid: false,
        errors: [`Step with token name '${tokenName}' not found`],
        warnings: []
      };
    }

    // Validate removal (prevent removing essential steps)
    if (this.isEssentialStep(step)) {
      return {
        isValid: false,
        errors: [`Cannot remove essential step '${tokenName}'`],
        warnings: []
      };
    }

    this.settings = {
      ...this.settings,
      steps: this.settings.steps.filter(s => s.tokenName !== tokenName),
      updatedAt: new Date()
    };

    this.notifyListeners();
    
    return { isValid: true, errors: [], warnings: [] };
  }

  /**
   * Update an existing step
   */
  updateStep(tokenName: string, updates: Partial<GlobalStepDefinition>): StepValidationResult {
    const stepIndex = this.settings.steps.findIndex(s => s.tokenName === tokenName);
    if (stepIndex === -1) {
      return {
        isValid: false,
        errors: [`Step with token name '${tokenName}' not found`],
        warnings: []
      };
    }

    const currentStep = this.settings.steps[stepIndex];
    const updatedStep = { ...currentStep, ...updates };

    // Validate the update
    const validation = this.validateStepUpdate(currentStep, updatedStep);
    if (!validation.isValid) {
      return validation;
    }

    const newSteps = [...this.settings.steps];
    newSteps[stepIndex] = updatedStep;

    this.settings = {
      ...this.settings,
      steps: newSteps,
      updatedAt: new Date()
    };

    this.notifyListeners();
    
    return { isValid: true, errors: [], warnings: [] };
  }

  /**
   * Reorder steps by updating their positions
   */
  reorderSteps(newOrder: Array<{ tokenName: string; position: number }>): StepValidationResult {
    const validation = this.validateReorder(newOrder);
    if (!validation.isValid) {
      return validation;
    }

    const updatedSteps = this.settings.steps.map(step => {
      const newPosition = newOrder.find(order => order.tokenName === step.tokenName);
      return newPosition ? { ...step, position: newPosition.position } : step;
    });

    this.settings = {
      ...this.settings,
      steps: updatedSteps,
      updatedAt: new Date()
    };

    this.notifyListeners();
    
    return { isValid: true, errors: [], warnings: [] };
  }

  /**
   * Update the contrast background for all steps
   */
  updateContrastBackground(backgroundColor: string): void {
    this.settings = {
      ...this.settings,
      contrastBackground: backgroundColor,
      updatedAt: new Date()
    };

    this.notifyListeners();
  }

  /**
   * Batch operation - apply multiple operations atomically
   */
  applyOperations(operations: GlobalStepOperation[]): StepValidationResult {
    // Validate all operations first
    for (const operation of operations) {
      const validation = this.validateOperation(operation);
      if (!validation.isValid) {
        return validation;
      }
    }

    // Apply all operations
    const newSettings = { ...this.settings };
    let steps = [...newSettings.steps];

    for (const operation of operations) {
      switch (operation.type) {
        case 'add':
          if (operation.step) {
            steps.push(operation.step as GlobalStepDefinition);
          }
          break;
        case 'remove':
          if (operation.step?.tokenName) {
            steps = steps.filter(s => s.tokenName !== operation.step!.tokenName);
          }
          break;
        case 'update':
          if (operation.step?.tokenName) {
            const index = steps.findIndex(s => s.tokenName === operation.step!.tokenName);
            if (index >= 0) {
              steps[index] = { ...steps[index], ...operation.step };
            }
          }
          break;
      }
    }

    this.settings = {
      ...newSettings,
      steps,
      updatedAt: new Date()
    };

    this.notifyListeners();
    
    return { isValid: true, errors: [], warnings: [] };
  }

  /**
   * Subscribe to changes in global step settings
   */
  subscribe(listener: (settings: GlobalStepSettings) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Private: Notify all listeners of changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.settings));
  }

  /**
   * Private: Validate step insertion
   */
  private validateStepInsertion(config: StepInsertionConfig): StepValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if token name already exists
    if (this.getStepByTokenName(config.tokenName)) {
      errors.push(`Step with token name '${config.tokenName}' already exists`);
    }

    // Check if position already exists
    if (this.getStepByPosition(config.position)) {
      errors.push(`Step with position '${config.position}' already exists`);
    }

    // Validate token name format
    if (!config.tokenName.trim()) {
      errors.push('Token name cannot be empty');
    }

    // Validate position range
    if (config.position < 0 || config.position > 20) {
      warnings.push('Position outside recommended range (0-20)');
    }

    // Validate contrast target
    if (config.contrastTarget && (config.contrastTarget < 1 || config.contrastTarget > 21)) {
      warnings.push('Contrast target outside valid range (1-21)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Private: Validate step update
   */
  private validateStepUpdate(current: GlobalStepDefinition, updated: GlobalStepDefinition): StepValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // If token name is changing, check for conflicts
    if (updated.tokenName !== current.tokenName) {
      if (this.getStepByTokenName(updated.tokenName)) {
        errors.push(`Step with token name '${updated.tokenName}' already exists`);
      }
    }

    // If position is changing, check for conflicts
    if (updated.position !== current.position) {
      const existingStep = this.getStepByPosition(updated.position);
      if (existingStep && existingStep.tokenName !== current.tokenName) {
        errors.push(`Step with position '${updated.position}' already exists`);
      }
    }

    // Validate contrast target
    if (updated.contrastTarget < 1 || updated.contrastTarget > 21) {
      warnings.push('Contrast target outside valid range (1-21)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Private: Validate reorder operation
   */
  private validateReorder(newOrder: Array<{ tokenName: string; position: number }>): StepValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for duplicate positions
    const positions = newOrder.map(order => order.position);
    const uniquePositions = new Set(positions);
    if (positions.length !== uniquePositions.size) {
      errors.push('Duplicate positions in reorder operation');
    }

    // Check that all existing steps are accounted for
    const existingTokens = this.settings.steps.map(s => s.tokenName).sort();
    const reorderTokens = newOrder.map(o => o.tokenName).sort();
    
    if (JSON.stringify(existingTokens) !== JSON.stringify(reorderTokens)) {
      errors.push('Reorder must include all existing steps');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Private: Validate individual operation
   */
  private validateOperation(operation: GlobalStepOperation): StepValidationResult {
    // Basic validation for batch operations
    // More detailed validation would be done when applying each operation
    if (!operation.type) {
      return {
        isValid: false,
        errors: ['Operation type is required'],
        warnings: []
      };
    }

    return { isValid: true, errors: [], warnings: [] };
  }

  /**
   * Private: Check if a step is essential (cannot be removed)
   */
  private isEssentialStep(step: GlobalStepDefinition): boolean {
    // Essential steps that should not be removed (white, primary, black)
    const essentialTokens = ['100', '50', '0'];
    return essentialTokens.includes(step.tokenName);
  }

  /**
   * Private: Calculate interpolated contrast target for new position
   */
  private calculateInterpolatedContrastTarget(position: number): number {
    return interpolateContrastTarget(position, this.settings.steps);
  }
}

/**
 * Factory function to create a GlobalStepManager with default settings
 */
export function createDefaultGlobalStepManager(): GlobalStepManager {
  const defaultSettings: GlobalStepSettings = {
    steps: [
      { tokenName: '100', contrastTarget: 1.0, position: 0 },
      { tokenName: '95', contrastTarget: 1.1, position: 1 },
      { tokenName: '90', contrastTarget: 1.3, position: 2 },
      { tokenName: '80', contrastTarget: 1.7, position: 3 },
      { tokenName: '70', contrastTarget: 2.3, position: 4 },
      { tokenName: '60', contrastTarget: 3.2, position: 5 },
      { tokenName: '50', contrastTarget: 4.5, position: 6 },
      { tokenName: '40', contrastTarget: 6.7, position: 7 },
      { tokenName: '30', contrastTarget: 9.3, position: 8 },
      { tokenName: '20', contrastTarget: 13.1, position: 9 },
      { tokenName: '15', contrastTarget: 15.2, position: 10 },
      { tokenName: '10', contrastTarget: 17.2, position: 11 },
      { tokenName: '0', contrastTarget: 21.0, position: 12 }
    ],
    contrastBackground: '#ffffff',
    version: '1.0',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return new GlobalStepManager(defaultSettings);
}