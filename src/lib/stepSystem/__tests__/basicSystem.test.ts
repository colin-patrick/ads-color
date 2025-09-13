/**
 * Basic System Tests - Validates core functionality of the step system
 */

import { describe, it, expect } from '@jest/globals';
import { GlobalStepManager, createDefaultGlobalStepManager } from '../globalStepManager';
import { resolvePaletteColors } from '../colorResolution';
import { PaletteModel } from '../../../types/stepSystem';

describe('Basic Step System Tests', () => {
  describe('GlobalStepManager', () => {
    it('should create default manager with standard steps', () => {
      const manager = createDefaultGlobalStepManager();
      const settings = manager.getSettings();
      
      expect(settings.steps).toHaveLength(13); // 0-12 default steps
      expect(settings.contrastBackground).toBe('#ffffff');
      
      // Should have essential steps
      expect(manager.getStepByTokenName('100')).toBeDefined();
      expect(manager.getStepByTokenName('50')).toBeDefined();
      expect(manager.getStepByTokenName('0')).toBeDefined();
    });

    it('should add new steps correctly', () => {
      const manager = createDefaultGlobalStepManager();
      
      const result = manager.addStep({
        position: 5.5,
        tokenName: '55'
      });
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      
      const newStep = manager.getStepByTokenName('55');
      expect(newStep).toBeDefined();
      expect(newStep?.position).toBe(5.5);
      expect(newStep?.contrastTarget).toBeGreaterThan(3.2); // Should be interpolated
      expect(newStep?.contrastTarget).toBeLessThan(4.5);
    });

    it('should prevent duplicate step insertion', () => {
      const manager = createDefaultGlobalStepManager();
      
      const result = manager.addStep({
        position: 6, // Position already exists (50 token)
        tokenName: '45'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Step with position '6' already exists");
    });

    it('should remove non-essential steps', () => {
      const manager = createDefaultGlobalStepManager();
      
      // Add a non-essential step first
      manager.addStep({
        position: 5.5,
        tokenName: '55'
      });
      
      // Should be able to remove it
      const result = manager.removeStep('55');
      expect(result.isValid).toBe(true);
      expect(manager.getStepByTokenName('55')).toBeUndefined();
    });

    it('should prevent removal of essential steps', () => {
      const manager = createDefaultGlobalStepManager();
      
      const result = manager.removeStep('50'); // Essential step
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Cannot remove essential step '50'");
    });

    it('should update step properties', () => {
      const manager = createDefaultGlobalStepManager();
      
      const result = manager.updateStep('90', {
        contrastTarget: 1.5
      });
      
      expect(result.isValid).toBe(true);
      
      const updatedStep = manager.getStepByTokenName('90');
      expect(updatedStep?.contrastTarget).toBe(1.5);
    });

    it('should notify listeners of changes', () => {
      const manager = createDefaultGlobalStepManager();
      let notificationCount = 0;
      
      const unsubscribe = manager.subscribe(() => {
        notificationCount++;
      });
      
      manager.addStep({
        position: 5.5,
        tokenName: '55'
      });
      
      expect(notificationCount).toBe(1);
      
      manager.removeStep('55');
      expect(notificationCount).toBe(2);
      
      unsubscribe();
      
      manager.updateStep('90', { contrastTarget: 1.4 });
      expect(notificationCount).toBe(2); // Should not increment after unsubscribe
    });
  });

  describe('Color Resolution', () => {
    it('should resolve colors for a basic palette', () => {
      const manager = createDefaultGlobalStepManager();
      const globalSettings = manager.getSettings();
      
      const testPalette: PaletteModel = {
        id: 'test-palette',
        name: 'Test Blue Palette',
        personality: {
          baseHue: 240,
          chromaMode: 'curve',
          chromaCurveType: 'gaussian',
          minChroma: 0.05,
          maxChroma: 0.2,
          chromaPeak: 0.5,
          chromaEasing: 'none',
          lightHueDrift: 0,
          darkHueDrift: 0
        },
        stepOverrides: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const resolved = resolvePaletteColors(globalSettings, testPalette);
      
      expect(resolved).toBeDefined();
      expect(resolved.steps).toHaveLength(13);
      
      // Check that colors are valid
      resolved.steps.forEach(step => {
        expect(step.color.css).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(step.resolved.lightness).toBeGreaterThanOrEqual(0);
        expect(step.resolved.lightness).toBeLessThanOrEqual(1);
        expect(step.resolved.chroma).toBeGreaterThanOrEqual(0);
        expect(step.resolved.hue).toBeGreaterThanOrEqual(0);
        expect(step.resolved.hue).toBeLessThan(360);
      });
    });

    it('should apply step overrides correctly', () => {
      const manager = createDefaultGlobalStepManager();
      const globalSettings = manager.getSettings();
      
      const testPalette: PaletteModel = {
        id: 'test-palette',
        name: 'Test Palette with Overrides',
        personality: {
          baseHue: 240,
          chromaMode: 'curve',
          chromaCurveType: 'gaussian',
          minChroma: 0.05,
          maxChroma: 0.2,
          chromaPeak: 0.5,
          chromaEasing: 'none',
          lightHueDrift: 0,
          darkHueDrift: 0
        },
        stepOverrides: {
          '50': {
            lightness: 0.42,
            tokenName: 'primary'
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const resolved = resolvePaletteColors(globalSettings, testPalette);
      
      // Find the overridden step
      const primaryStep = resolved.steps.find(step => step.position === 6); // Position 6 = '50' token
      
      expect(primaryStep).toBeDefined();
      expect(primaryStep?.resolved.lightness).toBe(0.42); // Should use override
      expect(primaryStep?.resolved.tokenName).toBe('primary'); // Should use override
      expect(primaryStep?.overrides.lightness).toBe(0.42); // Should track override
      expect(primaryStep?.overrides.tokenName).toBe('primary'); // Should track override
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow', () => {
      // 1. Create manager with default steps
      const manager = createDefaultGlobalStepManager();
      
      // 2. Add a custom step
      const addResult = manager.addStep({
        position: 5.5,
        tokenName: '55',
        contrastTarget: 3.8
      });
      expect(addResult.isValid).toBe(true);
      
      // 3. Create a palette that uses the new step structure
      const palette: PaletteModel = {
        id: 'integration-test',
        name: 'Integration Test Palette',
        personality: {
          baseHue: 200,
          chromaMode: 'curve',
          chromaCurveType: 'gaussian',
          minChroma: 0.03,
          maxChroma: 0.15,
          chromaPeak: 0.5,
          chromaEasing: 'none',
          lightHueDrift: 5,
          darkHueDrift: -3
        },
        stepOverrides: {
          '55': {
            lightness: 0.6,
            tokenName: 'custom-mid'
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // 4. Resolve colors
      const resolved = resolvePaletteColors(manager.getSettings(), palette);
      
      // 5. Verify the new step is included and properly overridden
      expect(resolved.steps).toHaveLength(14); // 13 default + 1 custom
      
      const customStep = resolved.steps.find(step => 
        step.resolved.tokenName === 'custom-mid'
      );
      
      expect(customStep).toBeDefined();
      expect(customStep?.resolved.lightness).toBe(0.6);
      expect(customStep?.position).toBe(5.5);
    });
  });
});