import { RotateCcw, RefreshCw, Plus, Trash2 } from 'lucide-react'
import { PaletteControls, Palette, GamutSettings, DEFAULT_PRECISION } from '../types'
import { defaultControls } from '../lib/presets'
import { PrecisionSlider } from './ui/precision-slider'
import { Button } from './ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { CardContent, CardHeader } from './ui/card'
import { Label } from './ui/label'
import { ColorCombobox, ColorOption } from './ui/color-combobox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { generatePalette, getMaxChromaForGamut } from '../lib/colorGeneration'
import { HueVisualizer } from './HueVisualizer'
import { CurvePreview } from './CurvePreview'
import { useMemo, useState } from 'react'
import { CustomStep } from '../types'
import { Input } from './ui/input'
import { Slider } from './ui/slider'
import { cn } from '../lib/utils'

interface ControlPanelProps {
  controls: PaletteControls
  onControlsChange: (controls: PaletteControls) => void
  paletteName?: string
  paletteColor?: string
  colors?: Array<{ step: number; contrast: number; lightness: number; css: string }>
  lightnessMode: 'contrast' | 'range'
  // New props for palette management
  palettes: Palette[]
  activePaletteId: string
  onActivePaletteChange: (paletteId: string) => void
  // Color options for the background color combobox
  colorOptions: ColorOption[]
  // Gamut settings for dynamic max chroma
  gamutSettings: GamutSettings
}

