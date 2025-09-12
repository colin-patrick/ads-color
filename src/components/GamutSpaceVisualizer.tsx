import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { oklch, formatHex, rgb, inGamut } from 'culori';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { isColorInGamut } from '../lib/color/gamut';
import { PaletteControls, PaletteColor, GamutSettings } from '../types';
import { cn } from '../lib/utils';

interface GamutSpaceVisualizerProps {
  controls: PaletteControls;
  colors?: PaletteColor[];
  gamutSettings: GamutSettings;
  onColorSelect?: (lightness: number, chroma: number) => void;
  className?: string;
}

export function GamutSpaceVisualizer({
  controls,
  colors = [],
  gamutSettings,
  onColorSelect,
  className = ''
}: GamutSpaceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ lightness: number; chroma: number } | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // No chart dimensions needed - using full canvas
  
  // Calculate hue shift for a given lightness if palette has hue shifts
  const getHueAtLightness = useCallback((lightness: number) => {
    if (!controls.lightHueDrift && !controls.darkHueDrift) {
      return controls.baseHue;
    }
    
    // Map lightness to palette step position correctly
    // lightness 1.0 (lightest) = step 1, lightness 0.0 (darkest) = step 11
    const stepPosition = 11 - (lightness * 10); // Corrected mapping
    const anchorStep = 6;
    
    let hue: number;
    if (stepPosition <= anchorStep) {
      // Light colors (steps 1-6): higher lightness = more light drift
      const lightProgress = (anchorStep - stepPosition) / (anchorStep - 1);
      hue = controls.baseHue + (lightProgress * controls.lightHueDrift);
    } else {
      // Dark colors (steps 7-11): lower lightness = more dark drift  
      const darkProgress = (stepPosition - anchorStep) / (11 - anchorStep);
      hue = controls.baseHue + (darkProgress * controls.darkHueDrift);
    }
    
    hue = hue % 360;
    if (hue < 0) hue += 360;
    return hue;
  }, [controls.baseHue, controls.lightHueDrift, controls.darkHueDrift]);

  // Helper function to find accurate max chroma using Culori's gamut functions
  // Now respects user's min/max chroma constraints like palette generation does
  const findAccurateMaxChroma = useCallback((lightness: number, hue: number, gamutMode: string): number => {
    const gamutMap: { [key: string]: 'rgb' | 'p3' | 'rec2020' } = {
      'sRGB': 'rgb',
      'P3': 'p3', 
      'Rec2020': 'rec2020'
    };
    
    const targetGamut = gamutMap[gamutMode] || 'rgb';
    const isInGamutFn = inGamut(targetGamut);
    
    // First, find the theoretical maximum chroma for this lightness/hue
    let theoreticalMax = 0;
    let high = 0.5; // Start with reasonable upper bound
    const precision = 0.0001;
    
    // Find theoretical maximum
    while (high < 1.0) {
      const testColor = oklch({ mode: 'oklch', l: lightness, c: high, h: hue });
      if (!testColor || !isInGamutFn(testColor)) {
        break;
      }
      high += 0.1;
    }
    
    // Binary search for theoretical maximum
    let low = 0;
    let iterations = 0;
    const maxIterations = 50;
    
    while (high - low > precision && iterations < maxIterations) {
      const mid = (low + high) / 2;
      const testColor = oklch({ mode: 'oklch', l: lightness, c: mid, h: hue });
      
      if (testColor && isInGamutFn(testColor)) {
        theoreticalMax = mid;
        low = mid;
      } else {
        high = mid;
      }
      iterations++;
    }
    
    // For the visualizer, we want to show the full theoretical gamut
    // Don't apply user constraints - show the complete available color space
    return theoreticalMax;
  }, [controls.minChroma, controls.maxChroma]);

  // Calculate dynamic gamut with hue drift awareness using accurate Culori functions
  const dynamicGamut = useMemo(() => {
    console.time('dynamicGamut'); // Performance monitoring
    
    const gamutPoints = [];
    const resolution = 0.02; // 50 points across lightness range for smooth boundaries
    
    for (let lightness = 0; lightness <= 1; lightness += resolution) {
      const hue = getHueAtLightness(lightness);
      
      // Calculate max chroma using accurate Culori gamut checking
      const maxChroma = findAccurateMaxChroma(lightness, hue, gamutSettings.gamutMode);
      
      gamutPoints.push({
        lightness,
        hue,
        maxChroma: Math.max(0.01, maxChroma) // Ensure minimum chroma
      });
    }
    
    // Calculate overall max chroma for scaling - use the actual maximum found
    // This ensures we show the full theoretical gamut spectrum
    // Add 10% headroom to prevent high chroma values from touching the edge
    const maxChromaOverall = Math.max(...gamutPoints.map(p => p.maxChroma)) * 1.1;
    
    console.timeEnd('dynamicGamut');
    
    return {
      points: gamutPoints,
      maxChroma: maxChromaOverall
    };
  }, [controls.baseHue, controls.lightHueDrift, controls.darkHueDrift, gamutSettings.gamutMode, getHueAtLightness, findAccurateMaxChroma]);

  // Render the canvas color spectrum
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Get the actual display size of the canvas
    const rect = canvas.getBoundingClientRect();
    const displayWidth = rect.width;
    const displayHeight = rect.height;
    
    // Set canvas internal resolution to match display size exactly
    // This ensures proper aspect ratio matching
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    
    // Use full canvas dimensions - no padding
    const actualChartWidth = Math.floor(displayWidth);
    const actualChartHeight = Math.floor(displayHeight);
    
    // Ensure we have valid dimensions
    if (actualChartWidth <= 0 || actualChartHeight <= 0) return;
    
    // Optimize pixel rendering resolution for performance
    // For large canvases, render at lower resolution and scale up
    const maxPixels = 250000; // Further reduced to prevent cutoff: ~500x500 pixels max
    const totalPixels = actualChartWidth * actualChartHeight;
    const scaleFactor = totalPixels > maxPixels ? Math.sqrt(totalPixels / maxPixels) : 1;
    
    const renderWidth = Math.floor(actualChartWidth / scaleFactor);
    const renderHeight = Math.floor(actualChartHeight / scaleFactor);
    
    // Create ImageData for pixel manipulation
    const imageData = ctx.createImageData(renderWidth, renderHeight);
    const data = imageData.data;
    
    // Get interpolation function for dynamic gamut
    const getMaxChromaAtLightness = (lightness: number) => {
      // Find the two closest points in our dynamic gamut
      const points = dynamicGamut.points;
      if (points.length === 0) return 0.4;
      
      // Find surrounding points for interpolation
      let lowerPoint = points[0];
      let upperPoint = points[points.length - 1];
      
      for (let i = 0; i < points.length - 1; i++) {
        if (lightness >= points[i].lightness && lightness <= points[i + 1].lightness) {
          lowerPoint = points[i];
          upperPoint = points[i + 1];
          break;
        }
      }
      
      // Linear interpolation between the two points
      if (lowerPoint.lightness === upperPoint.lightness) {
        return lowerPoint.maxChroma;
      }
      
      const ratio = (lightness - lowerPoint.lightness) / (upperPoint.lightness - lowerPoint.lightness);
      return lowerPoint.maxChroma + (upperPoint.maxChroma - lowerPoint.maxChroma) * ratio;
    };

    // Render each pixel with dynamic gamut awareness
    for (let y = 0; y < renderHeight; y++) {
      for (let x = 0; x < renderWidth; x++) {
        const lightness = 1 - (x / renderWidth); // Inverted: white (1.0) at x=0, black (0.0) at x=width
        const maxChromaAtLightness = getMaxChromaAtLightness(lightness);
        
        // Calculate chroma from 0 to the overall maxChroma (for consistent Y-axis scaling)
        const chroma = (1 - y / renderHeight) * dynamicGamut.maxChroma;
        
        // Only render if chroma is within the actual boundary for this lightness
        if (chroma <= maxChromaAtLightness) {
          // Get hue (with potential shift)
          const hue = getHueAtLightness(lightness);
          
          // Check if this color is in gamut
          if (isColorInGamut(lightness, chroma, hue, gamutSettings.gamutMode)) {
            // Convert OKLCH to RGB
            const color = oklch({
              mode: 'oklch',
              l: Math.max(0, Math.min(1, lightness)),
              c: chroma,
              h: hue
            });
            
            if (color) {
              const rgbColor = rgb(color);
              if (rgbColor) {
                const pixelIndex = (y * renderWidth + x) * 4;
                data[pixelIndex] = Math.round((rgbColor.r || 0) * 255);     // Red
                data[pixelIndex + 1] = Math.round((rgbColor.g || 0) * 255); // Green
                data[pixelIndex + 2] = Math.round((rgbColor.b || 0) * 255); // Blue
                data[pixelIndex + 3] = 255; // Alpha (fully opaque)
              }
            }
          }
        }
        // Out-of-gamut or out-of-boundary pixels remain transparent (alpha = 0)
      }
    }
    
    // Clear the canvas
    ctx.clearRect(0, 0, displayWidth, displayHeight);
    
    // Fill background with muted color
    ctx.fillStyle = 'hsl(210, 40%, 98%)'; // Approximate muted background
    ctx.fillRect(0, 0, actualChartWidth, actualChartHeight);
    
    // Draw the color spectrum (scale up if needed)
    if (scaleFactor > 1) {
      // Create temporary canvas for scaling
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = renderWidth;
      tempCanvas.height = renderHeight;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.putImageData(imageData, 0, 0);
        // Scale and draw to main canvas with smooth interpolation for better edges
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(tempCanvas, 0, 0, renderWidth, renderHeight, 0, 0, actualChartWidth, actualChartHeight);
      }
    } else {
      ctx.putImageData(imageData, 0, 0);
    }
    
    // Create coordinate scaling functions for full canvas
    const actualXScale = (lightness: number) => (1 - lightness) * actualChartWidth; // Inverted: white (1.0) at x=0, black (0.0) at x=width
    const actualYScale = (chroma: number) => (1 - chroma / dynamicGamut.maxChroma) * actualChartHeight;
    
    // Draw current palette colors - simplified approach using actual color values
    colors.filter(color => color.step >= 1 && color.step <= 11).forEach((color) => {
      // Plot dots based on their actual color values (already validated during generation)
      const x = Math.round(actualXScale(color.lightness));
      const y = Math.round(actualYScale(color.chroma));
      
      // Simple bounds check to ensure dot is within canvas
      if (x >= 0 && x <= actualChartWidth && y >= 0 && y <= actualChartHeight) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = color.css;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
    
    // Draw hover indicator
    if (hoveredPoint) {
      const hue = getHueAtLightness(hoveredPoint.lightness);
      if (isColorInGamut(hoveredPoint.lightness, hoveredPoint.chroma, hue, gamutSettings.gamutMode)) {
        const color = oklch({
          mode: 'oklch',
          l: hoveredPoint.lightness,
          c: hoveredPoint.chroma,
          h: hue
        });
        
        if (color) {
          const x = Math.round(actualXScale(hoveredPoint.lightness));
          const y = Math.round(actualYScale(hoveredPoint.chroma));
          
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fillStyle = formatHex(color) || '#000';
          ctx.fill();
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }
    
  }, [
    dynamicGamut, colors, hoveredPoint, controls, gamutSettings, getHueAtLightness
  ]);

  // Render canvas when dependencies change
  useEffect(() => {
    // Small delay to ensure canvas is properly sized
    const timeoutId = setTimeout(() => {
      renderCanvas();
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, [renderCanvas]);

  // Re-render when canvas size changes (debounced)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let timeoutId: NodeJS.Timeout;
    const debouncedRender = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        renderCanvas();
      }, 16); // ~60fps
    };

    const resizeObserver = new ResizeObserver(debouncedRender);
    resizeObserver.observe(canvas);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [renderCanvas]);

  
  // Handle click to select color
  const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onColorSelect || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    // Use actual mouse coordinates relative to canvas
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Convert to chart coordinates (full canvas)
    const lightness = 1 - (x / rect.width); // Inverted: white (1.0) at x=0, black (0.0) at x=width
    const chroma = (1 - y / rect.height) * dynamicGamut.maxChroma;
    
    // Only allow selection within gamut and chart area
    if (lightness >= 0 && lightness <= 1 && chroma >= 0 && chroma <= dynamicGamut.maxChroma) {
      const hue = getHueAtLightness(lightness);
      if (isColorInGamut(lightness, chroma, hue, gamutSettings.gamutMode)) {
        onColorSelect(lightness, chroma);
      }
    }
  }, [onColorSelect, gamutSettings.gamutMode, dynamicGamut.maxChroma, getHueAtLightness]);
  
  // Handle mouse move for hover effects
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    // Use actual mouse coordinates relative to canvas
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Convert to chart coordinates (full canvas)
    const lightness = 1 - (x / rect.width); // Inverted: white (1.0) at x=0, black (0.0) at x=width
    const chroma = (1 - y / rect.height) * dynamicGamut.maxChroma;
    
    if (lightness >= 0 && lightness <= 1 && chroma >= 0 && chroma <= dynamicGamut.maxChroma) {
      setHoveredPoint({ lightness, chroma });
    } else {
      setHoveredPoint(null);
    }
  }, [dynamicGamut.maxChroma]);
  
  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null);
  }, []);
  
  // Get color for hover point
  const hoverColor = useMemo(() => {
    if (!hoveredPoint) return null;
    
    const hue = getHueAtLightness(hoveredPoint.lightness);
    const isInGamut = isColorInGamut(
      hoveredPoint.lightness, 
      hoveredPoint.chroma, 
      hue, 
      gamutSettings.gamutMode
    );
    
    if (!isInGamut) return null;
    
    const color = oklch({
      mode: 'oklch',
      l: hoveredPoint.lightness,
      c: hoveredPoint.chroma,
      h: hue
    });
    
    return color ? formatHex(color) : null;
  }, [hoveredPoint, gamutSettings.gamutMode, getHueAtLightness]);
  
  return (
    <div className={cn('space-y-3', className)}>
      <div 
        className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="text-sm font-medium text-foreground">
          Gamut Space - Hue {controls.baseHue.toFixed(1)}° ({gamutSettings.gamutMode})
        </div>
        {isCollapsed ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
      
      {!isCollapsed && (
        <>
          <div className="w-full relative" style={{ aspectRatio: '3/1' }}>
            <canvas
              ref={canvasRef}
              className="cursor-crosshair w-full h-full"
              style={{ imageRendering: 'crisp-edges' }}
              onClick={handleClick}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            />
          </div>
          
          {/* Fixed height info display to prevent layout shift */}
          <div className="h-6 flex items-center justify-center">
            {hoveredPoint && hoverColor ? (
              <div className="flex items-center space-x-2 text-xs">
                <div 
                  className="w-4 h-4 border border-border rounded flex-shrink-0"
                  style={{ backgroundColor: hoverColor }}
                />
                <span className="font-mono">
                  L: {hoveredPoint.lightness.toFixed(3)}, C: {hoveredPoint.chroma.toFixed(3)}
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Hover over the visualizer to see color values</span>
            )}
          </div>
        </>
      )}
      
    </div>
  );
}

