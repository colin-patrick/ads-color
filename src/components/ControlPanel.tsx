import { RotateCcw, RefreshCw } from 'lucide-react'
import { PaletteControls } from '../types'
import { presets, defaultControls } from '../lib/presets'
import { Slider } from './ui/slider'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { cn } from '../lib/utils'
import { calculateLightnessForContrast, isValidHexColor } from '../lib/colorGeneration'
import { useState, useEffect } from 'react'

interface ControlPanelProps {
  controls: PaletteControls
  onControlsChange: (controls: PaletteControls) => void
  paletteName?: string
  paletteColor?: string
  colors?: Array<{ step: number; contrast: number; lightness: number; css: string }>
  lightnessMode: 'contrast' | 'range'
}

export function ControlPanel({ controls, onControlsChange, paletteName, paletteColor, colors, lightnessMode }: ControlPanelProps) {
  const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  
  // Track the text input value separately for validation
  const [backgroundColorInput, setBackgroundColorInput] = useState(controls.backgroundColor)

  // Keep text input in sync with background color
  useEffect(() => {
    setBackgroundColorInput(controls.backgroundColor)
  }, [controls.backgroundColor])

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
                    name === 'blue' && "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100",
                    name === 'purple' && "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100",
                    name === 'error' && "bg-red-50 border-red-200 text-red-700 hover:bg-red-100",
                    name === 'success' && "bg-green-50 border-green-200 text-green-700 hover:bg-green-100",
                    name === 'warning' && "bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100"
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
          <div className="border-t border-gray-200 pt-4 space-y-3">
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



          {/* Lightness Controls */}
          <div className="border-t border-gray-200 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">Lightness Controls</h3>
              <span className="text-xs text-gray-500">
                Mode: {lightnessMode === 'contrast' ? 'Contrast-based' : 'Range-based'}
              </span>
            </div>
            
            {lightnessMode === 'contrast' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">Background Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={controls.backgroundColor}
                      onChange={(e) => {
                        const newColor = e.target.value;
                        updateControl('backgroundColor', newColor);
                        setBackgroundColorInput(newColor);
                      }}
                      className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={backgroundColorInput}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setBackgroundColorInput(newValue);
                        
                        // Only update the actual background color if it's a valid hex
                        if (isValidHexColor(newValue)) {
                          updateControl('backgroundColor', newValue);
                        }
                      }}
                      className={`flex-1 text-sm font-mono ${
                        isValidHexColor(backgroundColorInput) 
                          ? '' 
                          : 'border-red-300 bg-red-50'
                      }`}
                      placeholder="#ffffff"
                    />
                  </div>
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