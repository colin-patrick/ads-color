import { useState, useMemo, useEffect } from 'react'
import { toast, Toaster } from 'sonner'
import { ControlPanel } from './components/ControlPanel'
import { GlobalContrastTargets } from './components/GlobalContrastTargets'
import { PrecisionDemo } from './components/PrecisionDemo'
import { AppSidebar } from './components/AppSidebar'
import { SidebarProvider, SidebarTrigger } from './components/ui/sidebar'
import { Button } from './components/ui/button'
import { Toggle } from './components/ui/toggle'
import { Label } from './components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './components/ui/sheet'
import { Dialog, DialogContent } from './components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { Separator } from './components/ui/separator'
import { Settings, Eye, EyeOff, Moon, Sun } from 'lucide-react'
import { useTheme } from './hooks/use-theme'
import { generatePalette, copyToClipboard, createNewPalette, getColorFormats, analyzeContrast, getContrastBadge, savePalettesToStorage, loadPalettesFromStorage, loadDefaultPalettes, importPalettes, downloadPalettes, getTextColorForBackground, convertPaletteToLuminance, generateColorOptions, convertExternalPalettes } from './lib/colorGeneration'
import { ColorCombobox } from './components/ui/color-combobox'
import { defaultControls } from './lib/presets'
import { PaletteControls, Palette, ColorFormat, GamutSettings, LightnessSettings } from './types'

