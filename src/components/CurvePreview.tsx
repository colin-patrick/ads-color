import { PaletteControls } from '../types';
import { calculateGamutAwareChromaFactor } from '../lib/palette/generation';
import { calculateChromaFactor } from '../lib/math/curves';

interface CurvePreviewProps {
  controls: PaletteControls;
}

export function CurvePreview({ controls }: CurvePreviewProps) {
  if (controls.chromaMode !== 'curve' && controls.chromaMode !== 'perceptual') {
    return null;
  }

  // Use the color steps from controls (1-11, the core color-generating steps)
  const colorSteps = (controls.steps || []).filter(step => 
    Number.isInteger(step) && step >= 1 && step <= 11
  ).sort((a, b) => a - b);
  
  // Calculate chroma values for each color step
  const chromaValues = colorSteps.map((step: number, index: number) => {
    const normalizedStep = index / (colorSteps.length - 1); // Normalize to 0-1
    const peak = controls.chromaPeak;
    const chromaPosition = Math.abs(normalizedStep - peak);
    
    if (controls.chromaMode === 'perceptual') {
      // For perceptual mode, we need to calculate hue and lightness
      const anchorStep = 6;
      let hue: number;
      if (step <= anchorStep) {
        const lightProgress = (anchorStep - step) / (anchorStep - 1);
        hue = controls.baseHue + (lightProgress * controls.lightHueDrift);
      } else {
        const darkProgress = (step - anchorStep) / (11 - anchorStep);
        hue = controls.baseHue + (darkProgress * controls.darkHueDrift);
      }
      hue = hue % 360;
      if (hue < 0) hue += 360;
      
      // Use a rough lightness estimate for preview
      const roughLightness = controls.lightnessMin + normalizedStep * (controls.lightnessMax - controls.lightnessMin);
      
      return calculateGamutAwareChromaFactor(
        roughLightness,
        hue,
        chromaPosition,
        controls.chromaCurveType || 'gaussian',
        controls.minChroma,
        controls.maxChroma,
        'sRGB', // Use sRGB for preview
        controls.chromaEasing
      );
    } else {
      // Regular curve mode
      const chromaFactor = calculateChromaFactor(
        chromaPosition,
        controls.chromaCurveType || 'gaussian',
        controls.chromaEasing
      );
      return controls.minChroma + (controls.maxChroma - controls.minChroma) * chromaFactor;
    }
  });

  // SVG dimensions
  const width = 280;
  const height = 100;
  const padding = 15;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  // Create path points
  const points = chromaValues.map((chroma: number, index: number) => {
    const x = padding + (index / (colorSteps.length - 1)) * graphWidth;
    const y = padding + (1 - (chroma - controls.minChroma) / (controls.maxChroma - controls.minChroma)) * graphHeight;
    return `${x},${y}`;
  }).join(' ');

  const pathD = `M${points.split(' ').join(' L')}`;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-muted-foreground">
        Curve Preview {controls.chromaMode === 'perceptual' ? '(Gamut-Aware)' : ''}
      </div>
      <div className="border rounded-lg bg-card">
        <svg width={width} height={height} className="w-full h-auto">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1"/>
            </pattern>
          </defs>
          <rect width={width} height={height} fill="url(#grid)" />
          
          {/* Curve line */}
          <path
            d={pathD}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-primary"
          />
          
          {/* Data points */}
          {chromaValues.map((chroma: number, index: number) => {
            const x = padding + (index / (colorSteps.length - 1)) * graphWidth;
            const y = padding + (1 - (chroma - controls.minChroma) / (controls.maxChroma - controls.minChroma)) * graphHeight;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="2"
                fill="currentColor"
                className="text-primary"
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
} 