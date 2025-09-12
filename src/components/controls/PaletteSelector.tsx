import { Palette } from '../../types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface PaletteSelectorProps {
  palettes: Palette[];
  activePaletteId: string;
  onActivePaletteChange: (paletteId: string) => void;
  paletteName?: string;
  paletteColor?: string;
  paletteColors: Record<string, string>;
}

export function PaletteSelector({
  palettes,
  activePaletteId,
  onActivePaletteChange,
  paletteName,
  paletteColor,
  paletteColors
}: PaletteSelectorProps) {
  return (
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
  );
}