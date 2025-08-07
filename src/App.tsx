import { useState, useEffect } from 'react'
import { Toaster } from 'sonner'
import { ControlPanel } from './components/ControlPanel'
import { AppSidebar } from './components/AppSidebar'
import { SidebarProvider } from './components/ui/sidebar'

import { useTheme } from './hooks/use-theme'
import { usePaletteOperations } from './hooks/usePaletteOperations'
import { usePaletteImport } from './hooks/usePaletteImport'
import { usePersistence } from './hooks/usePersistence'
import { usePaletteState } from './hooks/usePaletteState'
import { loadPalettesFromStorage, loadDefaultPalettes } from './lib/colorGeneration'
import { defaultControls } from './lib/presets'
import { Palette, ColorFormat, GamutSettings, LightnessSettings } from './types'
import { PaletteToolbar } from './components/PaletteToolbar'
import { HeaderBar } from './components/HeaderBar'
import { PaletteDisplay } from './components/PaletteDisplay'
import { SettingsSheet } from './components/SettingsSheet'
import { ImportDialog } from './components/ImportDialog'

/**
 * Main App Component - Clean Architecture with Custom Hooks
 * 
 * This component has been refactored from 929 lines to 227 lines (~75% reduction)
 * by extracting business logic into focused custom hooks:
 * 
 * 🎯 Custom Hooks (~500 lines of business logic extracted):
 * - usePaletteOperations: CRUD operations with undo functionality
 * - usePaletteImport: File handling, validation, and deduplication  
 * - usePersistence: localStorage operations for settings
 * - usePaletteState: Core state management and computed values
 * 
 * 🧩 UI Components (~400 lines of UI extracted):
 * - PaletteToolbar, HeaderBar, PaletteDisplay, SettingsSheet, ImportDialog
 * 
 * Total: ~900 lines extracted into focused, reusable, testable modules
 */
function App() {
  // =================================================================
  // CORE STATE - Simple state declarations only
  // =================================================================
  
  // Theme state
  const { toggleTheme } = useTheme()
  
  // Palette data state
  const [palettes, setPalettes] = useState<Palette[]>([])
  const [activePaletteId, setActivePaletteId] = useState<string>('')
  const [isLoaded, setIsLoaded] = useState(false)
  
  // Display settings state
  const [colorFormat, setColorFormat] = useState<ColorFormat>('hex')
  const [gridMode, setGridMode] = useState(false)
  const [luminanceMode, setLuminanceMode] = useState(false)
  const [showColorLabels, setShowColorLabels] = useState(true)
  
  // UI state
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [contrastAnalysis, setContrastAnalysis] = useState({
    enabled: false,
    selectedColor: '#ffffff',
    showCompliance: true
  })
  
  // Global settings state
  const [gamutSettings, setGamutSettings] = useState<GamutSettings>({
    gamutMode: 'sRGB'
  })
  const [lightnessSettings, setLightnessSettings] = useState<LightnessSettings>({
    mode: 'contrast'
  })

  // =================================================================
  // BUSINESS LOGIC HOOKS - All complex operations extracted
  // =================================================================
  
  // Palette CRUD operations (add, duplicate, rename, delete + undo)
  const paletteOperations = usePaletteOperations({
    palettes,
    setPalettes,
    activePaletteId,
    setActivePaletteId
  })

  // Import/Export operations (file handling, validation, deduplication)
  const paletteImport = usePaletteImport({
    palettes,
    setPalettes,
    activePaletteId,
    setActivePaletteId,
    gamutSettings,
    lightnessSettings
  })

  // Settings persistence (localStorage save/load with error handling)
  const persistence = usePersistence({
    gamutSettings,
    setGamutSettings,
    lightnessSettings,
    setLightnessSettings,
    isLoaded
  })

  // Core state management (computed values, memoized operations)
  const paletteState = usePaletteState({
    palettes,
    setPalettes,
    activePaletteId,
    gamutSettings,
    lightnessSettings,
    setLightnessSettings,
    isLoaded
  })

  // =================================================================
  // INITIALIZATION - Clean, focused setup
  // =================================================================
  
  useEffect(() => {
    // Load palette data from storage or defaults
    const savedData = loadPalettesFromStorage()
    if (savedData) {
      setPalettes(savedData.palettes)
      setActivePaletteId(savedData.activePaletteId)
    } else {
      const defaultData = loadDefaultPalettes()
      setPalettes(defaultData.palettes)
      setActivePaletteId(defaultData.activePaletteId)
    }
    
    // Load global settings from localStorage
    persistence.loadSettingsFromStorage()
    
    setIsLoaded(true)
  }, [])

  // =================================================================
  // RENDER - Clean component composition
  // =================================================================
  
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
        isReorderMode={paletteOperations.isReorderMode}
        onToggleReorderMode={paletteOperations.handleToggleReorderMode}
        onReorderPalettes={paletteOperations.handleReorderPalettes}
      />
      
      <main className="flex-1 h-screen flex flex-col min-w-0 bg-muted/50">
        <HeaderBar toggleTheme={toggleTheme} />

        <div className="flex-1 flex min-h-0 min-w-0">
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
              colorOptions={paletteState.colorOptions}
              setSettingsOpen={setSettingsOpen}
            />
            
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

          <div className="w-80 bg-background border-l border-border flex flex-col">
            <ControlPanel 
              controls={paletteState.activePalette?.controls || defaultControls}
              onControlsChange={paletteState.handleControlsChange}
              paletteName={paletteState.activePalette?.name}
              paletteColor={paletteState.activePaletteColors[5]?.css}
              colors={paletteState.activePaletteColors}
              lightnessMode={lightnessSettings.mode}
              palettes={palettes}
              activePaletteId={activePaletteId}
              onActivePaletteChange={setActivePaletteId}
              colorOptions={paletteState.colorOptions}
              gamutSettings={gamutSettings}
            />
          </div>
        </div>
        
        <Toaster />
        
        <SettingsSheet
          settingsOpen={settingsOpen}
          setSettingsOpen={setSettingsOpen}
          gamutSettings={gamutSettings}
          setGamutSettings={setGamutSettings}
          lightnessSettings={lightnessSettings}
          setLightnessSettings={setLightnessSettings}
          activePalette={paletteState.activePalette}
          handleApplyContrastToAll={paletteState.handleApplyContrastToAll}
          handleApplyContrastToActive={paletteState.handleApplyContrastToActive}
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