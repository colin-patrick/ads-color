import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Palette, GamutSettings, LightnessSettings } from '../types'
import { generatePalette } from '../lib/colorGeneration'
import { Copy, Check } from 'lucide-react'

interface TokenStudioExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  palettes: Palette[]
  gamutSettings: GamutSettings
  lightnessSettings: LightnessSettings
}

export function TokenStudioExportDialog({
  open,
  onOpenChange,
  palettes,
  gamutSettings,
  lightnessSettings
}: TokenStudioExportDialogProps) {
  const [copied, setCopied] = useState(false)

  // Transform palettes to Token Studio format
  const generateTokenStudioJson = () => {
    const tokenStudioData: Record<string, Record<string, { value: string; type: string }>> = {}

    palettes.forEach(palette => {
      const colors = generatePalette(palette.controls, gamutSettings, lightnessSettings)
      const paletteTokens: Record<string, { value: string; type: string }> = {}
      
      // Add the generated colors using their dynamic token names
      colors.forEach((color) => {
        paletteTokens[color.tokenName] = {
          value: color.css,
          type: "color"
        }
      })
      
      // Add pure black and white
      paletteTokens["0"] = {
        value: "#000000",
        type: "color"
      }
      paletteTokens["100"] = {
        value: "#ffffff",
        type: "color"
      }
      
      // Sort the tokens by numeric key order (0, 10, 15, 20, ... 95, 100)
      const sortedTokens: Record<string, { value: string; type: string }> = {}
      const sortedKeys = Object.keys(paletteTokens).sort((a, b) => parseInt(a) - parseInt(b))
      
      sortedKeys.forEach(key => {
        sortedTokens[key] = paletteTokens[key]
      })
      
      tokenStudioData[palette.name] = sortedTokens
    })

    return JSON.stringify(tokenStudioData, null, 2)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateTokenStudioJson())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Export as Token Studio JSON</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col space-y-4 min-h-0">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Copy this JSON to import into Token Studio for Figma
            </p>
            <Button onClick={handleCopy} size="sm" className="flex items-center gap-2">
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy to Clipboard
                </>
              )}
            </Button>
          </div>
          
          <div className="flex-1 min-h-0">
            <textarea
              readOnly
              value={generateTokenStudioJson()}
              className="w-full h-full min-h-[400px] p-3 text-sm font-mono bg-muted rounded-md border resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              spellCheck="false"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 