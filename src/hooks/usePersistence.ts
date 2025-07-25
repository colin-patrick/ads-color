import { useEffect } from 'react'
import { GamutSettings, LightnessSettings } from '../types'

interface UsePersistenceProps {
  gamutSettings: GamutSettings
  setGamutSettings: React.Dispatch<React.SetStateAction<GamutSettings>>
  lightnessSettings: LightnessSettings
  setLightnessSettings: React.Dispatch<React.SetStateAction<LightnessSettings>>
  isLoaded: boolean
}

export const usePersistence = ({
  gamutSettings,
  setGamutSettings,
  lightnessSettings,
  setLightnessSettings,
  isLoaded
}: UsePersistenceProps) => {
  
  // Load settings from localStorage on initialization
  const loadSettingsFromStorage = () => {
    // Load gamut settings from localStorage
    const savedGamutSettings = localStorage.getItem('ads-color-generator-gamut-settings')
    if (savedGamutSettings) {
      try {
        const parsedGamutSettings = JSON.parse(savedGamutSettings)
        setGamutSettings(parsedGamutSettings)
      } catch (error) {
        console.error('Failed to parse gamut settings:', error)
      }
    }
    
    // Load lightness settings from localStorage
    const savedLightnessSettings = localStorage.getItem('ads-color-generator-lightness-settings')
    if (savedLightnessSettings) {
      try {
        const parsedLightnessSettings = JSON.parse(savedLightnessSettings)
        setLightnessSettings(parsedLightnessSettings)
      } catch (error) {
        console.error('Failed to parse lightness settings:', error)
      }
    }
  }

  // Auto-save settings to localStorage when they change
  useEffect(() => {
    if (isLoaded) {
      // Save global settings to localStorage
      localStorage.setItem('ads-color-generator-gamut-settings', JSON.stringify(gamutSettings))
      localStorage.setItem('ads-color-generator-lightness-settings', JSON.stringify(lightnessSettings))
    }
  }, [isLoaded, gamutSettings, lightnessSettings])

  return {
    loadSettingsFromStorage
  }
} 