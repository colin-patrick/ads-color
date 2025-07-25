import { useState } from 'react'
import { toast } from 'sonner'
import { createNewPalette } from '../lib/colorGeneration'
import { defaultControls } from '../lib/presets'
import { Palette } from '../types'

interface UsePaletteOperationsProps {
  palettes: Palette[]
  setPalettes: React.Dispatch<React.SetStateAction<Palette[]>>
  activePaletteId: string
  setActivePaletteId: React.Dispatch<React.SetStateAction<string>>
}

export const usePaletteOperations = ({
  palettes,
  setPalettes,
  activePaletteId,
  setActivePaletteId
}: UsePaletteOperationsProps) => {
  // Rename palette state
  const [editingPaletteId, setEditingPaletteId] = useState<string | null>(null)
  const [editingPaletteName, setEditingPaletteName] = useState<string>('')

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

  return {
    // State
    editingPaletteId,
    editingPaletteName,
    setEditingPaletteName,
    
    // Operations
    handleAddPalette,
    handleDuplicatePalette,
    handleStartRename,
    handleSaveRename,
    handleCancelRename,
    handleDeletePalette
  }
} 