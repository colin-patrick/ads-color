import { useState } from 'react'
import { toast } from 'sonner'
import { generatePalette, importPalettes, downloadPalettes, convertExternalPalettes } from '../lib/colorGeneration'
import { Palette, GamutSettings, LightnessSettings } from '../types'

interface UsePaletteImportProps {
  palettes: Palette[]
  setPalettes: React.Dispatch<React.SetStateAction<Palette[]>>
  activePaletteId: string
  setActivePaletteId: React.Dispatch<React.SetStateAction<string>>
  gamutSettings: GamutSettings
  lightnessSettings: LightnessSettings
}

export const usePaletteImport = ({
  palettes,
  setPalettes,
  activePaletteId,
  setActivePaletteId,
  gamutSettings,
  lightnessSettings
}: UsePaletteImportProps) => {
  // Import confirmation dialog state
  const [importConfirmOpen, setImportConfirmOpen] = useState(false)
  const [pendingImportData, setPendingImportData] = useState<{ palettes: Palette[], activePaletteId: string } | null>(null)

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

  return {
    // State
    importConfirmOpen,
    setImportConfirmOpen,
    pendingImportData,
    
    // Operations
    handleImportReplace,
    handleImportAdd,
    handleImportCancel,
    handleExportPalettes,
    handleImportPalettes,
    handleImportExternal
  }
} 