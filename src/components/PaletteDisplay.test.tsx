import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PaletteDisplay } from './PaletteDisplay'
import { Palette } from '../types'

// Mock the colorGeneration functions
jest.mock('../lib/colorGeneration', () => ({
  generatePalette: jest.fn(() => [
    { step: 50, css: '#fef2f2', oklch: { l: 0.97, c: 0.01, h: 0 } },
    { step: 100, css: '#fee2e2', oklch: { l: 0.93, c: 0.02, h: 0 } },
    { step: 500, css: '#ef4444', oklch: { l: 0.63, c: 0.18, h: 0 } }
  ]),
  getColorFormats: jest.fn((color) => ({
    hex: color.css,
    rgb: `rgb(255, 0, 0)`,
    oklch: `oklch(${color.oklch.l} ${color.oklch.c} ${color.oklch.h})`
  })),
  analyzeContrast: jest.fn(() => ({ ratio: 4.5, level: 'AA' })),
  getContrastBadge: jest.fn(() => ({ label: 'AA', style: { backgroundColor: 'green' }, description: 'Passes AA' })),
  copyToClipboard: jest.fn(() => Promise.resolve(true)),
  getTextColorForBackground: jest.fn(() => '#000000'),
  convertPaletteToLuminance: jest.fn((colors) => colors)
}))

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: jest.fn()
}))

const mockPalettes: Palette[] = [
  {
    id: '1',
    name: 'Red Palette',
    controls: {
      hue: 0,
      chroma: 0.1,
      lightnessRange: { min: 0.2, max: 0.9 },
      contrastTargets: { 50: 0, 100: 0, 200: 0, 300: 0, 400: 0, 500: 0, 600: 0, 700: 0, 800: 0, 900: 0, 950: 0 }
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2', 
    name: 'Blue Palette',
    controls: {
      hue: 240,
      chroma: 0.15,
      lightnessRange: { min: 0.2, max: 0.9 },
      contrastTargets: { 50: 0, 100: 0, 200: 0, 300: 0, 400: 0, 500: 0, 600: 0, 700: 0, 800: 0, 900: 0, 950: 0 }
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

const defaultProps = {
  palettes: mockPalettes,
  gridMode: false,
  luminanceMode: false,
  colorFormat: 'hex' as const,
  contrastAnalysis: {
    enabled: false,
    selectedColor: '#ffffff',
    showCompliance: true
  },
  showColorLabels: true,
  gamutSettings: { gamutMode: 'sRGB' as const },
  lightnessSettings: { mode: 'contrast' as const }
}

describe('PaletteDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<PaletteDisplay {...defaultProps} />)
    expect(screen.getByText('Red Palette')).toBeInTheDocument()
    expect(screen.getByText('Blue Palette')).toBeInTheDocument()
  })

  it('displays palettes in column mode by default', () => {
    render(<PaletteDisplay {...defaultProps} />)
    
    // Should show palette names
    expect(screen.getByText('Red Palette')).toBeInTheDocument()
    expect(screen.getByText('Blue Palette')).toBeInTheDocument()
    
    // Should render color swatches
    const colorSwatches = screen.getAllByRole('generic')
    expect(colorSwatches.length).toBeGreaterThan(0)
  })

  it('switches to grid mode when gridMode is true', () => {
    render(<PaletteDisplay {...defaultProps} gridMode={true} />)
    
    // Should still show palette names
    expect(screen.getByText('Red Palette')).toBeInTheDocument()
    expect(screen.getByText('Blue Palette')).toBeInTheDocument()
  })

  it('copies color when swatch is clicked', async () => {
    const { copyToClipboard } = require('../lib/colorGeneration')
    render(<PaletteDisplay {...defaultProps} />)
    
    // Find first color swatch and click it
    const colorElements = screen.getAllByTitle(/Click to copy/)
    fireEvent.click(colorElements[0])
    
    // Should call copyToClipboard
    await waitFor(() => {
      expect(copyToClipboard).toHaveBeenCalledWith('#fef2f2')
    })
  })

  it('shows color labels when showColorLabels is true', () => {
    render(<PaletteDisplay {...defaultProps} showColorLabels={true} />)
    
    // Should display color values
    expect(screen.getByText('#fef2f2')).toBeInTheDocument()
  })

  it('hides color labels when showColorLabels is false', () => {
    render(<PaletteDisplay {...defaultProps} showColorLabels={false} />)
    
    // Should not display color values
    expect(screen.queryByText('#fef2f2')).not.toBeInTheDocument()
  })

  it('shows contrast badges when contrast analysis is enabled', () => {
    const propsWithContrast = {
      ...defaultProps,
      contrastAnalysis: {
        enabled: true,
        selectedColor: '#ffffff',
        showCompliance: true
      }
    }
    
    render(<PaletteDisplay {...propsWithContrast} />)
    
    // Should show contrast badges (mocked to return 'AA')
    expect(screen.getAllByText('AA').length).toBeGreaterThan(0)
  })
}) 