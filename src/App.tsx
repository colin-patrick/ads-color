import { useState, useMemo, useEffect } from 'react'
import { toast, Toaster } from 'sonner'
import { ControlPanel } from './components/ControlPanel'
import { AppSidebar } from './components/AppSidebar'
import { SidebarProvider } from './components/ui/sidebar'

import { useTheme } from './hooks/use-theme'
import { usePaletteOperations } from './hooks/usePaletteOperations'
import { usePaletteImport } from './hooks/usePaletteImport'
import { generatePalette, savePalettesToStorage, loadPalettesFromStorage, loadDefaultPalettes, generateColorOptions } from './lib/colorGeneration'
import { defaultControls } from './lib/presets'
import { PaletteControls, Palette, ColorFormat, GamutSettings, LightnessSettings } from './types'
import { PaletteToolbar } from './components/PaletteToolbar'
import { HeaderBar } from './components/HeaderBar'
import { PaletteDisplay } from './components/PaletteDisplay'
import { SettingsSheet } from './components/SettingsSheet'
import { ImportDialog } from './components/ImportDialog'

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
  
  // Use palette operations hook
  const paletteOperations = usePaletteOperations({
    palettes,
    setPalettes,
    activePaletteId,
    setActivePaletteId
  })

  // Use palette import hook  
  const paletteImport = usePaletteImport({
    palettes,
    setPalettes,
    activePaletteId,
    setActivePaletteId,
    gamutSettings,
    lightnessSettings
  })
  
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

  // Removed the competing effect that was overwriting lightness values







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



  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar
        palettes={palettes}
        activePaletteId={activePaletteId}
        onActivePaletteChange={setActivePaletteId}
        onAddPalette={paletteOperations.handleAddPalette}
        onDuplicatePalette={paletteOperations.handleDuplicatePalette}
        onDeletePalette={paletteOperations.handleDeletePalette}
        onStartRename={paletteOperations.handleStartRename}
        editingPaletteId={paletteOperations.editingPaletteId}
        editingPaletteName={paletteOperations.editingPaletteName}
        onSaveRename={paletteOperations.handleSaveRename}
        onCancelRename={paletteOperations.handleCancelRename}
        onEditingPaletteNameChange={paletteOperations.setEditingPaletteName}
        onExportPalettes={paletteImport.handleExportPalettes}
        onImportPalettes={paletteImport.handleImportPalettes}
        onImportExternal={paletteImport.handleImportExternal}
        gamutSettings={gamutSettings}
        lightnessSettings={lightnessSettings}
      />
      <main className="flex-1 h-screen flex flex-col min-w-0 bg-muted/50">
        {/* Fixed Header Bar */}
        <HeaderBar toggleTheme={toggleTheme} />

        {/* Main Content Area */}
        <div className="flex-1 flex min-h-0 min-w-0">
          {/* Middle - All Palettes Display */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Fixed Toolbar */}
          <PaletteToolbar
            contrastAnalysis={contrastAnalysis}
            setContrastAnalysis={setContrastAnalysis}
            gridMode={gridMode}
            setGridMode={setGridMode}
            luminanceMode={luminanceMode}
            setLuminanceMode={setLuminanceMode}
            colorFormat={colorFormat}
            setColorFormat={setColorFormat}
            showColorLabels={showColorLabels}
            setShowColorLabels={setShowColorLabels}
            colorOptions={colorOptions}
            setSettingsOpen={setSettingsOpen}
          />
          {/* Scrollable Palettes Display */}
          <PaletteDisplay
            palettes={palettes}
            gridMode={gridMode}
            luminanceMode={luminanceMode}
            colorFormat={colorFormat}
            contrastAnalysis={contrastAnalysis}
            showColorLabels={showColorLabels}
            gamutSettings={gamutSettings}
            lightnessSettings={lightnessSettings}
          />
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
        <SettingsSheet
          settingsOpen={settingsOpen}
          setSettingsOpen={setSettingsOpen}
          gamutSettings={gamutSettings}
          setGamutSettings={setGamutSettings}
          lightnessSettings={lightnessSettings}
          setLightnessSettings={setLightnessSettings}
          activePalette={activePalette}
          handleApplyContrastToAll={handleApplyContrastToAll}
          handleApplyContrastToActive={handleApplyContrastToActive}
        />
        
        <ImportDialog
          importConfirmOpen={paletteImport.importConfirmOpen}
          setImportConfirmOpen={paletteImport.setImportConfirmOpen}
          palettes={palettes}
          pendingImportData={paletteImport.pendingImportData}
          handleImportAdd={paletteImport.handleImportAdd}
          handleImportReplace={paletteImport.handleImportReplace}
          handleImportCancel={paletteImport.handleImportCancel}
        />
      </main>
    </SidebarProvider>
  )
}

export default App 