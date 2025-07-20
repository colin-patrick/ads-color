import React from 'react'
import { PaletteControls, PaletteColor } from '../types'

interface HueVisualizerProps {
  controls: PaletteControls
  colors: Array<{ step: number; contrast: number; lightness: number; css: string }> | PaletteColor[]
  className?: string
}

export function HueVisualizer({ controls, colors, className = '' }: HueVisualizerProps) {
  // Create gradient stops with white and black on the ends
  const sortedColors = colors.sort((a, b) => a.step - b.step) // Ensure colors are in step order
  
  const colorStops = [
    'white 0%',
    ...sortedColors.map((color, index) => {
      // Map palette colors to the middle 80% of the gradient (10% to 90%)
      const stopPosition = 10 + (index / (sortedColors.length - 1)) * 80
      return `${color.css} ${stopPosition}%`
    }),
    'black 100%'
  ].join(', ')

  return (
    <div 
      className={`h-12 rounded-lg border border-gray-300 ${className}`}
      style={{ 
        background: `linear-gradient(to right, ${colorStops})`,
        boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)'
      }}
      title="Hue progression across the palette - shows how the three hue sliders create a smooth color transition"
    />
  )
} 