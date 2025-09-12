import { PaletteControls } from '../../types';
import { PrecisionSlider } from '../ui/precision-slider';

interface BaseColorControlsProps {
  controls: PaletteControls;
  onControlChange: (key: keyof PaletteControls, value: any) => void;
}

export function BaseColorControls({ controls, onControlChange }: BaseColorControlsProps) {
  return (
    <div className="space-y-4 mt-6">
      {/* Base Hue */}
      <div className="space-y-3">
        <PrecisionSlider
          value={controls.baseHue}
          onChange={(value) => onControlChange('baseHue', value)}
          min={0}
          max={360}
          step={0.1}
          label="Base Hue (Middle)"
          unit="°"
          formatDisplay={(value) => `${value.toFixed(1)}°`}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">Anchor hue at middle of palette (step 6)</p>
      </div>

      {/* Light Hue Drift */}
      <div className="space-y-3">
        <PrecisionSlider
          value={controls.lightHueDrift}
          onChange={(value) => onControlChange('lightHueDrift', value)}
          min={-60}
          max={60}
          step={0.1}
          label="Light Hue Drift"
          unit="°"
          formatDisplay={(value) => `${value.toFixed(1)}°`}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">Hue shift for light colors (steps 1-5)</p>
      </div>

      {/* Dark Hue Drift */}
      <div className="space-y-3">
        <PrecisionSlider
          value={controls.darkHueDrift}
          onChange={(value) => onControlChange('darkHueDrift', value)}
          min={-60}
          max={60}
          step={0.1}
          label="Dark Hue Drift"
          unit="°"
          formatDisplay={(value) => `${value.toFixed(1)}°`}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">Hue shift for dark colors (steps 7-11)</p>
      </div>
    </div>
  );
}