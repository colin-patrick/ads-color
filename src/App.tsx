import { useState, useMemo, useEffect } from 'react'
import { toast, Toaster } from 'sonner'
import { ControlPanel } from './components/ControlPanel'
import { GlobalContrastTargets } from './components/GlobalContrastTargets'
import { AppSidebar } from './components/AppSidebar'
import { SidebarProvider, SidebarTrigger } from './components/ui/sidebar'
import { Button } from './components/ui/button'
import { Toggle } from './components/ui/toggle'
import { Label } from './components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './components/ui/sheet'
import { Separator } from './components/ui/separator'
import { Settings, Eye, EyeOff } from 'lucide-react'
import { generatePalette, copyToClipboard, createNewPalette, getColorFormats, analyzeContrast, getContrastBadge, savePalettesToStorage, loadPalettesFromStorage, loadDefaultPalettes, validateColor, importPalettes, downloadPalettes, getTextColorForBackground, convertPaletteToLuminance, generateColorOptions } from './lib/colorGeneration'
import { ColorCombobox } from './components/ui/color-combobox'
import { defaultControls } from './lib/presets'
import { PaletteControls, Palette, ColorFormat, GamutSettings, LightnessSettings } from './types'

function App() {
  // Initialize with empty arrays, will be set in useEffect
  const [palettes, setPalettes] = useState<Palette[]>([])
  const [activePaletteId, setActivePaletteId] = useState<string>('')
  const [isLoaded, setIsLoaded] = useState(false)
  const [colorFormat, setColorFormat] = useState<ColorFormat>('hex')
  
  // Global gamut settings
  const [gamutSettings, setGamutSettings] = useState<GamutSettings>({
    gamutMode: 'sRGB',
    enforceGamut: true
  })
  
  // Global lightness settings
  const [lightnessSettings, setLightnessSettings] = useState<LightnessSettings>({
    mode: 'contrast'
  })
  
  // Rename palette state
  const [editingPaletteId, setEditingPaletteId] = useState<string | null>(null)
  const [editingPaletteName, setEditingPaletteName] = useState<string>('')
  
  // Contrast analysis state
  const [contrastAnalysis, setContrastAnalysis] = useState({
    enabled: false,
    selectedColor: '#ffffff',
    showCompliance: true
  })
  
  // Grid mode state
  const [gridMode, setGridMode] = useState(false)
  
  // Luminance mode state
  const [luminanceMode, setLuminanceMode] = useState(false)
  
  // Settings sheet state
  const [settingsOpen, setSettingsOpen] = useState(false)
  
  // Color value labels visibility state
  const [showColorLabels, setShowColorLabels] = useState(true)

  // Load palettes from storage on app start
  useEffect(() => {
    const savedData = loadPalettesFromStorage()
    if (savedData) {
      setPalettes(savedData.palettes)
      setActivePaletteId(savedData.activePaletteId)
    } else {
      // If no saved data, load the default palettes
      const defaultData = loadDefaultPalettes()
      setPalettes(defaultData.palettes)
      setActivePaletteId(defaultData.activePaletteId)
    }
    
    // Load global settings from localStorage
    const savedGamutSettings = localStorage.getItem('ads-color-generator-gamut-settings')
    if (savedGamutSettings) {
      try {
        const parsedGamutSettings = JSON.parse(savedGamutSettings)
        setGamutSettings(parsedGamutSettings)
      } catch (error) {
        console.error('Failed to parse gamut settings:', error)
      }
    }
    
    const savedLightnessSettings = localStorage.getItem('ads-color-generator-lightness-settings')
    if (savedLightnessSettings) {
      try {
        const parsedLightnessSettings = JSON.parse(savedLightnessSettings)
        setLightnessSettings(parsedLightnessSettings)
      } catch (error) {
        console.error('Failed to parse lightness settings:', error)
      }
    }
    
    setIsLoaded(true)
  }, [])

  // Auto-save palettes to storage when they change
  useEffect(() => {
    if (isLoaded) {
      savePalettesToStorage(palettes, activePaletteId)
      // Save global settings to localStorage
      localStorage.setItem('ads-color-generator-gamut-settings', JSON.stringify(gamutSettings))
      localStorage.setItem('ads-color-generator-lightness-settings', JSON.stringify(lightnessSettings))
    }
  }, [palettes, activePaletteId, isLoaded, gamutSettings, lightnessSettings])

  // Get active palette
  const activePalette = useMemo(() => 
    palettes.find(p => p.id === activePaletteId) || palettes[0], 
    [palettes, activePaletteId]
  )

  // Generate colors for active palette
  const activePaletteColors = useMemo(() => 
    activePalette ? generatePalette(activePalette.controls, gamutSettings, lightnessSettings) : [],
    [activePalette, gamutSettings, lightnessSettings]
  )

  // Generate color options for contrast analysis combobox
  const colorOptions = useMemo(() => 
    generateColorOptions(palettes, gamutSettings, lightnessSettings),
    [palettes, gamutSettings, lightnessSettings]
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

  // Delete palette with undo functionality
  const handleDeletePalette = (paletteId: string) => {
    const paletteToDelete = palettes.find(p => p.id === paletteId)
    if (!paletteToDelete) return

    // Store the deleted palette's position for restoration
    const paletteIndex = palettes.findIndex(p => p.id === paletteId)
    let wasActivePalette = false

    // Remove palette from state
    setPalettes(prev => {
      const updated = prev.filter(p => p.id !== paletteId)
      
      // Handle active palette change if needed
      if (paletteId === activePaletteId && updated.length > 0) {
        wasActivePalette = true
        setActivePaletteId(updated[0].id)
      }
      
      return updated
    })

    // Show toast with undo functionality
    toast(`Deleted ${paletteToDelete.name}`, {
      action: {
        label: 'Undo',
        onClick: () => {
          // Restore the deleted palette
          setPalettes(prev => {
            const restored = [...prev]
            restored.splice(paletteIndex, 0, paletteToDelete)
            return restored
          })
          
          // Restore active palette if it was the deleted one
          if (wasActivePalette) {
            setActivePaletteId(paletteToDelete.id)
          }
        },
      }
    })
  }

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

  // Apply global contrast targets to all palettes
  const handleApplyContrastToAll = (contrastTargets: PaletteControls['contrastTargets']) => {
    setPalettes(prev => prev.map(palette => ({
      ...palette,
      controls: {
        ...palette.controls,
        contrastTargets
      },
      updatedAt: new Date()
    })))
    // Switch to contrast mode when applying targets
    setLightnessSettings({ mode: 'contrast' })
  }

  // Apply global contrast targets to active palette only
  const handleApplyContrastToActive = (contrastTargets: PaletteControls['contrastTargets']) => {
    setPalettes(prev => prev.map(palette => 
      palette.id === activePaletteId
        ? {
            ...palette,
            controls: {
              ...palette.controls,
              contrastTargets
            },
            updatedAt: new Date()
          }
        : palette
    ))
    // Switch to contrast mode when applying targets
    setLightnessSettings({ mode: 'contrast' })
  }

  // Export palettes to JSON file
  const handleExportPalettes = () => {
    downloadPalettes(palettes, activePaletteId, 'color-palettes.json')
  }

  // Import palettes from JSON file
  const handleImportPalettes = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const jsonData = e.target?.result as string
        const importedData = importPalettes(jsonData)
        
        if (importedData) {
          // Replace current palettes with imported ones
          setPalettes(importedData.palettes)
          setActivePaletteId(importedData.activePaletteId)
          
          // Clear the input
          event.target.value = ''
          
          alert(`Successfully imported ${importedData.palettes.length} palette(s)!`)
        } else {
          alert('Failed to import palettes. Please check the file format.')
        }
      } catch (error) {
        console.error('Import error:', error)
        alert('Failed to import palettes. Please check the file format.')
      }
    }
    reader.readAsText(file)
  }


  // Format options for color display
  const formatOptions: Array<{ value: ColorFormat, label: string }> = [
    { value: 'hex', label: 'HEX' },
    { value: 'rgb', label: 'RGB' },
    { value: 'hsl', label: 'HSL' },
    { value: 'oklch', label: 'OKLCH' }
  ]

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar
        palettes={palettes}
        activePaletteId={activePaletteId}
        onActivePaletteChange={setActivePaletteId}
        onAddPalette={handleAddPalette}
        onDuplicatePalette={handleDuplicatePalette}
        onDeletePalette={handleDeletePalette}
        onStartRename={handleStartRename}
        editingPaletteId={editingPaletteId}
        editingPaletteName={editingPaletteName}
        onSaveRename={handleSaveRename}
        onCancelRename={handleCancelRename}
        onEditingPaletteNameChange={setEditingPaletteName}
        onExportPalettes={handleExportPalettes}
        onImportPalettes={handleImportPalettes}
        gamutSettings={gamutSettings}
        lightnessSettings={lightnessSettings}
      />
      <main className="flex-1 h-screen flex flex-col min-w-0 bg-gray-50">
        {/* Fixed Header Bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
                <SidebarTrigger className="h-9 w-9" />
              <h1 className="text-xl font-bold text-gray-900">ADS Color Generator</h1>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex min-h-0 min-w-0">
          {/* Middle - All Palettes Display */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Fixed Toolbar */}
          <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
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
          
          {/* Scrollable Palettes Display */}
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
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">{palette.name}</h3>
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
                            
                            // Validate color and get warnings (use original color for validation)
                            const validation = validateColor(originalColor, palette.controls, gamutSettings, lightnessSettings)
                            
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
                                  {/* Gamut compliance badge */}
                                  {validation.gamutValidation && !gamutSettings.enforceGamut && (
                                    <div>
                                      {validation.gamutValidation.withinGamut ? (
                                        <div 
                                          className="px-1 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
                                          title={`Compatible with ${gamutSettings.gamutMode} displays`}
                                        >
                                          ✓ {gamutSettings.gamutMode}
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
                                    {color.step}
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
                        <h3 className="text-lg font-semibold text-gray-900">{palette.name}</h3>
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
                            
                            // Validate color and get warnings (use original color for validation)
                            const validation = validateColor(originalColor, palette.controls, gamutSettings, lightnessSettings)
                            
                            return (
                              <div key={color.step} className="flex-shrink-0">
                                <div 
                                  className="w-64 h-24 rounded-lg border border-gray-200 cursor-pointer relative flex flex-col justify-between p-2"
                                  style={{ backgroundColor: color.css }}
                                  onClick={() => handleCopyColor(originalColor)}
                                  title={`Click to copy: ${displayValue}`}
                                >
                                  {/* Top-right badges container */}
                                  <div className="absolute top-1 right-1 flex items-center space-x-1">
                                    {/* Gamut compliance badge */}
                                    {validation.gamutValidation && !gamutSettings.enforceGamut && (
                                      <div>
                                        {validation.gamutValidation.withinGamut ? (
                                          <div 
                                            className="px-1 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
                                            title={`Compatible with ${gamutSettings.gamutMode} displays`}
                                          >
                                            ✓ {gamutSettings.gamutMode}
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
                                      {color.step}
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
        </div>

        {/* Right Panel - Control Panel */}
                <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          <ControlPanel 
            controls={activePalette?.controls || defaultControls}
            onControlsChange={handleControlsChange}
            paletteName={activePalette?.name}
            paletteColor={activePalette ? generatePalette(activePalette.controls, gamutSettings, lightnessSettings)[5]?.css : undefined}
            colors={activePaletteColors}
            lightnessMode={lightnessSettings.mode}
            palettes={palettes}
            activePaletteId={activePaletteId}
            onActivePaletteChange={setActivePaletteId}
            colorOptions={colorOptions}
            gamutSettings={gamutSettings}
          />
        </div>
        </div>
        
        <Toaster />
        
        {/* Settings Sheet */}
        <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
          <SheetContent side="right" className="w-[400px] sm:max-w-[400px]">
            <SheetHeader>
              <SheetTitle>Settings</SheetTitle>
              <SheetDescription>
                Configure global settings for gamut, lightness mode, and contrast targets.
              </SheetDescription>
            </SheetHeader>
            
            <div className="space-y-6 mt-6">
              {/* Gamut Settings Section */}
              <div className="space-y-4">
                <div className="border-b border-gray-200 pb-2">
                  <h3 className="text-sm font-medium text-gray-900">Gamut Settings</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Color Gamut</Label>
                    <Select value={gamutSettings.gamutMode} onValueChange={(value) => setGamutSettings(prev => ({ ...prev, gamutMode: value as 'sRGB' | 'P3' | 'Rec2020' }))}>
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
                      {gamutSettings.gamutMode === 'sRGB' && 'Compatible with all devices and browsers'}
                      {gamutSettings.gamutMode === 'P3' && 'Modern displays and Apple devices'}
                      {gamutSettings.gamutMode === 'Rec2020' && 'HDR displays and future displays'}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Enforce Gamut</Label>
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={gamutSettings.enforceGamut}
                        onChange={(e) => setGamutSettings(prev => ({ ...prev, enforceGamut: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Clamp colors</span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">
                    {gamutSettings.enforceGamut 
                      ? 'Colors will be automatically clamped to fit within the target gamut' 
                      : 'Colors may extend beyond the target gamut (warnings will be shown)'}
                  </p>
                </div>
              </div>

              {/* Lightness Mode Settings Section */}
              <div className="space-y-4">
                <div className="border-b border-gray-200 pb-2">
                  <h3 className="text-sm font-medium text-gray-900">Lightness Mode</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Lightness Calculation Mode</Label>
                    <Select value={lightnessSettings.mode} onValueChange={(value) => setLightnessSettings({ mode: value as 'contrast' | 'range' })}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contrast">Contrast-based</SelectItem>
                        <SelectItem value="range">Range-based</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      {lightnessSettings.mode === 'contrast' 
                        ? 'Calculate lightness based on contrast targets against background colors'
                        : 'Use manual lightness ranges (min/max) for all palettes'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contrast Targets Section - Only show in contrast mode */}
              {lightnessSettings.mode === 'contrast' && (
                <div className="space-y-4">
                  <div className="border-b border-gray-200 pb-2">
                    <h3 className="text-sm font-medium text-gray-900">Contrast Targets</h3>
                  </div>
                  <GlobalContrastTargets
                    onApplyToAll={handleApplyContrastToAll}
                    onApplyToActive={handleApplyContrastToActive}
                    defaultTargets={activePalette?.controls.contrastTargets}
                  />
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </main>
    </SidebarProvider>
  )
}

export default App 