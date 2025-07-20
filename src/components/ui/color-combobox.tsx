"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ColorOption {
  value: string
  label: string
  color: string
  group?: string
  isRelative?: boolean
}

interface ColorComboboxProps {
  value: string
  onChange: (value: string) => void
  options: ColorOption[]
  placeholder?: string
  className?: string
}

export function ColorCombobox({ 
  value, 
  onChange, 
  options, 
  placeholder = "Select color...",
  className 
}: ColorComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedOption = options.find((option) => option.value === value)

  // Group options by group
  const groupedOptions = React.useMemo(() => {
    const groups: Record<string, ColorOption[]> = {}
    
    options.forEach((option) => {
      const groupName = option.group || 'Colors'
      if (!groups[groupName]) {
        groups[groupName] = []
      }
      groups[groupName].push(option)
    })
    
    return groups
  }, [options])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          <div className="flex items-center space-x-2 overflow-hidden">
            {selectedOption && (
              selectedOption.isRelative ? (
                <svg className="w-4 h-4 flex-shrink-0 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M9 3v18"/>
                  <path d="M15 3v18"/>
                  <path d="M3 9h18"/>
                  <path d="M3 15h18"/>
                </svg>
              ) : (
                <div 
                  className="w-4 h-4 rounded border border-gray-300 flex-shrink-0"
                  style={{ backgroundColor: selectedOption.color }}
                />
              )
            )}
            <span className="truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search colors..." className="h-9" />
          <CommandList>
            <CommandEmpty>No color found.</CommandEmpty>
            {Object.entries(groupedOptions).map(([groupName, groupOptions]) => (
              <CommandGroup key={groupName} heading={groupName}>
                {groupOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onChange(option.value)
                      setOpen(false)
                    }}
                  >
                    <div className="flex items-center space-x-2 flex-1">
                      {option.isRelative ? (
                        <svg className="w-4 h-4 flex-shrink-0 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2"/>
                          <path d="M9 3v18"/>
                          <path d="M15 3v18"/>
                          <path d="M3 9h18"/>
                          <path d="M3 15h18"/>
                        </svg>
                      ) : (
                        <div 
                          className="w-4 h-4 rounded border border-gray-300 flex-shrink-0"
                          style={{ backgroundColor: option.color }}
                        />
                      )}
                      <span className="flex-1">{option.label}</span>
                    </div>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 