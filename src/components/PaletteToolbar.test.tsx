import { render } from '@testing-library/react'
import { PaletteToolbar } from './PaletteToolbar'
import { ColorFormat } from '../types'
import '@testing-library/jest-dom' // Adds matchers like toBeInTheDocument

describe('PaletteToolbar', () => {
  it('renders without crashing', () => {
    const mockProps = {
      contrastAnalysis: { enabled: false, selectedColor: '#fff', showCompliance: true },
      setContrastAnalysis: jest.fn(),
      gridMode: false,
      setGridMode: jest.fn(),
      luminanceMode: false,
      setLuminanceMode: jest.fn(),
      colorFormat: 'hex' as ColorFormat,
      setColorFormat: jest.fn(),
      showColorLabels: true,
      setShowColorLabels: jest.fn(),
      colorOptions: [],
      setSettingsOpen: jest.fn()
    }

    const { container } = render(<PaletteToolbar {...mockProps} />)
    expect(container).toBeInTheDocument()
  })
})