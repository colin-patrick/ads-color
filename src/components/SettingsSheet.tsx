import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { GlobalContrastTargets } from './GlobalContrastTargets'
import { PrecisionDemo } from './PrecisionDemo'
import { Palette, GamutSettings, LightnessSettings, PaletteControls } from '../types'

interface SettingsSheetProps {
  settingsOpen: boolean
  setSettingsOpen: (value: boolean) => void
  gamutSettings: GamutSettings
  setGamutSettings: React.Dispatch<React.SetStateAction<GamutSettings>>
  lightnessSettings: LightnessSettings
  setLightnessSettings: React.Dispatch<React.SetStateAction<LightnessSettings>>
  activePalette: Palette | undefined
  handleApplyContrastToAll: (contrastTargets: PaletteControls['contrastTargets']) => void
  handleApplyContrastToActive: (contrastTargets: PaletteControls['contrastTargets']) => void
}

export function SettingsSheet({
  settingsOpen,
  setSettingsOpen,
  gamutSettings,
  setGamutSettings,
  lightnessSettings,
  setLightnessSettings,
  activePalette,
  handleApplyContrastToAll,
  handleApplyContrastToActive
}: SettingsSheetProps) {
  return (
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
  )
} 