import { generatePalette, getColorFormats, analyzeContrast, getContrastBadge, copyToClipboard, getTextColorForBackground, convertPaletteToLuminance } from '../lib/colorGeneration'
import { Palette, ColorFormat, GamutSettings, LightnessSettings } from '../types'
import { toast } from 'sonner'
import { useRef, useEffect } from 'react'

interface PaletteDisplayProps {
  palettes: Palette[]
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
  zoomLevel: number
}

export function PaletteDisplay({
  palettes,
  luminanceMode,
  colorFormat,
  contrastAnalysis,
  showColorLabels,
  gamutSettings,
  lightnessSettings,
  zoomLevel
}: PaletteDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Adjust container height based on zoom level to prevent extra scrollable space
  useEffect(() => {
    if (containerRef.current && contentRef.current && zoomLevel < 1) {
      const contentHeight = contentRef.current.scrollHeight
      const scaledHeight = contentHeight * zoomLevel
      containerRef.current.style.height = `${scaledHeight + 48}px` // 48px for padding (24px top + 24px bottom)
    } else if (containerRef.current) {
      containerRef.current.style.height = 'auto'
    }
  }, [zoomLevel, palettes])

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
    <div className="flex-1 overflow-auto">
      <div 
        ref={containerRef}
        className="p-6"
      >
        <div 
          ref={contentRef}
          className="flex space-x-8 transition-transform duration-200 ease-out"
          style={{ 
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top left'
          }}
        >
            {palettes.map((palette, index) => {
              const paletteColors = generatePalette(palette.controls, gamutSettings, lightnessSettings)
              const displayColors = luminanceMode ? convertPaletteToLuminance(paletteColors) : paletteColors
              
              return (
                <div key={palette.id} className="flex-shrink-0 space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">{palette.name}</h3>
                  <div className="flex flex-col">
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
                            className="w-64 h-20 cursor-pointer relative flex flex-col justify-between p-2"
                            style={{ backgroundColor: color.css }}
                            onClick={() => handleCopyColor(originalColor)}
                            title={`Click to copy: ${displayValue}`}
                          >
                            {/* Top-right badges container */}
                            <div className="absolute top-2 right-2 flex items-center space-x-1">
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
            {/* Spacer element to ensure proper scrolling past the last palette */}
            <div className="flex-shrink-0 w-6" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
} 