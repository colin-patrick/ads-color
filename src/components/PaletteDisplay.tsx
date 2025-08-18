import { generatePalette, getColorFormats, analyzeContrast, getContrastBadge, copyToClipboard, getTextColorForBackground, convertPaletteToLuminance } from '../lib/colorGeneration'
import { Palette, ColorFormat, GamutSettings, LightnessSettings } from '../types'
import { toast } from 'sonner'

interface PaletteDisplayProps {
  palettes: Palette[]
  gridMode: boolean
  luminanceMode: boolean
  colorFormat: ColorFormat
  contrastAnalysis: {
    enabled: boolean
    selectedColor: string
    showCompliance: boolean
  }
  showColorLabels: boolean
  gamutSettings: GamutSettings
  lightnessSettings: LightnessSettings
}

export function PaletteDisplay({
  palettes,
  gridMode,
  luminanceMode,
  colorFormat,
  contrastAnalysis,
  showColorLabels,
  gamutSettings,
  lightnessSettings
}: PaletteDisplayProps) {
  // Handle copying color values to clipboard
  const handleCopyColor = async (color: any) => {
    const formats = getColorFormats(color)
    const colorValue = formats[colorFormat]
    
    const success = await copyToClipboard(colorValue)
    if (success) {
      toast(
        <span>
          Copied <span className="font-mono">{colorValue}</span>
        </span>
      )
    }
  }

  return (
    <div className="flex-1 overflow-auto flex flex-col">
      <div className="p-6 flex-1 flex flex-col">
        {gridMode ? (
          /* Grid Mode - Each palette in its own responsive column with grid layout */
          <div className="flex gap-4 w-full flex-1">
            {palettes.map(palette => {
              const paletteColors = generatePalette(palette.controls, gamutSettings, lightnessSettings)
              const displayColors = luminanceMode ? convertPaletteToLuminance(paletteColors) : paletteColors
              
              return (
                <div key={palette.id} className="flex flex-col max-w-[33%] min-w-[200px] flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-4">{palette.name}</h3>
                  <div className="grid grid-cols-1 gap-0 w-full flex-1" style={{ gridTemplateRows: `repeat(${displayColors.length}, minmax(60px, 1fr))` }}>
                    {displayColors.map((color) => {
                      const formats = getColorFormats(color)
                      const displayValue = formats[colorFormat]
                      
                      // Calculate contrast if enabled (use original color for contrast calculation)
                      const originalColor = paletteColors.find(c => c.step === color.step) || color
                      
                      // Determine the background color for contrast analysis
                      let contrastBackgroundColor = contrastAnalysis.selectedColor
                      if (contrastAnalysis.selectedColor.startsWith('palette-')) {
                        const step = parseInt(contrastAnalysis.selectedColor.replace('palette-', ''))
                        const paletteStepColor = paletteColors.find(c => c.step === step)
                        contrastBackgroundColor = paletteStepColor?.css || contrastAnalysis.selectedColor
                      }
                      
                      const contrastResult = contrastAnalysis.enabled 
                        ? analyzeContrast(originalColor, contrastBackgroundColor)
                        : null
                      
                      const contrastBadge = contrastResult ? getContrastBadge(contrastResult, originalColor, contrastAnalysis.showCompliance) : null
                      
                      return (
                        <div 
                          key={color.step}
                          className="cursor-pointer relative flex flex-col justify-between p-2 h-full"
                          style={{ backgroundColor: color.css }}
                          onClick={() => handleCopyColor(originalColor)}
                          title={`Click to copy: ${displayValue}`}
                        >
                          {/* Top-right badges container */}
                          <div className="absolute top-1 right-1 flex items-center space-x-1">
                            {/* Gamut compliance badge removed - colors are always clamped to selected gamut */}
                            
                            {/* Contrast analysis badge */}
                            {contrastResult && contrastBadge && (
                              <div 
                                className="px-1 py-0.5 rounded text-xs font-medium"
                                style={contrastBadge.style}
                                title={contrastBadge.description}
                              >
                                {contrastBadge.label}
                              </div>
                            )}
                          </div>
                          
                          {/* Step number at top */}
                          <div className="flex justify-start">
                            <div 
                              className="text-xs font-bold"
                              style={{ 
                                color: getTextColorForBackground(color)
                              }}
                            >
                              {color.tokenName}
                            </div>
                          </div>
                          
                          {/* Color value at bottom */}
                          {showColorLabels && (
                            <div className="flex flex-col">
                              <div 
                                className="text-xs font-mono leading-tight break-all"
                                style={{ 
                                  color: getTextColorForBackground(color)
                                }}
                                title={displayValue}
                              >
                                {displayValue}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Column Mode - Traditional horizontal layout with horizontal scroll */
          <div className="overflow-x-auto">
            <div className="flex space-x-8 min-w-max pb-6">
            {palettes.map(palette => {
              const paletteColors = generatePalette(palette.controls, gamutSettings, lightnessSettings)
              const displayColors = luminanceMode ? convertPaletteToLuminance(paletteColors) : paletteColors
              
              return (
                <div key={palette.id} className="flex-shrink-0 space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">{palette.name}</h3>
                  <div className="flex flex-col gap-2">
                    {displayColors.map((color) => {
                      const formats = getColorFormats(color)
                      const displayValue = formats[colorFormat]
                      
                      // Calculate contrast if enabled (use original color for contrast calculation)
                      const originalColor = paletteColors.find(c => c.step === color.step) || color
                      
                      // Determine the background color for contrast analysis
                      let contrastBackgroundColor = contrastAnalysis.selectedColor
                      if (contrastAnalysis.selectedColor.startsWith('palette-')) {
                        const step = parseInt(contrastAnalysis.selectedColor.replace('palette-', ''))
                        const paletteStepColor = paletteColors.find(c => c.step === step)
                        contrastBackgroundColor = paletteStepColor?.css || contrastAnalysis.selectedColor
                      }
                      
                      const contrastResult = contrastAnalysis.enabled 
                        ? analyzeContrast(originalColor, contrastBackgroundColor)
                        : null
                      
                      const contrastBadge = contrastResult ? getContrastBadge(contrastResult, originalColor, contrastAnalysis.showCompliance) : null
                      
                      return (
                        <div key={color.step} className="flex-shrink-0">
                          <div 
                            className="w-64 h-24 rounded-lg border border-border cursor-pointer relative flex flex-col justify-between p-2"
                            style={{ backgroundColor: color.css }}
                            onClick={() => handleCopyColor(originalColor)}
                            title={`Click to copy: ${displayValue}`}
                          >
                            {/* Top-right badges container */}
                            <div className="absolute top-1 right-1 flex items-center space-x-1">
                              {/* Gamut compliance badge removed - colors are always clamped to selected gamut */}
                              
                              {/* Contrast analysis badge */}
                              {contrastResult && contrastBadge && (
                                <div 
                                  className="px-1 py-0.5 rounded text-xs font-medium"
                                  style={contrastBadge.style}
                                  title={contrastBadge.description}
                                >
                                  {contrastBadge.label}
                                </div>
                              )}
                            </div>
                            
                            {/* Step number at top */}
                            <div className="flex justify-start">
                              <div 
                                className="text-sm font-bold"
                                style={{ 
                                  color: getTextColorForBackground(color)
                                }}
                              >
                                {color.tokenName}
                              </div>
                            </div>
                            
                            {/* Color value and contrast at bottom */}
                            {showColorLabels && (
                              <div className="flex flex-col space-y-1">
                                <div 
                                  className="text-xs font-mono leading-tight"
                                  style={{ 
                                    color: getTextColorForBackground(color)
                                  }}
                                  title={displayValue}
                                >
                                  {displayValue}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 