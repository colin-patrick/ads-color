import { PaletteControls, GamutSettings } from '../../types';
import { PrecisionSlider } from '../ui/precision-slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { generatePalette } from '../../lib/palette/generation';

interface ChromaControlsProps {
  controls: PaletteControls;
  onControlsChange: (controls: PaletteControls) => void;
  onControlChange: (key: keyof PaletteControls, value: any) => void;
  maxChroma: number;
  gamutSettings: GamutSettings;
  lightnessMode: 'contrast' | 'range';
}

export function ChromaControls({
  controls,
  onControlsChange,
  onControlChange,
  maxChroma,
  gamutSettings,
  lightnessMode
}: ChromaControlsProps) {
  const updateChromaValue = (step: number, value: number) => {
    const newValues = { ...controls.chromaValues };
    newValues[step.toString()] = value;
    onControlChange('chromaValues', newValues);
  };

  // Auto-populate chroma values when switching from curve/perceptual to manual
  const handleChromaModeChange = (newMode: 'manual' | 'curve' | 'perceptual') => {
    const currentMode = controls.chromaMode;
    
    // If switching TO manual mode FROM curve/perceptual, auto-populate with current values
    if (newMode === 'manual' && (currentMode === 'curve' || currentMode === 'perceptual')) {
      // Generate current palette to get actual chroma values
      const currentPalette = generatePalette(controls, gamutSettings, { mode: lightnessMode });
      
      // Extract chroma values for each step - use original calculated values to avoid round-trip drift
      const newChromaValues: Record<string, number> = {};
      currentPalette.forEach(color => {
        // Use originalCalculatedChroma if available (preserves precision), fallback to actual chroma
        newChromaValues[color.step.toString()] = color.originalCalculatedChroma ?? color.chroma;
      });
      
      onControlsChange({
        ...controls,
        chromaMode: newMode,
        chromaValues: newChromaValues
      });
    } else {
      // Normal mode change
      onControlChange('chromaMode', newMode);
    }
  };

  const generateTokenName = (step: number): string => {
    // Check for custom token name first
    if (controls.tokenNames?.[step.toString()]) {
      return controls.tokenNames[step.toString()];
    }
    
    // Token Studio mapping
    const STEP_TO_TOKEN_MAPPING: Record<number, string> = {
      0: '100',
      1: '95', 2: '90', 3: '80', 4: '70', 5: '60', 6: '50',
      7: '40', 8: '30', 9: '20', 10: '15', 11: '10',
      12: '0'
    }
    
    if (STEP_TO_TOKEN_MAPPING[step]) {
      return STEP_TO_TOKEN_MAPPING[step]
    }
    
    // Intermediate steps: generate based on neighboring core steps
    const floor = Math.floor(step)
    const ceil = Math.ceil(step)
    const floorToken = STEP_TO_TOKEN_MAPPING[floor] || floor.toString()
    const ceilToken = STEP_TO_TOKEN_MAPPING[ceil] || ceil.toString()
    
    return `${floorToken}-${ceilToken}`
  };

  return (
    <div className="space-y-4 mt-6">
      <div className="space-y-3">
        <Label className="text-sm font-medium">Chroma Mode</Label>
        <Select value={controls.chromaMode} onValueChange={handleChromaModeChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual Control</SelectItem>
            <SelectItem value="curve">Curve Distribution</SelectItem>
            <SelectItem value="perceptual">Perceptual (Gamut-Aware)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {controls.chromaMode === 'manual' && (
        <div className="space-y-6">
          <Label className="text-sm font-medium">Individual Chroma Values</Label>
          <div className="space-y-6">
            {(controls.steps || []).sort((a, b) => a - b).map(step => (
              <div key={step} className="flex items-center space-x-2">
                <PrecisionSlider
                  value={controls.chromaValues[step.toString()] ?? 0.1}
                  onChange={(value) => updateChromaValue(step, value)}
                  min={0}
                  max={maxChroma}
                  step={0.001}
                  label={generateTokenName(step)}
                  formatDisplay={(value) => value.toFixed(3)}
                  className="flex-1"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {controls.chromaMode === 'curve' && (
        <div className="space-y-6">
          <PrecisionSlider
            value={controls.minChroma}
            onChange={(value) => onControlChange('minChroma', value)}
            min={0}
            max={controls.maxChroma * 0.8}
            step={0.001}
            label="Min Chroma"
            formatDisplay={(value) => value.toFixed(3)}
            className="w-full"
          />
          
          <PrecisionSlider
            value={controls.maxChroma}
            onChange={(value) => onControlChange('maxChroma', value)}
            min={controls.minChroma || 0}
            max={maxChroma}
            step={0.001}
            label="Max Chroma"
            formatDisplay={(value) => value.toFixed(3)}
            className="w-full"
          />

          {controls.chromaCurveType !== 'flat' && (
            <PrecisionSlider
              value={controls.chromaPeak}
              onChange={(value) => onControlChange('chromaPeak', value)}
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
              onValueChange={(value) => onControlChange('chromaCurveType', value)}
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
              onValueChange={(value) => onControlChange('chromaEasing', value)}
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

      {controls.chromaMode === 'perceptual' && (
        <div className="space-y-6">
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <strong>Perceptual Mode:</strong> Maps your curve shape to the actual available gamut space for each lightness level. This ensures smooth transitions without hard clipping, but your min/max chroma values become percentages of what's actually achievable.
          </div>
          
          <PrecisionSlider
            value={controls.minChroma * 100}
            onChange={(value) => onControlChange('minChroma', value / 100)}
            min={0}
            max={controls.maxChroma * 80}
            step={1}
            label="Min Chroma"
            unit="%"
            className="w-full"
          />
          
          <PrecisionSlider
            value={controls.maxChroma * 100}
            onChange={(value) => onControlChange('maxChroma', value / 100)}
            min={(controls.minChroma || 0) * 100}
            max={100}
            step={1}
            label="Max Chroma"
            unit="%"
            className="w-full"
          />

          {controls.chromaCurveType !== 'flat' && (
            <PrecisionSlider
              value={controls.chromaPeak * 100}
              onChange={(value) => onControlChange('chromaPeak', value / 100)}
              min={0}
              max={100}
              step={1}
              label="Curve Peak Position"
              unit="%"
              className="w-full"
            />
          )}

          <div className="space-y-3">
            <Label className="text-sm font-medium">Curve Type</Label>
            <Select 
              value={controls.chromaCurveType || 'gaussian'} 
              onValueChange={(value) => onControlChange('chromaCurveType', value)}
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
              onValueChange={(value) => onControlChange('chromaEasing', value)}
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
    </div>
  );
}