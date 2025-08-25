import { useState, useEffect } from 'react'
import { PaletteControls } from '../types'
import { Button } from './ui/button'
import { Input } from './ui/input'

interface GlobalContrastTargetsProps {
  onApplyToAll: (contrastTargets: PaletteControls['contrastTargets']) => void
  onApplyToActive: (contrastTargets: PaletteControls['contrastTargets']) => void
  defaultTargets?: PaletteControls['contrastTargets']
}

export function GlobalContrastTargets({ 
  onApplyToAll, 
  onApplyToActive, 
  defaultTargets 
}: GlobalContrastTargetsProps) {
  // Only show core color steps (1-11) for global contrast targets
  // Steps 0 (white) and 12 (black) are hardcoded and don't use contrast-based calculation
  const steps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] // Core color steps only
  // Token Studio mapping for display
  const stepToTokenMapping = ['95', '90', '80', '70', '60', '50', '40', '30', '20', '15', '10']
  
  // Default contrast targets (current system defaults)
  const systemDefaults = {
    "1": 1.1,
    "2": 1.3,
    "3": 1.7,
    "4": 2.3,
    "5": 3.2,
    "6": 4.5,
    "7": 6.7,
    "8": 9.3,
    "9": 13.1,
    "10": 15.2,
    "11": 17.2
  }

  const [targets, setTargets] = useState<PaletteControls['contrastTargets']>(
    defaultTargets || systemDefaults
  )

  const updateTarget = (step: number, value: number) => {
    setTargets(prev => ({ ...prev, [step.toString()]: value }))
  }

  const resetToSystemDefaults = () => {
    setTargets(systemDefaults)
  }

  // Update targets when defaultTargets changes (when switching palettes)
  useEffect(() => {
    if (defaultTargets) {
      setTargets(defaultTargets)
    }
  }, [defaultTargets])



  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Global Contrast Targets</h3>
        <Button 
          onClick={resetToSystemDefaults}
          variant="outline" 
          size="sm"
          className="text-xs"
        >
          Reset to Defaults
        </Button>
      </div>

      <div className="space-y-2">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center space-x-3">
            <span className="text-sm font-mono text-muted-foreground w-8">{stepToTokenMapping[index]}</span>
            <Input
              type="number"
              value={targets[step.toString()]}
              onChange={(e) => updateTarget(step, parseFloat(e.target.value) || 1)}
              min="1"
              max="21"
              step="0.1"
              className="flex-1 text-sm"
            />
          </div>
        ))}
      </div>

              <div className="flex flex-col space-y-2 pt-2 border-t border-border">
        <Button
          onClick={() => onApplyToActive(targets)}
          className="w-full text-sm"
        >
          Apply to Active Palette
        </Button>
        <Button
          onClick={() => onApplyToAll(targets)}
          variant="secondary"
          className="w-full text-sm"
        >
          Apply to All Palettes
        </Button>
      </div>
    </div>
  )
} 