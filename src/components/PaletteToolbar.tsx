import { Eye, EyeOff, Settings } from 'lucide-react'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Separator } from './ui/separator'
import { Toggle } from './ui/toggle'
import { ColorCombobox, ColorOption } from './ui/color-combobox' // Added ColorOption import here
import { ColorFormat } from '../types'

interface PaletteToolbarProps {
  contrastAnalysis: { enabled: boolean; selectedColor: string; showCompliance: boolean }
  setContrastAnalysis: React.Dispatch<React.SetStateAction<PaletteToolbarProps['contrastAnalysis']>>
  gridMode: boolean
  setGridMode: (value: boolean) => void
  luminanceMode: boolean
  setLuminanceMode: (value: boolean) => void
  colorFormat: ColorFormat
  setColorFormat: (value: ColorFormat) => void
  showColorLabels: boolean
  setShowColorLabels: (value: boolean) => void
  colorOptions: ColorOption[]
  setSettingsOpen: (value: boolean) => void
}

export function PaletteToolbar({
  contrastAnalysis,
  setContrastAnalysis,
  gridMode,
  setGridMode,
  luminanceMode,
  setLuminanceMode,
  colorFormat,
  setColorFormat,
  showColorLabels,
  setShowColorLabels,
  colorOptions,
  setSettingsOpen
}: PaletteToolbarProps) {
  const formatOptions: Array<{ value: ColorFormat; label: string }> = [
    { value: 'hex', label: 'HEX' },
    { value: 'rgb', label: 'RGB' },
    { value: 'hsl', label: 'HSL' },
    { value: 'oklch', label: 'OKLCH' }
  ]

  return (
    <div className="p-4 border-b border-border bg-background flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Contrast Analysis Overlay Toggle - Leftmost */}
          <Toggle
            pressed={contrastAnalysis.enabled}
            onPressedChange={(pressed) => setContrastAnalysis(prev => ({ ...prev, enabled: pressed }))}
            className="flex items-center space-x-2"
          >
            {contrastAnalysis.enabled ? 'Overlay WCAG' : 'Overlay off'}
          </Toggle>

          {/* Contrast Analysis Controls - Show when enabled */}
          {contrastAnalysis.enabled && (
            <>
              <ColorCombobox
                value={contrastAnalysis.selectedColor}
                onChange={(value) => setContrastAnalysis(prev => ({ ...prev, selectedColor: value }))}
                options={colorOptions}
                placeholder="Select color..."
                className="w-48"
              />
              
              <Toggle
                pressed={contrastAnalysis.showCompliance}
                onPressedChange={(pressed) => setContrastAnalysis(prev => ({ ...prev, showCompliance: pressed }))}
                aria-label="Show compliance level in badges"
                title="Show/hide FAIL, AA, AAA labels in contrast badges"
              >
                <span className="text-xs">AA</span>
              </Toggle>
            </>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {/* Grid Mode Toggle */}
          <div className="flex items-center space-x-2">
            <Toggle
              pressed={gridMode}
              onPressedChange={setGridMode}
              aria-label="Toggle grid mode"
              title="Toggle grid mode - display all swatches in a responsive grid layout"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
              </svg>
            </Toggle>
          </div>

          {/* Luminance Mode Toggle */}
          <div className="flex items-center space-x-2">
            <Toggle
              pressed={luminanceMode}
              onPressedChange={setLuminanceMode}
              aria-label="Toggle luminance mode"
              title="Toggle luminance mode - show brightness levels without color"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>
              </svg>
            </Toggle>
          </div>

          <div className="flex items-center space-x-2">
            <Label htmlFor="format-select" className="sr-only">
              Color format
            </Label>
            <Select value={colorFormat} onValueChange={(value) => setColorFormat(value as ColorFormat)}>
              <SelectTrigger 
                id="format-select" 
                className="w-24"
                title="Choose the color format for displaying and copying color values (HEX, RGB, HSL, or OKLCH)"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formatOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Toggle to show/hide color value labels */}
            <Toggle
              pressed={showColorLabels}
              onPressedChange={setShowColorLabels}
              size="sm"
              aria-label="Toggle color value labels"
              title={showColorLabels ? 'Hide color value labels' : 'Show color value labels'}
            >
              {showColorLabels ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Toggle>
          </div>
          
          {/* Divider */}
          <Separator orientation="vertical" className="h-6" />
          
          {/* Settings Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsOpen(true)}
            className="w-9 h-9 p-0"
            title="Open settings for Gamut, Lightness Mode, and Contrast Targets"
            aria-label="Open settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}