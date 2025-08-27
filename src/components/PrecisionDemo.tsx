import { useState } from 'react'
import { PrecisionSlider } from './ui/precision-slider'
import { DEFAULT_PRECISION } from '../types'
import { oklch, formatHex, formatCss } from 'culori'

export function PrecisionDemo() {
  const [lightness, setLightness] = useState(0.65)
  const [chroma, setChroma] = useState(0.15)
  const [hue, setHue] = useState(247)

  // Generate color from current values
  const color = oklch({ mode: 'oklch', l: lightness, c: chroma, h: hue })
  const hexColor = formatHex(color) || '#000000'
  // Use formatCss for consistent formatting, with fallback for precision
  const oklchString = formatCss(color) || `oklch(${(lightness * 100).toFixed(DEFAULT_PRECISION.lightness.displayDecimals)}% ${chroma.toFixed(DEFAULT_PRECISION.chroma.displayDecimals)} ${hue.toFixed(DEFAULT_PRECISION.hue.displayDecimals)})`

  return (
    <div className="p-6 space-y-6 max-w-md mx-auto">
      <h2 className="text-xl font-semibold">Precision Slider Demo</h2>
      
      {/* Color Preview */}
      <div className="space-y-2">
        <div 
          className="w-full h-20 rounded-lg border-2 border-gray-300"
          style={{ backgroundColor: hexColor }}
        />
        <div className="text-sm font-mono bg-gray-100 p-2 rounded">
          {oklchString}
        </div>
        <div className="text-sm font-mono bg-gray-100 p-2 rounded">
          {hexColor}
        </div>
      </div>

      {/* Precision Sliders */}
      <div className="space-y-4">
        <PrecisionSlider
          value={lightness}
          onChange={setLightness}
          min={0}
          max={1}
          step={DEFAULT_PRECISION.lightness.step}
          label="Lightness"
          unit="%"
          formatDisplay={(value) => `${(value * 100).toFixed(DEFAULT_PRECISION.lightness.displayDecimals)}%`}
        />

        <PrecisionSlider
          value={chroma}
          onChange={setChroma}
          min={0}
          max={0.4}
          step={DEFAULT_PRECISION.chroma.step}
          label="Chroma"
          formatDisplay={(value) => value.toFixed(DEFAULT_PRECISION.chroma.displayDecimals)}
        />

        <PrecisionSlider
          value={hue}
          onChange={setHue}
          min={0}
          max={360}
          step={DEFAULT_PRECISION.hue.step}
          label="Hue"
          unit="°"
          formatDisplay={(value) => `${value.toFixed(DEFAULT_PRECISION.hue.displayDecimals)}°`}
        />
      </div>

      <div className="text-xs text-gray-600">
        <p><strong>Precision:</strong></p>
        <p>• Lightness: {DEFAULT_PRECISION.lightness.step} step, {DEFAULT_PRECISION.lightness.displayDecimals} decimals</p>
        <p>• Chroma: {DEFAULT_PRECISION.chroma.step} step, {DEFAULT_PRECISION.chroma.displayDecimals} decimals</p>
        <p>• Hue: {DEFAULT_PRECISION.hue.step}° step, {DEFAULT_PRECISION.hue.displayDecimals} decimals</p>
      </div>
    </div>
  )
} 