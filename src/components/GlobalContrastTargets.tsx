import React, { useState } from 'react'
import { PaletteControls } from '../types'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'

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
  const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const
  
  const [targets, setTargets] = useState<PaletteControls['contrastTargets']>(
    defaultTargets || {
      50: 1.1,
      100: 1.3,
      200: 1.7,
      300: 2.3,
      400: 3.2,
      500: 4.5,
      600: 6.7,
      700: 9.3,
      800: 13.1,
      900: 15.2,
      950: 17.2
    }
  )

  const updateTarget = (step: typeof steps[number], value: number) => {
    setTargets(prev => ({ ...prev, [step]: value }))
  }

  const loadPreset = (presetType: 'balanced' | 'accessible' | 'subtle') => {
    const presets = {
      balanced: {
        50: 1.1,
        100: 1.3,
        200: 1.7,
        300: 2.3,
        400: 3.2,
        500: 4.5,
        600: 6.7,
        700: 9.3,
        800: 13.1,
        900: 15.2,
        950: 17.2
      },
      accessible: {
        50: 1.5,
        100: 2.0,
        200: 2.5,
        300: 3.0,
        400: 4.0,
        500: 4.5,
        600: 7.0,
        700: 9.0,
        800: 12.0,
        900: 15.0,
        950: 18.0
      },
      subtle: {
        50: 1.05,
        100: 1.1,
        200: 1.3,
        300: 1.8,
        400: 2.5,
        500: 3.5,
        600: 5.0,
        700: 7.5,
        800: 10.0,
        900: 13.0,
        950: 16.0
      }
    }
    setTargets(presets[presetType])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Global Contrast Targets</h3>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => loadPreset('subtle')}
            variant="outline"
            size="sm"
            className="text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
          >
            Subtle
          </Button>
          <Button
            onClick={() => loadPreset('balanced')}
            variant="outline"
            size="sm"
            className="text-xs bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
          >
            Balanced
          </Button>
          <Button
            onClick={() => loadPreset('accessible')}
            variant="outline"
            size="sm"
            className="text-xs bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
          >
            Accessible
          </Button>
        </div>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {steps.map(step => (
          <div key={step} className="flex items-center space-x-3">
            <span className="text-sm font-mono text-gray-500 w-8">{step}</span>
            <Input
              type="number"
              value={targets[step]}
              onChange={(e) => updateTarget(step, parseFloat(e.target.value) || 1)}
              min="1"
              max="21"
              step="0.1"
              className="flex-1 text-sm"
            />
            <div className="flex items-center space-x-1 text-xs text-gray-400">
              {step === 500 && <span>AA</span>}
              {step === 700 && <span>AAA</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-500 mb-4">
        <p>AA = 4.5:1 (normal text), AAA = 7:1 (enhanced contrast)</p>
        <p>These targets will be applied to all palettes when you click Apply.</p>
      </div>

      <div className="flex space-x-2 pt-2 border-t border-gray-200">
        <Button
          onClick={() => onApplyToActive(targets)}
          className="flex-1 text-sm"
        >
          Apply to Active Palette
        </Button>
        <Button
          onClick={() => onApplyToAll(targets)}
          variant="secondary"
          className="flex-1 text-sm"
        >
          Apply to All Palettes
        </Button>
      </div>
    </div>
  )
} 