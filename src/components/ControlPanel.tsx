import { RotateCcw, RefreshCw, ChevronDown } from 'lucide-react'
import { PaletteControls, Palette, GamutSettings } from '../types'
import { presets, defaultControls } from '../lib/presets'
import { Slider } from './ui/slider'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card, CardContent, CardHeader } from './ui/card'
import { Label } from './ui/label'
import { ColorCombobox, ColorOption } from './ui/color-combobox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { cn } from '../lib/utils'
import { calculateLightnessForContrast, isValidHexColor, generatePalette, getMaxChromaForGamut } from '../lib/colorGeneration'
import { HueVisualizer } from './HueVisualizer'
import { useState, useEffect, useMemo } from 'react'

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
  const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

  // Calculate dynamic max chroma based on current gamut
  const maxChroma = useMemo(() => 
    getMaxChromaForGamut(gamutSettings.gamutMode), 
    [gamutSettings.gamutMode]
  );

  // Generate color swatches for palettes
  const paletteColors = useMemo(() => {
    const colors: Record<string, string> = {};
    for (const palette of palettes) {
      const generatedPalette = generatePalette(palette.controls, { gamutMode: 'sRGB', enforceGamut: true }, { mode: 'contrast' });
      colors[palette.id] = generatedPalette[5]?.css || '#3b82f6'; // Use step 500 as representative color
    }
    return colors;
  }, [palettes]);

  const updateControl = (key: keyof PaletteControls, value: any) => {
    onControlsChange({ ...controls, [key]: value })
  }

  const updateChromaValue = (step: number, value: number) => {
    const newValues = { ...controls.chromaValues };
    newValues[step] = value;
    updateControl('chromaValues', newValues);
  }

  const updateLightnessValue = (step: number, value: number) => {
    const newValues = { ...controls.lightnessValues };
    newValues[step] = value;
    updateControl('lightnessValues', newValues);
  }

  const resetLightnessToCalculated = (step: number) => {
    const targetContrast = controls.contrastTargets[step as keyof typeof controls.contrastTargets];
    const calculatedLightness = calculateLightnessForContrast(targetContrast, controls.backgroundColor);
    updateLightnessValue(step, calculatedLightness);
  }

  const applyPreset = (presetName: string) => {
    onControlsChange(presets[presetName])
  }

  const resetToDefaults = () => {
    onControlsChange(defaultControls)
  }

  return (
    <>
      {/* Fixed Header with Palette Selector */}
      <CardHeader className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="space-y-2">
          <div className="space-y-1">
            <Select value={activePaletteId} onValueChange={onActivePaletteChange}>
              <SelectTrigger className="w-full" title="Active Palette - Switch between your palettes">
                <SelectValue>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0" 
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
                        className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0" 
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
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Base Hue (Middle)</Label>
                  <span className="text-sm text-muted-foreground">{Math.round(controls.baseHue)}°</span>
                </div>
                <Slider
                  value={[controls.baseHue]}
                  onValueChange={(value) => updateControl('baseHue', value[0])}
                  min={0}
                  max={360}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">Anchor hue at step 500 (middle of palette)</p>
              </div>

              {/* Light Hue Drift */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Light Hue Drift</Label>
                  <span className="text-sm text-muted-foreground">{Math.round(controls.lightHueDrift)}°</span>
                </div>
                <Slider
                  value={[controls.lightHueDrift]}
                  onValueChange={(value) => updateControl('lightHueDrift', value[0])}
                  min={-60}
                  max={60}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">Hue shift for light colors (steps 50-400)</p>
              </div>

              {/* Dark Hue Drift */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Dark Hue Drift</Label>
                  <span className="text-sm text-muted-foreground">{Math.round(controls.darkHueDrift)}°</span>
                </div>
                <Slider
                  value={[controls.darkHueDrift]}
                  onValueChange={(value) => updateControl('darkHueDrift', value[0])}
                  min={-60}
                  max={60}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">Hue shift for dark colors (steps 600-950)</p>
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
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="smooth">Smooth (Bell Curve)</SelectItem>
                    <SelectItem value="vibrant">Vibrant (Flat)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {controls.chromaMode === 'manual' && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Individual Chroma Values</Label>
                  <div className="space-y-2">
                    {steps.map(step => (
                      <div key={step} className="flex items-center space-x-3">
                        <span className="text-xs font-mono text-gray-500 w-8">{step}</span>
                        <Slider
                          value={[controls.chromaValues[step] || 0.1]}
                          onValueChange={(value) => updateChromaValue(step, value[0])}
                          min={0}
                          max={maxChroma}
                          step={0.001}
                          className="flex-1"
                        />
                        <span className="text-xs text-gray-500 w-12 text-right">
                          {((controls.chromaValues[step] || 0.1)).toFixed(3)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(controls.chromaMode === 'smooth' || controls.chromaMode === 'vibrant') && (
                <div className="space-y-3">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Max Chroma</Label>
                      <span className="text-sm text-muted-foreground">{(controls.maxChroma * 100).toFixed(0)}%</span>
                    </div>
                    <Slider
                      value={[controls.maxChroma]}
                      onValueChange={(value) => updateControl('maxChroma', value[0])}
                      min={0}
                      max={maxChroma}
                      step={0.01}
                      className="w-full"
                    />
                  </div>

                  {controls.chromaMode === 'smooth' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Chroma Peak Position</Label>
                        <span className="text-sm text-muted-foreground">{(controls.chromaPeak * 100).toFixed(0)}%</span>
                      </div>
                      <Slider
                        value={[controls.chromaPeak]}
                        onValueChange={(value) => updateControl('chromaPeak', value[0])}
                        min={0}
                        max={1}
                        step={0.01}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="lightness" className="space-y-4 mt-6">
              <div className="text-xs text-muted-foreground mb-4">
                Mode: {lightnessMode === 'contrast' ? 'Contrast-based' : 'Range-based'}
              </div>
              
              {lightnessMode === 'contrast' && (
                <div className="space-y-4">
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
                  
                  {/* Individual Lightness Controls in Contrast Mode */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Manual Lightness Adjustments</Label>
                    <p className="text-xs text-muted-foreground">
                      Adjust lightness manually to fine-tune contrast ratios. Click refresh to reset to calculated value.
                    </p>
                    <div className="space-y-2">
                      {steps.map(step => {
                        const color = colors?.find(c => c.step === step);
                        const targetContrast = controls.contrastTargets[step as keyof typeof controls.contrastTargets];
                        const actualContrast = color?.contrast || 0;
                        
                        return (
                          <div key={step} className="bg-gray-50 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono text-gray-500">{step}</span>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-500">
                                  Target: {targetContrast} | Actual: {actualContrast.toFixed(1)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Slider
                                value={[controls.lightnessValues[step] || 0.5]}
                                onValueChange={(value) => updateLightnessValue(step, value[0])}
                                min={0}
                                max={1}
                                step={0.01}
                                className="flex-1"
                              />
                              <span className="text-xs text-gray-500 w-12">
                                {((controls.lightnessValues[step] || 0.5) * 100).toFixed(0)}%
                              </span>
                              <Button
                                onClick={() => resetLightnessToCalculated(step)}
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                                title="Reset to calculated value"
                              >
                                <RefreshCw className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Manual Controls - When in Range Mode */}
              {lightnessMode === 'range' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Lightness Range</label>
                    <span className="text-sm text-gray-500">
                      {Math.round(controls.lightnessMin * 100)}% - {Math.round(controls.lightnessMax * 100)}%
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-600">Max Lightness (Step 50)</label>
                      <Slider
                        value={[controls.lightnessMin]}
                        onValueChange={(value) => updateControl('lightnessMin', value[0])}
                        min={0.5}
                        max={1}
                        step={0.01}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Min Lightness (Step 950)</label>
                      <Slider
                        value={[controls.lightnessMax]}
                        onValueChange={(value) => updateControl('lightnessMax', value[0])}
                        min={0}
                        max={0.5}
                        step={0.01}
                        className="w-full"
                      />
                    </div>
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