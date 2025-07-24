"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
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
  showNumberInput = true
}: PrecisionSliderProps) {
  const displayValue = formatDisplay ? formatDisplay(value) : value.toFixed(3)
  
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
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    if (!isNaN(newValue)) {
      const clampedValue = Math.max(min, Math.min(max, newValue))
      onChange(clampedValue)
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
      onChange(newValue)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const newValue = Math.max(min, value - step)
      onChange(newValue)
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        {showNumberInput && (
          <Input
            type="number"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            min={min}
            max={max}
            step={step}
            className="w-24 h-8 text-sm font-mono pr-1 pl-3"
          />
        )}
      </div>
      
      <Slider
        value={[value]}
        onValueChange={(values) => onChange(values[0])}
        min={min}
        max={max}
        step={step}
        className="w-full mt-2"
      />
    </div>
  )
} 