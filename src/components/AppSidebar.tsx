import { useMemo, useEffect, useRef, useState } from 'react'
import { Plus, Copy, X, FileUp, FileDown, MoreHorizontal, Trash2, Edit, Check, FileCode } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { generatePalette } from '../lib/colorGeneration'
import { Palette, GamutSettings, LightnessSettings } from '../types'
import { TokenStudioExportDialog } from './TokenStudioExportDialog'

interface AppSidebarProps {
  palettes: Palette[]
  activePaletteId: string
  onActivePaletteChange: (paletteId: string) => void
  onAddPalette: () => void
  onDuplicatePalette: (paletteId: string) => void
  onDeletePalette: (paletteId: string) => void
  onStartRename: (paletteId: string, currentName: string) => void
  editingPaletteId: string | null
  editingPaletteName: string
  onSaveRename: () => void
  onCancelRename: () => void
  onEditingPaletteNameChange: (name: string) => void
  onExportPalettes: () => void
  onImportPalettes: (event: React.ChangeEvent<HTMLInputElement>) => void
  onImportExternal: (event: React.ChangeEvent<HTMLInputElement>) => void
  gamutSettings: GamutSettings
  lightnessSettings: LightnessSettings
}

export function AppSidebar({
  palettes,
  activePaletteId,
  onActivePaletteChange,
  onAddPalette,
  onDuplicatePalette,
  onDeletePalette,
  onStartRename,
  editingPaletteId,
  editingPaletteName,
  onSaveRename,
  onCancelRename,
  onEditingPaletteNameChange,
  onExportPalettes,
  onImportPalettes,
  onImportExternal,
  gamutSettings,
  lightnessSettings,
}: AppSidebarProps) {
  // State for Token Studio export dialog
  const [tokenStudioDialogOpen, setTokenStudioDialogOpen] = useState(false)
  // Generate color swatches for palettes
  const paletteColors = useMemo(() => {
    const colors: Record<string, string> = {}
    for (const palette of palettes) {
      const generatedPalette = generatePalette(palette.controls, gamutSettings, lightnessSettings)
      colors[palette.id] = generatedPalette[5]?.css || '#3b82f6' // Use step 6 as representative color
    }
    return colors
  }, [palettes, gamutSettings, lightnessSettings])

  // Ref for the rename input to handle focus
  const renameInputRef = useRef<HTMLInputElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  // Focus the input when editing starts
  useEffect(() => {
    if (editingPaletteId) {
      // Single focus attempt with optimal timing
      const timer = setTimeout(() => {
        if (renameInputRef.current) {
          renameInputRef.current.focus()
          // Position cursor at the end of the text for natural editing
          const length = renameInputRef.current.value.length
          renameInputRef.current.setSelectionRange(length, length)
        }
      }, 200) // Sweet spot - dropdown closed, DOM stable, not too slow

      return () => clearTimeout(timer)
    }
  }, [editingPaletteId])

  // Handle F2 key for rename shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        const activeElement = document.activeElement as HTMLElement
        const paletteButton = activeElement?.closest('[data-palette-id]') as HTMLElement
        if (paletteButton) {
          e.preventDefault()
          const paletteId = paletteButton.getAttribute('data-palette-id')
          const paletteName = palettes.find(p => p.id === paletteId)?.name
          if (paletteId && paletteName) {
            onStartRename(paletteId, paletteName)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [palettes, onStartRename])

  // Enhanced save function with focus return
  const handleEnhancedSave = () => {
    onSaveRename()
    // Return focus to the menu button after a brief delay
    setTimeout(() => {
      if (menuButtonRef.current) {
        menuButtonRef.current.focus()
      }
    }, 100)
  }

  // Enhanced cancel function with focus return  
  const handleEnhancedCancel = () => {
    onCancelRename()
    setTimeout(() => {
      if (menuButtonRef.current) {
        menuButtonRef.current.focus()
      }
    }, 100)
  }

  // Simplified click-outside detection - only attach after focus is established
  useEffect(() => {
    if (!editingPaletteId) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      
      // Don't close if clicking on the input itself or its buttons
      if (target.closest('[role="form"]')) return
      
      // Don't close if clicking on dropdown menu items
      if (target.closest('[role="menu"], [role="menuitem"], [data-radix-popper-content-wrapper]')) return
      
      // Save when clicking outside
      handleEnhancedSave()
    }

    // Only start listening after focus has been established
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 300)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [editingPaletteId, handleEnhancedSave])

  return (
          <Sidebar collapsible="offcanvas" className="bg-background border-r border-border">
      {/* Live region for screen reader announcements */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
        aria-label="Palette status updates"
      >
        {editingPaletteId && `Editing ${editingPaletteName || 'palette name'}`}
      </div>
      
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M9 3v18"/>
                    <path d="M15 3v18"/>
                    <path d="M3 9h18"/>
                    <path d="M3 15h18"/>
                  </svg>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Palettes</span>
                  <span className="truncate text-xs">Color System</span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
        
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Your Palettes</SidebarGroupLabel>
          <SidebarGroupContent>
                          <SidebarMenu>
                {palettes.map((palette) => (
                  <SidebarMenuItem key={palette.id}>
                    <SidebarMenuButton
                      onClick={() => onActivePaletteChange(palette.id)}
                      isActive={palette.id === activePaletteId}
                      className="w-full"
                      data-palette-id={palette.id}
                      aria-label={`Switch to ${palette.name} palette`}
                    >
                      <div
                        className="w-4 h-4 rounded-full border border-sidebar-border flex-shrink-0"
                        style={{ backgroundColor: paletteColors[palette.id] }}
                        aria-hidden="true"
                      />
                      {editingPaletteId === palette.id ? (
                        <div className="flex-1 flex items-center gap-2" role="form" aria-label="Rename palette">
                          <Input
                            ref={renameInputRef}
                            value={editingPaletteName}
                            onChange={(e) => onEditingPaletteNameChange(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleEnhancedSave()
                              }
                              if (e.key === 'Escape') {
                                e.preventDefault()
                                handleEnhancedCancel()
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-auto p-0 border-none shadow-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sidebar-foreground caret-current flex-1"
                            aria-label={`Rename ${palette.name} palette`}
                            placeholder="Enter palette name"
                          />
                          <button
                            onClick={handleEnhancedSave}
                            className="h-4 w-4 flex items-center justify-center text-green-600 hover:text-green-700 opacity-70 hover:opacity-100"
                            title="Save (Enter)"
                            aria-label="Save rename"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            onClick={handleEnhancedCancel}
                            className="h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100"
                            title="Cancel (Escape)"
                            aria-label="Cancel rename"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="flex-1 text-left truncate" id={`palette-name-${palette.id}`}>
                          {palette.name}
                        </span>
                      )}
                    </SidebarMenuButton>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuAction 
                          ref={editingPaletteId === palette.id ? undefined : menuButtonRef}
                          aria-label={`More actions for ${palette.name}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">More options</span>
                        </SidebarMenuAction>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="right" align="start">
                        <DropdownMenuItem onClick={() => onStartRename(palette.id, palette.name)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Rename
                          <span className="ml-auto text-xs text-muted-foreground">F2</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDuplicatePalette(palette.id)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        {palettes.length > 1 && (
                          <DropdownMenuItem 
                            onClick={() => onDeletePalette(palette.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={onAddPalette} className="border-dashed border-2 justify-center">
                <Plus className="h-4 w-4" />
                <span>Add Palette</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
        
              <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={onExportPalettes}>
                <FileDown className="h-4 w-4" />
                <span>Export Palettes</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => document.getElementById('import-file')?.click()}>
                <FileUp className="h-4 w-4" />
                <span>Import Palettes</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => document.getElementById('import-external-file')?.click()}>
                <FileUp className="h-4 w-4" />
                <span>Import External</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setTokenStudioDialogOpen(true)}>
                <FileCode className="h-4 w-4" />
                <span>Export Token Studio</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          
          <input
            id="import-file"
            type="file"
            accept=".json"
            onChange={onImportPalettes}
            className="hidden"
          />
          <input
            id="import-external-file"
            type="file"
            accept=".json"
            onChange={onImportExternal}
            className="hidden"
          />
        </SidebarFooter>
        
        <TokenStudioExportDialog
          open={tokenStudioDialogOpen}
          onOpenChange={setTokenStudioDialogOpen}
          palettes={palettes}
          gamutSettings={gamutSettings}
          lightnessSettings={lightnessSettings}
        />
    </Sidebar>
  )
} 