# Color Steps Refactor Plan

## Product Requirements Document (PRD)

### Overview
Refactor the color palette system from Tailwind-style step numbering (50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950) to simple sequential numbering (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11) with support for dynamic step counts.

### Goals
1. **Simplify step naming**: Use intuitive 1-11 numbering instead of arbitrary Tailwind values
2. **Enable CRUD operations**: Allow adding/removing steps per palette
3. **Improve maintainability**: Eliminate hardcoded step arrays scattered throughout codebase
4. **Prepare for future features**: Custom step counts and naming conventions

### Current System Analysis

#### Hardcoded Step References Found:
- `src/lib/colorGeneration.ts`: `COLOR_STEPS = [50, 100, 200, ...]` (line 7)
- `src/lib/colorGeneration.ts`: `generatePalette()` function duplicates steps array (line 218)
- `src/components/ControlPanel.tsx`: Hardcoded steps array (line 46)
- `src/data/default-palettes.json`: All step keys use old format
- `src/types/index.ts`: `PaletteControls.contrastTargets` uses hardcoded step keys

#### Data Migration Required:
- LocalStorage user data (`ads-color-generator-palettes`)
- Default palettes JSON file
- All `Record<number, T>` interfaces that use step values as keys

#### Key Insight:
The color generation logic already normalizes steps to 0-1 range:
```typescript
const normalizedStep = (step - 50) / (950 - 50);
```
This can be simplified to use array index instead of step values.

---

## Implementation Plan

### Phase 1: Update Core Data Structures

#### Step 1.1: Update Type Definitions
**File: `src/types/index.ts`**

- [ ] Change `PaletteControls.contrastTargets` from hardcoded interface to `Record<number, number>`
- [ ] Ensure `lightnessValues` and `lightnessOverrides` use `Record<number, T>` format
- [ ] Add optional `steps: number[]` field to `Palette` interface for future extensibility

**Before:**
```typescript
contrastTargets: {
  50: number;
  100: number;
  // ... hardcoded for all 11 steps
};
```

**After:**
```typescript
contrastTargets: Record<number, number>;
```

#### Step 1.2: Update Constants
**File: `src/lib/colorGeneration.ts`**

- [ ] Change `COLOR_STEPS` from `[50, 100, 200, ...]` to `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]`
- [ ] Update JSDoc comments that reference old step values

### Phase 2: Update Color Generation Logic

#### Step 2.1: Simplify Normalization Logic
**File: `src/lib/colorGeneration.ts` - `generatePalette()` function**

- [ ] Remove hardcoded `steps` array (line 218)
- [ ] Accept `steps` parameter with default to `COLOR_STEPS`
- [ ] Change normalization from `(step - 50) / (950 - 50)` to `index / (steps.length - 1)`
- [ ] Update hue drift calculations that reference specific step values (500 as midpoint)

**Current Logic:**
```typescript
const normalizedStep = (step - 50) / (950 - 50);
if (step <= 500) {
  // light colors logic
} else {
  // dark colors logic  
}
```

**New Logic:**
```typescript
const normalizedStep = index / (steps.length - 1);
const midIndex = Math.floor(steps.length / 2);
if (index <= midIndex) {
  // light colors logic
} else {
  // dark colors logic
}
```

#### Step 2.2: Update Other Generation Functions
**File: `src/lib/colorGeneration.ts`**

- [ ] Update `generateColorOptions()` function to use new step values
- [ ] Update any other functions that reference hardcoded step values

### Phase 3: Update UI Components

#### Step 3.1: Update Control Panel
**File: `src/components/ControlPanel.tsx`**

- [ ] Remove hardcoded `steps` array (line 46)
- [ ] Use `COLOR_STEPS` constant instead
- [ ] Update any step-specific logic or displays

#### Step 3.2: Update Display Components
**Files: `src/components/PaletteDisplay.tsx`, etc.**

- [ ] Search for any step-specific display logic
- [ ] Update step labels to show new numbering
- [ ] Ensure contrast analysis badges work with new step format

### Phase 4: Data Migration

#### Step 4.1: Update Default Palettes
**File: `src/data/default-palettes.json`**

- [ ] Convert all step keys from `"50", "100", "200"...` to `"1", "2", "3"...`
- [ ] Update `contrastTargets`, `chromaValues`, `lightnessValues`, `lightnessOverrides`
- [ ] Update `colors` array step values

**Migration Map:**
```
50  → 1    100 → 2    200 → 3    300 → 4    400 → 5    500 → 6
600 → 7    700 → 8    800 → 9    900 → 10   950 → 11
```

#### Step 4.2: Add Migration Logic for User Data
**File: `src/lib/colorGeneration.ts` - `loadPalettesFromStorage()` function**

- [ ] Add migration function to convert old step keys to new format
- [ ] Apply migration during localStorage loading
- [ ] Update backward compatibility logic

```typescript
function migrateStepKeys(paletteData: any): any {
  const stepMigration = {
    50: 1, 100: 2, 200: 3, 300: 4, 400: 5, 500: 6,
    600: 7, 700: 8, 800: 9, 900: 10, 950: 11
  };
  
  // Migrate contrastTargets, lightnessValues, lightnessOverrides, chromaValues
  // Return migrated data
}
```

### Phase 5: Update Documentation and Comments

#### Step 5.1: Update Comments
- [ ] Search for comments referencing old step values (50, 100, 200, etc.)
- [ ] Update JSDoc comments to reflect new numbering
- [ ] Update any example code in comments

#### Step 5.2: Update Import Guide
**File: `PALETTE_IMPORT_GUIDE.md`**

- [ ] Update examples to show new step numbering
- [ ] Add migration notes for users importing old format data

### Phase 6: Testing and Validation

#### Step 6.1: Core Functionality Testing
- [ ] Test palette generation with new step values
- [ ] Verify color calculations remain consistent
- [ ] Test contrast analysis with new numbering
- [ ] Verify UI displays steps correctly

#### Step 6.2: Data Persistence Testing  
- [ ] Test localStorage save/load with new format
- [ ] Verify migration from old format works
- [ ] Test import/export functionality

#### Step 6.3: Edge Cases
- [ ] Test with empty localStorage
- [ ] Test with corrupted data
- [ ] Verify fallback to default palettes works

---

## Implementation Notes

### Key Files to Modify:
1. `src/types/index.ts` - Type definitions
2. `src/lib/colorGeneration.ts` - Core logic and constants
3. `src/components/ControlPanel.tsx` - UI components  
4. `src/data/default-palettes.json` - Default data
5. `PALETTE_IMPORT_GUIDE.md` - Documentation

### Migration Strategy:
- **Breaking change approach**: Since user is only user and accepts breaking changes
- **One-time migration**: Convert existing localStorage data on first load
- **No backward compatibility**: Clean slate with new format

### Testing Strategy:
- Test with existing user data to ensure migration works
- Verify all UI components display correctly with new numbering
- Ensure color generation produces identical results (colors should not change, only step names)

### Success Criteria:
- [ ] All hardcoded step arrays eliminated
- [ ] Sequential numbering (1-11) used throughout system
- [ ] Existing user palettes migrated successfully
- [ ] Color generation produces identical visual results
- [ ] Foundation laid for future CRUD operations on steps

---

## Future Enhancements (Out of Scope)

Once this refactor is complete, future features become possible:
- Dynamic step counts per palette (5 steps, 15 steps, etc.)
- Custom step naming conventions (10, 20, 30 or A, B, C, etc.)
- Step CRUD operations (add/remove steps)
- Step reordering and customization

The current refactor creates the foundation for these features without implementing them. 