import { useMemo, useEffect } from 'react'
import { generatePalette, generateColorOptions, savePalettesToStorage } from '../lib/colorGeneration'
import { Palette, PaletteControls, GamutSettings, LightnessSettings } from '../types'

interface UsePaletteStateProps {
  palettes: Palette[]
  setPalettes: React.Dispatch<React.SetStateAction<Palette[]>>
  activePaletteId: string
  gamutSettings: GamutSettings
  lightnessSettings: LightnessSettings
  setLightnessSettings: React.Dispatch<React.SetStateAction<LightnessSettings>>
  isLoaded: boolean
}

export const usePaletteState = ({
  palettes,
  setPalettes,
  activePaletteId,
  gamutSettings,
  lightnessSettings,
  setLightnessSettings,
  isLoaded
}: UsePaletteStateProps) => {

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

  return {
    // Computed values
    activePalette,
    activePaletteColors,
    colorOptions,
    
    // State update functions
    handleControlsChange,
    handleApplyContrastToAll,
    handleApplyContrastToActive
  }
} 