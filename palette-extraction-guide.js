// ==================================================
// PALETTE EXTRACTION GUIDE
// ==================================================
// Run this script in your browser console when you're on localhost:5185
// to extract your existing color palettes and prepare them for import

console.log('🎨 Palette Extraction Tool for ADS Color Generator');
console.log('================================================');

// Function to extract palette data from common storage locations
function extractPaletteData() {
  const extractedData = {};
  
  // Check localStorage for palette data
  console.log('🔍 Checking localStorage...');
  const storageKeys = Object.keys(localStorage);
  const paletteKeys = storageKeys.filter(key => 
    key.includes('palette') || 
    key.includes('color') || 
    key.includes('theme')
  );
  
  if (paletteKeys.length > 0) {
    console.log('📦 Found potential palette data in localStorage:', paletteKeys);
    paletteKeys.forEach(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        extractedData[key] = data;
        console.log(`✅ Extracted data from ${key}:`, data);
      } catch (e) {
        console.log(`❌ Could not parse ${key}:`, localStorage.getItem(key));
      }
    });
  }
  
  // Check sessionStorage for palette data
  console.log('🔍 Checking sessionStorage...');
  const sessionKeys = Object.keys(sessionStorage);
  const sessionPaletteKeys = sessionKeys.filter(key => 
    key.includes('palette') || 
    key.includes('color') || 
    key.includes('theme')
  );
  
  if (sessionPaletteKeys.length > 0) {
    console.log('📦 Found potential palette data in sessionStorage:', sessionPaletteKeys);
    sessionPaletteKeys.forEach(key => {
      try {
        const data = JSON.parse(sessionStorage.getItem(key));
        extractedData[key] = data;
        console.log(`✅ Extracted data from ${key}:`, data);
      } catch (e) {
        console.log(`❌ Could not parse ${key}:`, sessionStorage.getItem(key));
      }
    });
  }
  
  // Try to extract from common global variables
  console.log('🔍 Checking global variables...');
  const globalVars = ['palettes', 'colors', 'themes', 'colorPalettes', 'colorSchemes'];
  globalVars.forEach(varName => {
    if (window[varName]) {
      extractedData[varName] = window[varName];
      console.log(`✅ Found global variable ${varName}:`, window[varName]);
    }
  });
  
  return extractedData;
}

// Function to download extracted data as JSON
function downloadPaletteData(data, filename = 'extracted-palettes.json') {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  console.log(`📥 Downloaded ${filename}`);
}

// Function to format data for ADS Color Generator
function formatForADSColorGenerator(extractedData) {
  const formattedPalettes = [];
  
  // Try to convert extracted data to ADS format
  Object.entries(extractedData).forEach(([key, data]) => {
    if (Array.isArray(data)) {
      // Handle array of palettes
      data.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          formattedPalettes.push({
            name: item.name || `${key} ${index + 1}`,
            baseHue: item.hue || item.baseHue || 220,
            maxChroma: item.chroma || item.maxChroma || 0.15,
            chromaMode: item.chromaMode || 'smooth',
            lightHueDrift: item.lightHueDrift || 0,
            darkHueDrift: item.darkHueDrift || 15,
            // Include original data for reference
            originalData: item
          });
        }
      });
    } else if (typeof data === 'object' && data !== null) {
      // Handle single palette object
      if (data.palettes && Array.isArray(data.palettes)) {
        // Handle nested palettes
        data.palettes.forEach((palette, index) => {
          formattedPalettes.push({
            name: palette.name || `Palette ${index + 1}`,
            baseHue: palette.hue || palette.baseHue || 220,
            maxChroma: palette.chroma || palette.maxChroma || 0.15,
            chromaMode: palette.chromaMode || 'smooth',
            lightHueDrift: palette.lightHueDrift || 0,
            darkHueDrift: palette.darkHueDrift || 15,
            originalData: palette
          });
        });
      } else {
        // Handle single palette
        formattedPalettes.push({
          name: data.name || key,
          baseHue: data.hue || data.baseHue || 220,
          maxChroma: data.chroma || data.maxChroma || 0.15,
          chromaMode: data.chromaMode || 'smooth',
          lightHueDrift: data.lightHueDrift || 0,
          darkHueDrift: data.darkHueDrift || 15,
          originalData: data
        });
      }
    }
  });
  
  return formattedPalettes;
}

// Main extraction function
function extractAndDownloadPalettes() {
  console.log('🚀 Starting palette extraction...');
  
  const extractedData = extractPaletteData();
  
  if (Object.keys(extractedData).length === 0) {
    console.log('❌ No palette data found in localStorage, sessionStorage, or global variables');
    console.log('💡 Try manually copying your palette data and running:');
    console.log('   downloadPaletteData(yourPaletteData, "my-palettes.json")');
    return;
  }
  
  // Download raw extracted data
  downloadPaletteData(extractedData, 'raw-palette-data.json');
  
  // Try to format for ADS Color Generator
  const formattedPalettes = formatForADSColorGenerator(extractedData);
  if (formattedPalettes.length > 0) {
    downloadPaletteData(formattedPalettes, 'formatted-palettes.json');
    console.log(`✅ Successfully formatted ${formattedPalettes.length} palette(s)`);
  }
  
  console.log('🎉 Extraction complete!');
  console.log('📁 Check your downloads folder for the JSON files');
  console.log('📋 Use "Import from External Tool" button in ADS Color Generator');
}

// Run the extraction
extractAndDownloadPalettes();

// Make functions available in console
window.extractPaletteData = extractPaletteData;
window.downloadPaletteData = downloadPaletteData;
window.formatForADSColorGenerator = formatForADSColorGenerator;
window.extractAndDownloadPalettes = extractAndDownloadPalettes; 