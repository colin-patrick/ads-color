"use client"

import * as React from "react"
import { cn } from "../../lib/utils"
import { Slider } from "./slider"
import { Input } from "./input"

interface PrecisionSliderProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step: number
  label: string
  unit?: string
  formatDisplay?: (value: number) => string
  className?: string
  showNumberInput?: boolean
  // New props for editable label
  editableLabel?: boolean
  onLabelChange?: (newLabel: string) => void
}

export function PrecisionSlider({
  value,
  onChange,
  min,
  max,
  step,
  label,
  unit = '',
  formatDisplay,
  className,
  showNumberInput = true,
  editableLabel = false,
  onLabelChange
}: PrecisionSliderProps) {
  
  // Extract numeric value for the input field
  const getInputValue = () => {
    if (formatDisplay) {
      // Extract just the numeric part from formatted display
      const formatted = formatDisplay(value)
      const numericMatch = formatted.match(/[\d.-]+/)
      return numericMatch ? parseFloat(numericMatch[0]) : value
    }
    // Default to 2 decimal places for display in input
    return Math.round(value * 100) / 100
  }
  
  const inputValue = getInputValue()
  
  const roundToStep = (value: number) => {
    return Math.round(value / step) * step
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    if (!isNaN(newValue)) {
      const clampedValue = Math.max(min, Math.min(max, newValue))
      const roundedValue = roundToStep(clampedValue)
      onChange(roundedValue)
    }
  }

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    if (isNaN(newValue)) {
      // Reset to the properly formatted input value
      e.target.value = inputValue.toString()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const newValue = Math.min(max, value + step)
      const roundedValue = roundToStep(newValue)
      onChange(roundedValue)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const newValue = Math.max(min, value - step)
      const roundedValue = roundToStep(newValue)
      onChange(roundedValue)
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        {editableLabel && onLabelChange ? (
          <div className="relative max-w-[120px]">
            <Input
              value={label}
              onChange={(e) => onLabelChange(e.target.value)}
              className={cn(
                "text-sm font-medium bg-transparent border border-transparent px-2 py-1 h-auto shadow-none",
                "focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-input focus-visible:bg-background",
                "hover:border-input hover:bg-muted/30 rounded-md transition-colors"
              )}
              placeholder="Token name"
            />
          </div>
        ) : (
          <label className="text-sm font-medium">{label}</label>
        )}
        {showNumberInput && (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
              min={min}
              max={max}
              step={step}
              className="w-20 h-8 text-sm font-mono pr-1 pl-3"
            />
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          </div>
        )}
      </div>
      
      <Slider
        value={[value]}
        onValueChange={(values) => onChange(roundToStep(values[0]))}
        min={min}
        max={max}
        step={step}
        className="w-full mt-2"
      />
    </div>
  )
} 