function App() {
  // Theme state
  const { toggleTheme } = useTheme()
  
  // Initialize with empty arrays, will be set in useEffect
  const [palettes, setPalettes] = useState<Palette[]>([])
  const [activePaletteId, setActivePaletteId] = useState<string>('')
  const [isLoaded, setIsLoaded] = useState(false)
  const [colorFormat, setColorFormat] = useState<ColorFormat>('hex')
  
  // Global gamut settings
  const [gamutSettings, setGamutSettings] = useState<GamutSettings>({
    gamutMode: 'sRGB'
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
  
  // Import confirmation dialog state
  const [importConfirmOpen, setImportConfirmOpen] = useState(false)
  const [pendingImportData, setPendingImportData] = useState<{ palettes: Palette[], activePaletteId: string } | null>(null)

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

  // Removed the competing effect that was overwriting lightness values

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

  // Cancel rename palette
  const handleCancelRename = () => {
    setEditingPaletteId(null)
    setEditingPaletteName('')
  }

  // Delete palette
  const handleDeletePalette = (paletteId: string) => {
    if (palettes.length <= 1) return // Don't allow deleting the last palette
    
    // Get the palette to delete and store it for potential undo
    const paletteToDelete = palettes.find(p => p.id === paletteId)
    if (!paletteToDelete) return
    
    const paletteName = paletteToDelete.name
    const wasActivePalette = paletteId === activePaletteId
    let newActivePaletteId = activePaletteId
    
    // If we're deleting the active palette, determine the new active palette
    if (wasActivePalette) {
      const remainingPalettes = palettes.filter(p => p.id !== paletteId)
      if (remainingPalettes.length > 0) {
        newActivePaletteId = remainingPalettes[0].id
      }
    }
    
    // Remove the palette
    setPalettes(prev => prev.filter(p => p.id !== paletteId))
    
    // Update active palette if needed
    if (wasActivePalette) {
      setActivePaletteId(newActivePaletteId)
    }
    
    // Function to restore the deleted palette
    const handleUndo = () => {
      setPalettes(prev => [...prev, paletteToDelete])
      if (wasActivePalette) {
        setActivePaletteId(paletteToDelete.id)
      }
      toast.success(`Restored palette "${paletteName}"`)
    }
    
    // Show success toast with undo action
    toast.success(`Deleted palette "${paletteName}"`, {
      action: {
        label: 'Undo',
        onClick: handleUndo,
      },
    })
  }

  // Ensure unique palette IDs by regenerating duplicates
  const ensureUniquePaletteIds = (newPalettes: Palette[], existingPalettes: Palette[] = []): Palette[] => {
    const existingIds = new Set(existingPalettes.map(p => p.id));
    const processedIds = new Set<string>();
    
    return newPalettes.map(palette => {
      let uniqueId = palette.id;
      
      // Check if ID conflicts with existing palettes OR has been used in this batch
      while (existingIds.has(uniqueId) || processedIds.has(uniqueId)) {
        uniqueId = Math.random().toString(36).substr(2, 9);
      }
      
      processedIds.add(uniqueId);
      
      // Only create new palette object if ID changed
      if (uniqueId !== palette.id) {
        return {
          ...palette,
          id: uniqueId,
          name: `${palette.name} (Import)`, // Indicate it was imported with new ID
          updatedAt: new Date()
        };
      }
      
      return palette;
    });
  };

  // Handle import confirmation dialog actions
  const handleImportReplace = () => {
    if (pendingImportData) {
      // Only deduplicate within the imported set (no existing palettes to conflict with)
      const deduplicatedPalettes = ensureUniquePaletteIds(pendingImportData.palettes, []);
      
      setPalettes(deduplicatedPalettes)
      setActivePaletteId(pendingImportData.activePaletteId)
      
      const renamedCount = deduplicatedPalettes.filter((p, i) => p.id !== pendingImportData.palettes[i].id).length;
      const message = renamedCount > 0 
        ? `Successfully replaced all palettes! (${renamedCount} had internal duplicate IDs)`
        : `Successfully replaced all palettes with ${deduplicatedPalettes.length} imported palette(s)!`
      
      toast.success(message)
    }
    setImportConfirmOpen(false)
    setPendingImportData(null)
  }

  const handleImportAdd = () => {
    if (pendingImportData) {
      // Deduplicate against existing palettes
      const deduplicatedPalettes = ensureUniquePaletteIds(pendingImportData.palettes, palettes);
      
      setPalettes(prev => [...prev, ...deduplicatedPalettes])
      setActivePaletteId(pendingImportData.activePaletteId)
      
      const renamedCount = deduplicatedPalettes.filter((p, i) => p.id !== pendingImportData.palettes[i].id).length;
      const message = renamedCount > 0 
        ? `Successfully added ${deduplicatedPalettes.length} palette(s)! (${renamedCount} were given new IDs to avoid conflicts)`
        : `Successfully added ${deduplicatedPalettes.length} imported palette(s) to your existing ones!`
      
      toast.success(message)
    }
    setImportConfirmOpen(false)
    setPendingImportData(null)
  }

  const handleImportCancel = () => {
    setImportConfirmOpen(false)
    setPendingImportData(null)
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
          // Validate that imported palettes can generate colors properly
          const validPalettes = importedData.palettes.filter(palette => {
            try {
              const testColors = generatePalette(palette.controls, gamutSettings, lightnessSettings)
              return testColors.length > 0 && testColors.every(color => 
                color.css && color.css.match(/^#[0-9a-f]{6}$/i)
              )
            } catch (error) {
              console.warn(`Palette "${palette.name}" failed validation:`, error)
              return false
            }
          })
          
          if (validPalettes.length === 0) {
            toast.error('No valid palettes found in the imported file. Please check the file format.')
            return
          }
          
          // For native app exports, show dialog to ask user if they want to replace or add to existing palettes
          if (palettes.length === 0) {
            // If no existing palettes, just replace (but still check for internal duplicates)
            const deduplicatedPalettes = ensureUniquePaletteIds(validPalettes, []);
            setPalettes(deduplicatedPalettes)
            setActivePaletteId(importedData.activePaletteId || (deduplicatedPalettes.length > 0 ? deduplicatedPalettes[0].id : ''))
            
            const skippedCount = importedData.palettes.length - validPalettes.length
            const renamedCount = deduplicatedPalettes.filter((p, i) => p.id !== validPalettes[i].id).length;
            
            let message = `Successfully imported ${deduplicatedPalettes.length} palette(s)!`
            if (skippedCount > 0 && renamedCount > 0) {
              message = `Successfully imported ${deduplicatedPalettes.length} palette(s)! (${skippedCount} invalid palette(s) were skipped, ${renamedCount} had duplicate IDs)`
            } else if (skippedCount > 0) {
              message = `Successfully imported ${deduplicatedPalettes.length} palette(s)! (${skippedCount} invalid palette(s) were skipped)`
            } else if (renamedCount > 0) {
              message = `Successfully imported ${deduplicatedPalettes.length} palette(s)! (${renamedCount} had internal duplicate IDs)`
            }
            
            toast.success(message)
          } else {
            // Show confirmation dialog for user choice
            setPendingImportData({
              palettes: validPalettes,
              activePaletteId: importedData.activePaletteId || (validPalettes.length > 0 ? validPalettes[0].id : '')
            })
            setImportConfirmOpen(true)
          }
          
          // Clear the input
          event.target.value = ''
        } else {
          toast.error('Failed to import palettes. Please check the file format.')
        }
      } catch (error) {
        console.error('Import error:', error)
        toast.error('Failed to import palettes. Please check the file format.')
      }
    }
    reader.readAsText(file)
  }



  // Import external palettes from JSON file (for external tools like localhost:5185)
  const handleImportExternal = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const jsonData = e.target?.result as string
        const parsedData = JSON.parse(jsonData)
        const importedPalettes = convertExternalPalettes(parsedData)
        
        if (importedPalettes && importedPalettes.length > 0) {
          // Validate that imported palettes can generate colors properly
          const validPalettes = importedPalettes.filter(palette => {
            try {
              const testColors = generatePalette(palette.controls, gamutSettings, lightnessSettings)
              return testColors.length > 0 && testColors.every(color => 
                color.css && color.css.match(/^#[0-9a-f]{6}$/i)
              )
            } catch (error) {
              console.warn(`Palette "${palette.name}" failed validation:`, error)
              return false
            }
          })
          
          if (validPalettes.length === 0) {
            toast.error('No valid palettes found in the imported file. Please check the file format.')
            return
          }
          
          // Ensure unique IDs against existing palettes
          const deduplicatedPalettes = ensureUniquePaletteIds(validPalettes, palettes);
          
          // Add to existing palettes instead of replacing them
          setPalettes(prev => [...prev, ...deduplicatedPalettes])
          setActivePaletteId(deduplicatedPalettes[0].id)
          
          // Clear the input
          event.target.value = ''
          
          const skippedCount = importedPalettes.length - validPalettes.length
          const renamedCount = deduplicatedPalettes.filter((p, i) => p.id !== validPalettes[i].id).length;
          
          let message = `Successfully imported ${deduplicatedPalettes.length} palette(s) from external tool!`
          if (skippedCount > 0 && renamedCount > 0) {
            message = `Successfully imported ${deduplicatedPalettes.length} palette(s) from external tool! (${skippedCount} invalid palette(s) were skipped, ${renamedCount} were given new IDs to avoid conflicts)`
          } else if (skippedCount > 0) {
            message = `Successfully imported ${deduplicatedPalettes.length} palette(s) from external tool! (${skippedCount} invalid palette(s) were skipped)`
          } else if (renamedCount > 0) {
            message = `Successfully imported ${deduplicatedPalettes.length} palette(s) from external tool! (${renamedCount} were given new IDs to avoid conflicts)`
          }
          
          toast.success(message)
        } else {
          toast.error('Failed to import palettes. Please check the file format.')
        }
      } catch (error) {
        console.error('External import error:', error)
        toast.error('Failed to import palettes. Please check the file format.')
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
        onImportExternal={handleImportExternal}
        gamutSettings={gamutSettings}
        lightnessSettings={lightnessSettings}
      />
      <main className="flex-1 h-screen flex flex-col min-w-0 bg-muted/50">
        {/* Fixed Header Bar */}
        <div className="bg-background border-b border-border px-4 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
                <SidebarTrigger className="h-9 w-9" />
              <h1 className="text-xl font-bold text-foreground">ADS Color Generator</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="w-9 h-9 p-0"
                title="Toggle theme"
                aria-label="Toggle theme"
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex min-h-0 min-w-0">
          {/* Middle - All Palettes Display */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Fixed Toolbar */}
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
                <div className="w-80 bg-background border-l border-border flex flex-col">
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
            
            <Tabs defaultValue="gamut" className="w-full">
                             <TabsList className="grid w-full grid-cols-4">
                 <TabsTrigger value="gamut">Gamut</TabsTrigger>
                 <TabsTrigger value="lightness">Lightness</TabsTrigger>
                 <TabsTrigger value="contrast">Contrast</TabsTrigger>
                 <TabsTrigger value="precision">Precision</TabsTrigger>
               </TabsList>
              <TabsContent value="gamut">
                <div className="space-y-6 mt-6">
                  {/* Gamut Settings Section */}
                  <div className="space-y-4">
                    <div className="border-b border-border pb-2">
                      <h3 className="text-sm font-medium text-foreground">Gamut Settings</h3>
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
                        <p className="text-xs text-muted-foreground">
                          {gamutSettings.gamutMode === 'sRGB' && 'Compatible with all devices and browsers'}
                          {gamutSettings.gamutMode === 'P3' && 'Modern displays and Apple devices'}
                          {gamutSettings.gamutMode === 'Rec2020' && 'HDR displays and future displays'}
                        </p>
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        Colors are automatically clamped to fit within the selected gamut
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="lightness">
                <div className="space-y-6 mt-6">
                  {/* Lightness Mode Settings Section */}
                  <div className="space-y-4">
                    <div className="border-b border-border pb-2">
                      <h3 className="text-sm font-medium text-foreground">Lightness Mode</h3>
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
                        <p className="text-xs text-muted-foreground">
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
                      <div className="border-b border-border pb-2">
                        <h3 className="text-sm font-medium text-foreground">Contrast Targets</h3>
                      </div>
                      <GlobalContrastTargets
                        onApplyToAll={handleApplyContrastToAll}
                        onApplyToActive={handleApplyContrastToActive}
                        defaultTargets={activePalette?.controls.contrastTargets}
                      />
                    </div>
                  )}
                                 </div>
               </TabsContent>
               <TabsContent value="contrast">
                 <div className="space-y-6 mt-6">
                   {/* Contrast Targets Section */}
                   {lightnessSettings.mode === 'contrast' && (
                     <div className="space-y-4">
                       <div className="border-b border-border pb-2">
                         <h3 className="text-sm font-medium text-foreground">Contrast Targets</h3>
                       </div>
                       <GlobalContrastTargets
                         onApplyToAll={handleApplyContrastToAll}
                         onApplyToActive={handleApplyContrastToActive}
                         defaultTargets={activePalette?.controls.contrastTargets}
                       />
                     </div>
                   )}
                   {lightnessSettings.mode !== 'contrast' && (
                     <p className="text-sm text-muted-foreground">
                       Switch to Contrast-based mode in the Lightness tab to configure contrast targets.
                     </p>
                   )}
                 </div>
               </TabsContent>
               <TabsContent value="precision">
                 <div className="space-y-6 mt-6">
                   <PrecisionDemo />
                 </div>
               </TabsContent>
            </Tabs>
          </SheetContent>
        </Sheet>
        
        {/* Import Confirmation Dialog */}
        <Dialog open={importConfirmOpen} onOpenChange={setImportConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <div className="flex items-center space-x-2">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Import Palettes</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  You currently have {palettes.length} palette(s). How would you like to import the {pendingImportData?.palettes.length} new palette(s)?
                </p>
              </div>
            </div>
            
            <div className="flex flex-col space-y-3 mt-6">
              <Button onClick={handleImportAdd} variant="default" className="justify-start">
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add to existing palettes
                <span className="ml-auto text-xs text-muted-foreground">
                  Keep all {palettes.length} + add {pendingImportData?.palettes.length}
                </span>
              </Button>
              
              <Button onClick={handleImportReplace} variant="outline" className="justify-start">
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Replace all palettes
                <span className="ml-auto text-xs text-muted-foreground">
                  Delete {palettes.length}, keep {pendingImportData?.palettes.length}
                </span>
              </Button>
              
              <Button onClick={handleImportCancel} variant="ghost" className="justify-center">
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </SidebarProvider>
  )
}

export default App 