import { useState, useMemo, useEffect } from 'react'
import { ControlPanel } from './components/ControlPanel'
import { GlobalContrastTargets } from './components/GlobalContrastTargets'
import { Popover, PopoverContent, PopoverTrigger } from './components/ui/popover'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Label } from './components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select'
import { generatePalette, copyToClipboard, createNewPalette, getColorFormats, analyzeContrast, getContrastBadge, savePalettesToStorage, loadPalettesFromStorage, validateColor, isValidHexColor } from './lib/colorGeneration'
import { defaultControls } from './lib/presets'
import { PaletteControls, Palette, ColorFormat } from './types'

// Create initial palette
const initialPalette = createNewPalette('Default Palette', defaultControls)

function App() {
  const [palettes, setPalettes] = useState<Palette[]>([initialPalette])
  const [activePaletteId, setActivePaletteId] = useState<string>(initialPalette.id)
  const [isLoaded, setIsLoaded] = useState(false)
  const [colorFormat, setColorFormat] = useState<ColorFormat>('hex')
  const [copiedStep, setCopiedStep] = useState<string | null>(null)
  
  // Rename palette state
  const [editingPaletteId, setEditingPaletteId] = useState<string | null>(null)
  const [editingPaletteName, setEditingPaletteName] = useState<string>('')
  
  // Contrast analysis state
  const [contrastAnalysis, setContrastAnalysis] = useState({
    enabled: false,
    backgroundColor: '#ffffff',
    textSize: 'normal' as 'normal' | 'large'
  })
  
  // Track the text input value separately for validation
  const [backgroundColorInput, setBackgroundColorInput] = useState('#ffffff')

  // Keep text input in sync with background color
  useEffect(() => {
    setBackgroundColorInput(contrastAnalysis.backgroundColor);
  }, [contrastAnalysis.backgroundColor]);

  // Load palettes from storage on app start
  useEffect(() => {
    const savedData = loadPalettesFromStorage()
    if (savedData) {
      setPalettes(savedData.palettes)
      setActivePaletteId(savedData.activePaletteId)
    }
    setIsLoaded(true)
  }, [])

  // Auto-save palettes to storage when they change
  useEffect(() => {
    if (isLoaded) {
      savePalettesToStorage(palettes, activePaletteId)
    }
  }, [palettes, activePaletteId, isLoaded])

  // Get active palette
  const activePalette = useMemo(() => 
    palettes.find(p => p.id === activePaletteId) || palettes[0], 
    [palettes, activePaletteId]
  )

  // Generate colors for active palette
  const activePaletteColors = useMemo(() => 
    activePalette ? generatePalette(activePalette.controls) : [],
    [activePalette]
  )

  // Update active palette controls
  const handleControlsChange = (newControls: PaletteControls) => {
    setPalettes(prev => prev.map(p => 
      p.id === activePaletteId 
        ? { ...p, controls: newControls, updatedAt: new Date() }
        : p
    ))
  }

  // Add new palette
  const handleAddPalette = () => {
    const newPalette = createNewPalette(`Palette ${palettes.length + 1}`, defaultControls)
    setPalettes(prev => [...prev, newPalette])
    setActivePaletteId(newPalette.id)
  }

  // Duplicate palette
  const handleDuplicatePalette = (paletteId: string) => {
    const originalPalette = palettes.find(p => p.id === paletteId)
    if (!originalPalette) return
    
    const duplicatedPalette = createNewPalette(
      `${originalPalette.name} Copy`,
      originalPalette.controls
    )
    setPalettes(prev => [...prev, duplicatedPalette])
    setActivePaletteId(duplicatedPalette.id)
  }

  // Start editing palette name
  const handleStartRename = (paletteId: string, currentName: string) => {
    setEditingPaletteId(paletteId)
    setEditingPaletteName(currentName)
  }

  // Save renamed palette
  const handleSaveRename = () => {
    if (!editingPaletteId || !editingPaletteName.trim()) return
    
    setPalettes(prev => prev.map(p => 
      p.id === editingPaletteId 
        ? { ...p, name: editingPaletteName.trim(), updatedAt: new Date() }
        : p
    ))
    setEditingPaletteId(null)
    setEditingPaletteName('')
  }

  // Cancel rename
  const handleCancelRename = () => {
    setEditingPaletteId(null)
    setEditingPaletteName('')
  }

  // Delete palette
  const handleDeletePalette = (paletteId: string) => {
    setPalettes(prev => {
      const updated = prev.filter(p => p.id !== paletteId)
      if (paletteId === activePaletteId && updated.length > 0) {
        setActivePaletteId(updated[0].id)
      }
      return updated
    })
  }

  // Handle copying color values to clipboard
  const handleCopyColor = async (color: any, stepId: string, paletteId: string) => {
    const formats = getColorFormats(color)
    const colorValue = formats[colorFormat]
    
    const success = await copyToClipboard(colorValue)
    if (success) {
      setCopiedStep(`${paletteId}-${stepId}`)
      setTimeout(() => setCopiedStep(null), 2000)
    }
  }

  // Apply global contrast targets to all palettes
  const handleApplyContrastToAll = (contrastTargets: PaletteControls['contrastTargets']) => {
    setPalettes(prev => prev.map(palette => ({
      ...palette,
      controls: {
        ...palette.controls,
        contrastTargets,
        contrastMode: true // Enable contrast mode when applying targets
      },
      updatedAt: new Date()
    })))
  }

  // Apply global contrast targets to active palette only
  const handleApplyContrastToActive = (contrastTargets: PaletteControls['contrastTargets']) => {
    setPalettes(prev => prev.map(palette => 
      palette.id === activePaletteId
        ? {
            ...palette,
            controls: {
              ...palette.controls,
              contrastTargets,
              contrastMode: true // Enable contrast mode when applying targets
            },
            updatedAt: new Date()
          }
        : palette
    ))
  }



  // Format options for color display
  const formatOptions: Array<{ value: ColorFormat, label: string }> = [
    { value: 'hex', label: 'HEX' },
    { value: 'rgb', label: 'RGB' },
    { value: 'hsl', label: 'HSL' },
    { value: 'oklch', label: 'OKLCH' }
  ]

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Fixed Header Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-900">ADS Color Generator</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel - Palettes */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          {/* Fixed Header */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">Palettes</h2>
          </div>
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="space-y-2">
                {palettes.map(palette => (
                  <div 
                    key={palette.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      palette.id === activePaletteId 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => setActivePaletteId(palette.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <div 
                          className="w-4 h-4 rounded-full border border-gray-300" 
                          style={{ backgroundColor: generatePalette(palette.controls)[5]?.css || '#3b82f6' }}
                        ></div>
                        {editingPaletteId === palette.id ? (
                          <input
                            type="text"
                            value={editingPaletteName}
                            onChange={(e) => setEditingPaletteName(e.target.value)}
                            onBlur={handleSaveRename}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename()
                              if (e.key === 'Escape') handleCancelRename()
                            }}
                            className="text-sm font-medium text-gray-700 bg-transparent border-none outline-none focus:ring-0 px-0"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span 
                            className="text-sm font-medium text-gray-700 cursor-pointer hover:text-blue-600"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStartRename(palette.id, palette.name)
                            }}
                          >
                            {palette.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDuplicatePalette(palette.id)
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-gray-400 hover:text-blue-500"
                          title="Duplicate palette"
                        >
                          ⧉
                        </Button>
                        {palettes.length > 1 && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeletePalette(palette.id)
                            }}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                            title="Delete palette"
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button 
                onClick={handleAddPalette}
                variant="outline"
                className="mt-4 w-full border-dashed"
              >
                + Add Palette
              </Button>
            </div>
          </div>
        </div>

        {/* Middle - All Palettes Display */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Fixed Toolbar */}
          <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="format-select" className="text-sm text-gray-600">Format:</Label>
                  <Select value={colorFormat} onValueChange={(value) => setColorFormat(value as ColorFormat)}>
                    <SelectTrigger id="format-select" className="w-20">
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
                </div>
                
                {/* Global Contrast Targets */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button className="flex items-center space-x-2">
                      <span>⚖️</span>
                      <span>Global Contrast Targets</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <GlobalContrastTargets
                      onApplyToAll={handleApplyContrastToAll}
                      onApplyToActive={handleApplyContrastToActive}
                      defaultTargets={activePalette?.controls.contrastTargets}
                    />
                  </PopoverContent>
                </Popover>
              </div>

            </div>
            
            {/* Contrast Analysis Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={contrastAnalysis.enabled}
                    onChange={(e) => setContrastAnalysis(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Contrast Analysis</span>
                </label>
                
                {contrastAnalysis.enabled && (
                  <>
                    <div className="flex items-center space-x-2">
                      <Label className="text-sm text-gray-600">Background:</Label>
                      <input
                        type="color"
                        value={contrastAnalysis.backgroundColor}
                        onChange={(e) => {
                          const newColor = e.target.value;
                          setContrastAnalysis(prev => ({ ...prev, backgroundColor: newColor }));
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
                            setContrastAnalysis(prev => ({ ...prev, backgroundColor: newValue }));
                          }
                        }}
                        className={`w-20 text-xs font-mono ${
                          isValidHexColor(backgroundColorInput) 
                            ? '' 
                            : 'border-red-300 bg-red-50'
                        }`}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Label className="text-sm text-gray-600">Text Size:</Label>
                      <Select value={contrastAnalysis.textSize} onValueChange={(value) => setContrastAnalysis(prev => ({ ...prev, textSize: value as 'normal' | 'large' }))}>
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="large">Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Scrollable Palettes Display */}
          <div className="flex-1 overflow-x-auto">
            <div className="p-6">
              <div className="flex space-x-8 min-w-max">
                {palettes.map(palette => {
                  const paletteColors = generatePalette(palette.controls)
                  
                  return (
                    <div key={palette.id} className="flex-shrink-0 space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">{palette.name}</h3>
                      <div className="flex flex-col gap-2">
                        {paletteColors.map((color) => {
                          const formats = getColorFormats(color)
                          const displayValue = formats[colorFormat]
                          
                          // Calculate contrast if enabled
                          const contrastResult = contrastAnalysis.enabled 
                            ? analyzeContrast(color, contrastAnalysis.backgroundColor, contrastAnalysis.textSize)
                            : null
                          
                          const contrastBadge = contrastResult ? getContrastBadge(contrastResult) : null
                          
                          // Validate color and get warnings
                          const validation = validateColor(color, palette.controls)
                          
                          return (
                            <div key={color.step} className="flex-shrink-0">
                              <div 
                                className="w-64 h-24 rounded-lg border border-gray-200 cursor-pointer hover:scale-105 transition-transform relative flex flex-col justify-between p-2"
                                style={{ backgroundColor: color.css }}
                                onClick={() => handleCopyColor(color, color.step.toString(), palette.id)}
                                title={`Click to copy: ${displayValue}`}
                              >
                                {copiedStep === `${palette.id}-${color.step}` && (
                                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                                    <span className="text-white text-xs font-medium">Copied!</span>
                                  </div>
                                )}
                                
                                {/* Top-right badges container */}
                                <div className="absolute top-1 right-1 flex items-center space-x-1">
                                  {/* Gamut compliance badge */}
                                  {validation.gamutValidation && !palette.controls.enforceGamut && (
                                    <div>
                                      {validation.gamutValidation.withinGamut ? (
                                        <div 
                                          className="px-1 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
                                          title={`Compatible with ${palette.controls.gamutMode} displays`}
                                        >
                                          ✓ {palette.controls.gamutMode}
                                        </div>
                                      ) : (
                                        <div 
                                          className="px-1 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800"
                                          title={`Requires ${validation.gamutValidation.requiresGamut || 'wider'} gamut support`}
                                        >
                                          ⚠ {validation.gamutValidation.requiresGamut || 'Wide'}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Contrast analysis badge */}
                                  {contrastResult && contrastBadge && (
                                    <div 
                                      className={`px-1 py-0.5 rounded text-xs font-medium ${contrastBadge.color}`}
                                      title={`${contrastBadge.description} (${contrastResult?.ratio}:1)`}
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
                                      color: color.contrast > 3 ? '#ffffff' : '#000000'
                                    }}
                                  >
                                    {color.step}
                                  </div>
                                </div>
                                
                                {/* Color value and contrast at bottom */}
                                <div className="flex flex-col space-y-1">
                                  <div 
                                    className="text-xs font-mono leading-tight"
                                    style={{ 
                                      color: color.contrast > 3 ? '#ffffff' : '#000000'
                                    }}
                                    title={displayValue}
                                  >
                                    {displayValue}
                                  </div>
                                  
                                  {/* Contrast ratio display */}
                                  {contrastResult && (
                                    <div 
                                      className="text-xs"
                                      style={{ 
                                        color: color.contrast > 3 ? '#cccccc' : '#666666'
                                      }}
                                    >
                                      {contrastResult.ratio}:1
                                    </div>
                                  )}
                                </div>
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
          </div>
        </div>

        {/* Right Panel - Control Panel */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          <ControlPanel 
            controls={activePalette?.controls || defaultControls}
            onControlsChange={handleControlsChange}
            paletteName={activePalette?.name}
            paletteColor={activePalette ? generatePalette(activePalette.controls)[5]?.css : undefined}
            colors={activePaletteColors}
          />
        </div>
      </div>
    </div>
  )
}

export default App 