export function ControlPanel({ 
  controls, 
  onControlsChange, 
  paletteName, 
  paletteColor, 
  colors, 
  lightnessMode,
  palettes,
  activePaletteId,
  onActivePaletteChange,
  colorOptions,
  gamutSettings
}: ControlPanelProps) {
  // Edit mode state for step management
  const [isEditingSteps, setIsEditingSteps] = useState(false)

  // Calculate dynamic max chroma based on current gamut
  const maxChroma = useMemo(() => 
    getMaxChromaForGamut(gamutSettings.gamutMode), 
    [gamutSettings.gamutMode]
  );

  // Generate color swatches for palettes
  const paletteColors = useMemo(() => {
    const colors: Record<string, string> = {};
    for (const palette of palettes) {
      const generatedPalette = generatePalette(palette.controls, { gamutMode: 'sRGB' }, { mode: 'contrast' });
      colors[palette.id] = generatedPalette[5]?.css || '#3b82f6'; // Use step 6 as representative color
    }
    return colors;
  }, [palettes]);

  const updateControl = (key: keyof PaletteControls, value: any) => {
    onControlsChange({ ...controls, [key]: value })
  }

  // Removed - no longer need manual mode switching

  const updateChromaValue = (step: number, value: number) => {
    const newValues = { ...controls.chromaValues };
    newValues[step.toString()] = value;
    updateControl('chromaValues', newValues);
  }

  const updateLightnessValue = (step: number, value: number) => {
    const newValues = { ...controls.lightnessValues };
    const newOverrides = { ...controls.lightnessOverrides };
    const stepKey = step.toString();
    
    newValues[stepKey] = value;
    newOverrides[stepKey] = true; // Always set override flag when manually adjusting
    
    onControlsChange({ 
      ...controls, 
      lightnessValues: newValues,
      lightnessOverrides: newOverrides
    });
  }

  const resetLightnessToCalculated = (step: number) => {
    const newOverrides = { ...controls.lightnessOverrides };
    newOverrides[step.toString()] = false; // Clear override flag to use calculated value
    
    onControlsChange({ 
      ...controls, 
      lightnessOverrides: newOverrides
    });
  }

  const resetToDefaults = () => {
    onControlsChange(defaultControls)
  }

  // Step management functions
  const updateStepTokenName = (position: number, newTokenName: string) => {
    const newSteps = controls.steps?.map(step => 
      step.position === position 
        ? { ...step, tokenName: newTokenName }
        : step
    ) || []
    
    updateControl('steps', newSteps)
  }

  const addStep = (afterPosition: number) => {
    const currentSteps = controls.steps || []
    const sortedSteps = [...currentSteps].sort((a, b) => a.position - b.position)
    
    // Find the next step after the given position
    const currentIndex = sortedSteps.findIndex(step => step.position === afterPosition)
    const nextStep = sortedSteps[currentIndex + 1]
    
    // Calculate new position (halfway between current and next)
    const newPosition = nextStep 
      ? afterPosition + (nextStep.position - afterPosition) / 2
      : afterPosition + 1
    
    // Auto-suggest token name (interpolate between adjacent token names if they're numeric)
    const currentStep = sortedSteps[currentIndex]
    let suggestedTokenName = newPosition.toString()
    
    if (currentStep && nextStep) {
      const currentToken = parseInt(currentStep.tokenName)
      const nextToken = parseInt(nextStep.tokenName)
      if (!isNaN(currentToken) && !isNaN(nextToken)) {
        const interpolated = Math.round(currentToken + (nextToken - currentToken) / 2)
        suggestedTokenName = interpolated.toString()
      }
    }
    
    const newStep: CustomStep = {
      position: newPosition,
      tokenName: suggestedTokenName
    }
    
    // Add default values for new step in other records
    const stepKey = newPosition.toString()
    const newContrastTargets = { ...controls.contrastTargets }
    const newLightnessValues = { ...controls.lightnessValues }
    const newLightnessOverrides = { ...controls.lightnessOverrides }
    const newChromaValues = { ...controls.chromaValues }
    
    // Set default values (interpolate from adjacent steps if possible)
    newContrastTargets[stepKey] = 4.5 // Default AA contrast
    newLightnessValues[stepKey] = 0.5 // Default lightness
    newLightnessOverrides[stepKey] = false
    newChromaValues[stepKey] = 0.1 // Default chroma
    
    const newSteps = [...currentSteps, newStep].sort((a, b) => a.position - b.position)
    
    onControlsChange({
      ...controls,
      steps: newSteps,
      contrastTargets: newContrastTargets,
      lightnessValues: newLightnessValues,
      lightnessOverrides: newLightnessOverrides,
      chromaValues: newChromaValues
    })
  }

  const deleteStep = (position: number) => {
    const newSteps = controls.steps?.filter(step => step.position !== position) || []
    const stepKey = position.toString()
    
    // Remove from all related records
    const newContrastTargets = { ...controls.contrastTargets }
    const newLightnessValues = { ...controls.lightnessValues }
    const newLightnessOverrides = { ...controls.lightnessOverrides }
    const newChromaValues = { ...controls.chromaValues }
    
    delete newContrastTargets[stepKey]
    delete newLightnessValues[stepKey]
    delete newLightnessOverrides[stepKey]
    delete newChromaValues[stepKey]
    
    onControlsChange({
      ...controls,
      steps: newSteps,
      contrastTargets: newContrastTargets,
      lightnessValues: newLightnessValues,
      lightnessOverrides: newLightnessOverrides,
      chromaValues: newChromaValues
    })
  }

  const isCustomStep = (position: number) => {
    // A step is custom if it's not one of the original 1-11 positions
    return !Number.isInteger(position) || position < 1 || position > 11
  }

  return (
    <>
      {/* Fixed Header with Palette Selector */}
              <CardHeader className="p-4 border-b border-border flex-shrink-0">
        <div className="space-y-2">
          <div className="space-y-1">
            <Select value={activePaletteId} onValueChange={onActivePaletteChange}>
              <SelectTrigger className="w-full" title="Active Palette - Switch between your palettes">
                <SelectValue>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded-full border border-input flex-shrink-0" 
                      style={{ backgroundColor: paletteColors[activePaletteId] || paletteColor || '#6b7280' }}
                    ></div>
                    <span className="text-sm truncate">
                      {paletteName || 'Unnamed Palette'}
                    </span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {palettes.map((palette) => (
                  <SelectItem key={palette.id} value={palette.id}>
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-4 h-4 rounded-full border border-input flex-shrink-0" 
                        style={{ backgroundColor: paletteColors[palette.id] }}
                      ></div>
                      <span className="truncate">{palette.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <CardContent className="px-4 pt-4 pb-4 space-y-6">
          {/* Hue Visualizer - Always visible */}
          <HueVisualizer 
            controls={controls}
            colors={colors || []}
          />

          {/* Shadcn Tabs */}
          <Tabs defaultValue="hue" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="hue">Hue</TabsTrigger>
              <TabsTrigger value="chroma">Chroma</TabsTrigger>
              <TabsTrigger value="lightness">Lightness</TabsTrigger>
            </TabsList>

            <TabsContent value="hue" className="space-y-4 mt-6">
              {/* Base Hue */}
              <div className="space-y-3">
                <PrecisionSlider
                  value={controls.baseHue}
                  onChange={(value) => updateControl('baseHue', value)}
                  min={0}
                  max={360}
                  step={DEFAULT_PRECISION.hue.step}
                  label="Base Hue (Middle)"
                  unit="°"
                  formatDisplay={(value) => `${value.toFixed(DEFAULT_PRECISION.hue.displayDecimals)}°`}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">Anchor hue at middle of palette (step 6)</p>
              </div>

              {/* Light Hue Drift */}
              <div className="space-y-3">
                <PrecisionSlider
                  value={controls.lightHueDrift}
                  onChange={(value) => updateControl('lightHueDrift', value)}
                  min={-60}
                  max={60}
                  step={DEFAULT_PRECISION.hue.step}
                  label="Light Hue Drift"
                  unit="°"
                  formatDisplay={(value) => `${value.toFixed(DEFAULT_PRECISION.hue.displayDecimals)}°`}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">Hue shift for light colors (steps 1-5)</p>
              </div>

              {/* Dark Hue Drift */}
              <div className="space-y-3">
                <PrecisionSlider
                  value={controls.darkHueDrift}
                  onChange={(value) => updateControl('darkHueDrift', value)}
                  min={-60}
                  max={60}
                  step={DEFAULT_PRECISION.hue.step}
                  label="Dark Hue Drift"
                  unit="°"
                  formatDisplay={(value) => `${value.toFixed(DEFAULT_PRECISION.hue.displayDecimals)}°`}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">Hue shift for dark colors (steps 7-11)</p>
              </div>
            </TabsContent>

            <TabsContent value="chroma" className="space-y-4 mt-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Chroma Mode</Label>
                <Select value={controls.chromaMode} onValueChange={(value) => updateControl('chromaMode', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual Control</SelectItem>
                    <SelectItem value="curve">Curve Distribution</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {controls.chromaMode === 'manual' && (
                <div className="space-y-6">
                  <Label className="text-sm font-medium">Individual Chroma Values</Label>
                  <div className="space-y-6">
                    {(controls.steps || []).sort((a, b) => a.position - b.position).map(stepInfo => (
                      <div key={stepInfo.position} className="flex items-center space-x-2">
                        <PrecisionSlider
                          value={controls.chromaValues[stepInfo.position.toString()] ?? 0.1}
                          onChange={(value) => updateChromaValue(stepInfo.position, value)}
                          min={0}
                          max={maxChroma}
                          step={DEFAULT_PRECISION.chroma.step}
                          label={stepInfo.tokenName}
                          formatDisplay={(value) => value.toFixed(DEFAULT_PRECISION.chroma.displayDecimals)}
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {controls.chromaMode === 'curve' && (
                <div className="space-y-6">
                  <CurvePreview controls={controls} />
                  
                  <PrecisionSlider
                    value={controls.minChroma}
                    onChange={(value) => updateControl('minChroma', value)}
                    min={0}
                    max={controls.maxChroma * 0.8}
                    step={DEFAULT_PRECISION.chroma.step}
                    label="Min Chroma"
                    formatDisplay={(value) => value.toFixed(DEFAULT_PRECISION.chroma.displayDecimals)}
                    className="w-full"
                  />
                  
                  <PrecisionSlider
                    value={controls.maxChroma}
                    onChange={(value) => updateControl('maxChroma', value)}
                    min={controls.minChroma || 0}
                    max={maxChroma}
                    step={DEFAULT_PRECISION.chroma.step}
                    label="Max Chroma"
                    formatDisplay={(value) => value.toFixed(DEFAULT_PRECISION.chroma.displayDecimals)}
                    className="w-full"
                  />

                  {controls.chromaCurveType !== 'flat' && (
                    <PrecisionSlider
                      value={controls.chromaPeak}
                      onChange={(value) => updateControl('chromaPeak', value)}
                      min={0}
                      max={1}
                      step={0.01}
                      label="Chroma Peak Position"
                      className="w-full"
                    />
                  )}

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Curve Type</Label>
                    <Select 
                      value={controls.chromaCurveType || 'gaussian'} 
                      onValueChange={(value) => updateControl('chromaCurveType', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flat">Flat (Equal Chroma)</SelectItem>
                        <SelectItem value="gaussian">Gaussian (Smooth Bell)</SelectItem>
                        <SelectItem value="linear">Linear (Triangular)</SelectItem>
                        <SelectItem value="sine">Sine Wave (Gentle)</SelectItem>
                        <SelectItem value="cubic">Cubic (Dramatic)</SelectItem>
                        <SelectItem value="quartic">Quartic (Very Dramatic)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Curve Easing</Label>
                    <Select 
                      value={controls.chromaEasing || 'none'} 
                      onValueChange={(value) => updateControl('chromaEasing', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="ease-in">Ease In (Slow Start)</SelectItem>
                        <SelectItem value="ease-out">Ease Out (Slow End)</SelectItem>
                        <SelectItem value="ease-in-out">Ease In-Out (Both)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="lightness" className="space-y-4 mt-6">
              <div className="text-xs text-muted-foreground mb-4">
                Mode: {lightnessMode === 'contrast' ? 'Contrast-based' : 'Range-based'}
              </div>
              
              {lightnessMode === 'contrast' && (
                <div className="space-y-4">
                  {/* Removed lightness mode selector - always use auto with overrides */}
                  
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Contrast Target Color</Label>
                    <ColorCombobox
                      value={controls.backgroundColor}
                      onChange={(value) => updateControl('backgroundColor', value)}
                      options={colorOptions}
                      placeholder="Select target contrast color..."
                      className="w-full"
                    />
                  </div>
                  
                  {/* Lightness Controls - Auto with individual overrides */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">
                        Lightness Values
                      </Label>
                      <div className="flex items-center space-x-2">
                        {!isEditingSteps ? (
                          <Button
                            onClick={() => setIsEditingSteps(true)}
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                          >
                            Edit Steps
                          </Button>
                        ) : (
                          <>
                            <Button
                              onClick={() => setIsEditingSteps(false)}
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                            >
                              Save
                            </Button>
                            <Button
                              onClick={() => setIsEditingSteps(false)}
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Values calculated automatically to achieve target contrast ratios.
                    </p>
                    <div className="space-y-2">
                      {/* Add Step Button before first step (shown in edit mode) */}
                      {isEditingSteps && (controls.steps || []).length > 0 && (
                        <div className="flex justify-center py-1">
                          <Button
                            onClick={() => {
                              const sortedSteps = [...(controls.steps || [])].sort((a, b) => a.position - b.position)
                              const firstPosition = sortedSteps[0]?.position || 1
                              const newPosition = Math.max(0.5, firstPosition - 0.5) // Ensure we don't go below 0.5
                              
                              const newStep: CustomStep = {
                                position: newPosition,
                                tokenName: newPosition.toString()
                              }
                              
                              // Add default values for new step
                              const stepKey = newPosition.toString()
                              const newContrastTargets = { ...controls.contrastTargets }
                              const newLightnessValues = { ...controls.lightnessValues }
                              const newLightnessOverrides = { ...controls.lightnessOverrides }
                              const newChromaValues = { ...controls.chromaValues }
                              
                              newContrastTargets[stepKey] = 4.5
                              newLightnessValues[stepKey] = 0.9 // Light value for early step
                              newLightnessOverrides[stepKey] = false
                              newChromaValues[stepKey] = 0.1
                              
                              const newSteps = [...(controls.steps || []), newStep].sort((a, b) => a.position - b.position)
                              
                              onControlsChange({
                                ...controls,
                                steps: newSteps,
                                contrastTargets: newContrastTargets,
                                lightnessValues: newLightnessValues,
                                lightnessOverrides: newLightnessOverrides,
                                chromaValues: newChromaValues
                              })
                            }}
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-muted-foreground hover:text-foreground border-dashed border"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Step
                          </Button>
                        </div>
                      )}
                      
                      {(controls.steps || []).sort((a, b) => a.position - b.position).map((stepInfo, index) => {
                        const step = stepInfo.position;
                        const color = colors?.find(c => c.step === step);
                        const stepKey = step.toString();
                        const targetContrast = controls.contrastTargets[stepKey] || 1;
                        const actualContrast = color?.contrast || 0;
                        
                        // Simple value calculation - always auto mode with optional overrides
                        const hasManualOverride = controls.lightnessOverrides?.[stepKey] || false;
                        
                        let currentLightness: number;
                        if (hasManualOverride) {
                          // Use manually overridden value
                          currentLightness = controls.lightnessValues[stepKey] ?? (color?.lightness || 0.5);
                        } else {
                          // Use calculated value
                          currentLightness = color?.lightness || 0.5;
                        }
                        
                        return (
                          <div key={step}>
                            {/* Add Step Button (shown in edit mode, before each step except the first) */}
                            {isEditingSteps && index > 0 && (
                              <div className="flex justify-center py-1">
                                <Button
                                  onClick={() => addStep((controls.steps || []).sort((a, b) => a.position - b.position)[index - 1].position)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs text-muted-foreground hover:text-foreground border-dashed border"
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add Step
                                </Button>
                              </div>
                            )}
                            
                            <div className="space-y-2">
                              {/* Controls row: position, label, value input, action button */}
                              <div className="flex items-center space-x-2">
                                {/* Position number (edit mode only) */}
                                {isEditingSteps && (
                                  <span className="text-xs text-muted-foreground font-mono min-w-[20px] text-center">
                                    {step}
                                  </span>
                                )}
                                
                                {/* Label container - fixed width to prevent slider width changes */}
                                <div className="min-w-[80px] flex-1">
                                  {isEditingSteps ? (
                                    <Input
                                      value={stepInfo.tokenName}
                                      onChange={(e) => updateStepTokenName(step, e.target.value)}
                                      className={cn(
                                        "text-sm font-medium bg-transparent border border-transparent px-2 py-1 h-8 shadow-none",
                                        "focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-input focus-visible:bg-background",
                                        "hover:border-input hover:bg-muted/30 rounded-md transition-colors"
                                      )}
                                      placeholder="Token name"
                                    />
                                  ) : (
                                    <div className="h-8 flex items-center">
                                      <label className="text-sm font-medium">{stepInfo.tokenName}</label>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Value input */}
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    value={Math.round((currentLightness * 100) * 100) / 100}
                                    onChange={(e) => {
                                      const newValue = parseFloat(e.target.value)
                                      if (!isNaN(newValue)) {
                                        const clampedValue = Math.max(0, Math.min(100, newValue))
                                        updateLightnessValue(step, clampedValue / 100)
                                      }
                                    }}
                                    onBlur={(e) => {
                                      const newValue = parseFloat(e.target.value)
                                      if (isNaN(newValue)) {
                                        e.target.value = (Math.round((currentLightness * 100) * 100) / 100).toString()
                                      }
                                    }}
                                    min={0}
                                    max={100}
                                    step={DEFAULT_PRECISION.lightness.step * 100}
                                    className="w-20 h-8 text-sm font-mono pr-1 pl-3"
                                  />
                                  <span className="text-sm text-muted-foreground">%</span>
                                </div>
                                
                                {/* Action button */}
                                <div className="w-6 flex items-center justify-center">
                                  {isEditingSteps && isCustomStep(step) ? (
                                    <Button
                                      onClick={() => deleteStep(step)}
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                      title="Delete custom step"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  ) : !isEditingSteps && hasManualOverride ? (
                                    <Button
                                      onClick={() => resetLightnessToCalculated(step)}
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                      title="Reset to calculated value"
                                    >
                                      <RefreshCw className="w-3 h-3" />
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
                              
                              {/* Slider row */}
                              <div className="py-2 mr-8">
                                <Slider
                                  value={[currentLightness * 100]}
                                  onValueChange={(values) => updateLightnessValue(step, values[0] / 100)}
                                  min={0}
                                  max={100}
                                  step={DEFAULT_PRECISION.lightness.step * 100}
                                  className="w-full"
                                />
                              </div>
                              
                              {/* Contrast Info */}
                              <div className="flex justify-start">
                                <span className="text-xs text-muted-foreground">
                                  Target: {targetContrast} | Actual: {actualContrast.toFixed(1)}
                                </span>
                              </div>
                            </div>
                            
                            {/* Add Step Button (after last step in edit mode) */}
                            {isEditingSteps && index === (controls.steps || []).length - 1 && (
                              <div className="flex justify-center py-2">
                                <Button
                                  onClick={() => addStep(step)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs text-muted-foreground hover:text-foreground border-dashed border"
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add Step
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Manual Controls - When in Range Mode */}
              {lightnessMode === 'range' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-foreground">Lightness Range</label>
            <span className="text-sm text-muted-foreground">
                      {Math.round(controls.lightnessMin * 100)}% - {Math.round(controls.lightnessMax * 100)}%
                    </span>
                  </div>
                  <div className="space-y-6">
                    <PrecisionSlider
                      value={controls.lightnessMin * 100}
                      onChange={(value) => updateControl('lightnessMin', value / 100)}
                      min={50}
                      max={100}
                      step={DEFAULT_PRECISION.lightness.step * 100}
                      label="Max Lightness (Step 1)"
                      unit="%"
                      formatDisplay={(value) => `${value.toFixed(2)}%`}
                      className="w-full"
                    />
                    <PrecisionSlider
                      value={controls.lightnessMax * 100}
                      onChange={(value) => updateControl('lightnessMax', value / 100)}
                      min={0}
                      max={50}
                      step={DEFAULT_PRECISION.lightness.step * 100}
                      label="Min Lightness (Step 11)"
                      unit="%"
                      formatDisplay={(value) => `${value.toFixed(2)}%`}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Reset Button */}
          <Button
            onClick={resetToDefaults}
            variant="outline"
            className="w-full"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
        </CardContent>
      </div>
    </>
  )
} 