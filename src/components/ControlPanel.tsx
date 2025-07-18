import { RotateCcw, RefreshCw } from 'lucide-react'
import { PaletteControls } from '../types'
import { presets, defaultControls } from '../lib/presets'
import { Slider } from './ui/slider'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { cn } from '../lib/utils'
import { calculateLightnessForContrast } from '../lib/colorGeneration'

interface ControlPanelProps {
  controls: PaletteControls
  onControlsChange: (controls: PaletteControls) => void
  paletteName?: string
  paletteColor?: string
  colors?: Array<{ step: number; contrast: number; lightness: number; css: string }>
}

export function ControlPanel({ controls, onControlsChange, paletteName, paletteColor, colors }: ControlPanelProps) {
  const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

  const updateControl = (key: keyof PaletteControls, value: any) => {
    onControlsChange({ ...controls, [key]: value })
  }

  const updateContrastTarget = (step: number, value: number) => {
    const newTargets = { ...controls.contrastTargets };
    newTargets[step as keyof typeof newTargets] = value;
    updateControl('contrastTargets', newTargets);
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
      {/* Fixed Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div 
            className="w-4 h-4 rounded-full border border-gray-300" 
            style={{ backgroundColor: paletteColor || '#3b82f6' }}
          ></div>
          <h2 className="text-lg font-semibold text-gray-900">{paletteName || 'Palette Controls'}</h2>
        </div>
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Presets Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Presets</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(presets).map(([name]) => (
                <Button
                  key={name}
                  onClick={() => applyPreset(name)}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "text-sm",
                    name === 'red' && "bg-red-50 border-red-200 text-red-700 hover:bg-red-100",
                    name === 'blue' && "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100",
                    name === 'green' && "bg-green-50 border-green-200 text-green-700 hover:bg-green-100",
                    name === 'purple' && "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100",
                    name === 'orange' && "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                  )}
                >
                  {name.charAt(0).toUpperCase() + name.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Base Hue */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-900">Base Hue (Middle)</label>
              <span className="text-sm text-gray-500">{Math.round(controls.baseHue)}°</span>
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
              <label className="text-sm font-medium text-gray-900">Light Hue Drift</label>
              <span className="text-sm text-gray-500">{Math.round(controls.lightHueDrift)}°</span>
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
              <label className="text-sm font-medium text-gray-900">Dark Hue Drift</label>
              <span className="text-sm text-gray-500">{Math.round(controls.darkHueDrift)}°</span>
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

          {/* Chroma Controls */}
          <div className="space-y-4">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900">Chroma Controls</h3>
              
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">Chroma Mode</label>
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
                  <label className="text-sm font-medium text-gray-700">Individual Chroma Values</label>
                  <div className="space-y-2">
                    {steps.map(step => (
                      <div key={step} className="flex items-center space-x-3">
                        <span className="text-xs font-mono text-gray-500 w-8">{step}</span>
                        <Slider
                          value={[controls.chromaValues[step] || 0.1]}
                          onValueChange={(value) => updateChromaValue(step, value[0])}
                          min={0}
                          max={0.5}
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
                      <label className="text-sm font-medium text-gray-700">Max Chroma</label>
                      <span className="text-sm text-gray-500">{(controls.maxChroma * 100).toFixed(0)}%</span>
                    </div>
                    <Slider
                      value={[controls.maxChroma]}
                      onValueChange={(value) => updateControl('maxChroma', value[0])}
                      min={0}
                      max={0.37}
                      step={0.01}
                      className="w-full"
                    />
                  </div>

                  {controls.chromaMode === 'smooth' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">Chroma Peak Position</label>
                        <span className="text-sm text-gray-500">{(controls.chromaPeak * 100).toFixed(0)}%</span>
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
            </div>
          </div>

          {/* Color Gamut Controls */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Color Gamut</h3>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Target Gamut</label>
                <Select value={controls.gamutMode} onValueChange={(value) => updateControl('gamutMode', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sRGB">sRGB (Standard - Web Safe)</SelectItem>
                    <SelectItem value="P3">P3 (Wide Gamut - Modern Displays)</SelectItem>
                    <SelectItem value="Rec2020">Rec2020 (Ultra Wide - HDR)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {controls.gamutMode === 'sRGB' && 'Compatible with all devices and browsers'}
                  {controls.gamutMode === 'P3' && 'Modern displays and Apple devices'}
                  {controls.gamutMode === 'Rec2020' && 'HDR displays and future displays'}
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Enforce Gamut</label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={controls.enforceGamut}
                    onChange={(e) => updateControl('enforceGamut', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Clamp colors</span>
                </label>
              </div>
              <p className="text-xs text-gray-500">
                {controls.enforceGamut 
                  ? 'Colors will be automatically clamped to fit within the target gamut' 
                  : 'Colors may extend beyond the target gamut (warnings will be shown)'}
              </p>
            </div>
          </div>

          {/* Contrast Mode */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">Contrast Mode</h3>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={controls.contrastMode}
                  onChange={(e) => updateControl('contrastMode', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Enable</span>
              </label>
            </div>
            
            {controls.contrastMode && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">Background Color</label>
                  <input
                    type="color"
                    value={controls.backgroundColor}
                    onChange={(e) => updateControl('backgroundColor', e.target.value)}
                    className="w-full h-10 border border-gray-300 rounded-md cursor-pointer"
                  />
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">Contrast Targets</label>
                  <div className="space-y-2">
                    {steps.map(step => (
                      <div key={step} className="flex items-center space-x-3">
                        <span className="text-xs font-mono text-gray-500 w-8">{step}</span>
                        <Input
                          type="number"
                          value={controls.contrastTargets[step as keyof typeof controls.contrastTargets]}
                          onChange={(e) => updateContrastTarget(step, parseFloat(e.target.value))}
                          min="1"
                          max="21"
                          step="0.1"
                          className="flex-1 text-sm"
                        />
                        {step === 500 && <span className="text-xs text-gray-400">AA</span>}
                        {step === 700 && <span className="text-xs text-gray-400">AAA</span>}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    Each step has its own contrast target. AA = 4.5:1, AAA = 7:1
                  </p>
                </div>

                {/* Individual Lightness Controls in Contrast Mode */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">Manual Lightness Adjustments</label>
                  <div className="space-y-2">
                    {steps.map(step => {
                      const color = colors?.find(c => c.step === step);
                      const targetContrast = controls.contrastTargets[step as keyof typeof controls.contrastTargets];
                      const actualContrast = color?.contrast || 0;
                      
                      return (
                        <div key={step} className="border border-gray-200 rounded-lg p-3 space-y-2">
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
                  <p className="text-xs text-gray-500">
                    Adjust lightness manually to fine-tune contrast ratios. Click refresh to reset to calculated value.
                  </p>
                </div>
              </div>
            )}

            {/* Manual Controls - When Contrast Mode is OFF */}
            {!controls.contrastMode && (
              <div className="space-y-4">
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
              </div>
            )}


          </div>

          {/* Reset Button */}
          <Button
            onClick={resetToDefaults}
            variant="outline"
            className="w-full"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>
      </div>
    </>
  )
} 