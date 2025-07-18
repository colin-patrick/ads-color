# 🎨 Palette Import Guide

This guide explains how to import your existing color palettes from localhost:5185 (or any other tool) into the ADS Color Generator.

## 📋 Quick Start

1. **Export from your current tool** (localhost:5185)
2. **Import into ADS Color Generator** using the new import buttons

## 🔧 Method 1: Automatic Extraction (Recommended)

### Step 1: Extract Palettes from localhost:5185

1. Open your browser and navigate to `localhost:5185`
2. Open the browser console (F12 → Console tab)
3. Copy and paste the entire content of `palette-extraction-guide.js` into the console
4. Press Enter to run the script

The script will:
- ✅ Automatically search for palette data in localStorage, sessionStorage, and global variables
- 📥 Download JSON files with your palette data
- 🔄 Format the data for import into ADS Color Generator

### Step 2: Import into ADS Color Generator

1. Open your ADS Color Generator
2. In the left panel, scroll down to the "Import/Export" section
3. Click **"Import from External Tool"** (the blue button)
4. Select the `formatted-palettes.json` file that was downloaded
5. Your palettes will be imported and ready to use!

## 🛠️ Method 2: Manual Extraction

If the automatic extraction doesn't work, you can manually extract your palette data:

### Step 1: Find Your Palette Data

1. On localhost:5185, open browser console (F12)
2. Try these commands to find your data:
   ```javascript
   // Check localStorage
   Object.keys(localStorage).forEach(key => {
     if (key.includes('palette') || key.includes('color')) {
       console.log(key, localStorage.getItem(key));
     }
   });
   
   // Check global variables
   console.log('Palettes:', window.palettes);
   console.log('Colors:', window.colors);
   ```

### Step 2: Download Your Data

Once you find your palette data, download it:
```javascript
// Replace 'yourPaletteData' with your actual data
const yourPaletteData = /* your palette data here */;
downloadPaletteData(yourPaletteData, 'my-palettes.json');
```

### Step 3: Import into ADS Color Generator

Use the **"Import from External Tool"** button to import your JSON file.

## 📁 File Formats Supported

The import function supports various palette data formats:

### Format 1: Array of Palettes
```json
[
  {
    "name": "My Blue Palette",
    "hue": 220,
    "chroma": 0.15,
    "baseHue": 220,
    "maxChroma": 0.15
  },
  {
    "name": "My Red Palette",
    "hue": 0,
    "chroma": 0.18
  }
]
```

### Format 2: Object with Palettes Array
```json
{
  "palettes": [
    {
      "name": "Palette 1",
      "baseHue": 280,
      "maxChroma": 0.16
    }
  ]
}
```

### Format 3: Single Palette Object
```json
{
  "name": "My Palette",
  "hue": 140,
  "chroma": 0.15,
  "chromaMode": "smooth"
}
```

## 🎯 Supported Properties

The import function recognizes these properties from your external palette data:

- `name` - Palette name
- `hue` or `baseHue` - Base hue value (0-360)
- `chroma` or `maxChroma` - Maximum chroma value (0-1)
- `chromaMode` - Chroma distribution mode ('smooth', 'manual', 'vibrant')
- `lightHueDrift` - Hue drift for light colors
- `darkHueDrift` - Hue drift for dark colors
- `lightnessMin` - Minimum lightness value
- `lightnessMax` - Maximum lightness value

Missing properties will be filled with sensible defaults.

## 🚀 Export Your Current Palettes

You can also export your current ADS Color Generator palettes:

1. Click **"Export Palettes"** button
2. A JSON file will be downloaded with all your palettes
3. Use this file to backup your work or share with others

## 🔄 Import/Export Use Cases

- **Backup**: Export your palettes before making major changes
- **Share**: Send palette files to team members
- **Migrate**: Move palettes between different tools
- **Experiment**: Try different variations by importing/exporting

## 🆘 Troubleshooting

### "Failed to import palettes" Error

1. **Check JSON format**: Ensure your file is valid JSON
2. **Try raw data**: If formatted import fails, try importing the raw JSON
3. **Manual format**: Create a simple JSON array with your palette data

### No Palettes Found During Extraction

1. **Check different storage**: Try sessionStorage instead of localStorage
2. **Inspect network**: Check if palettes are loaded from an API
3. **Manual copy**: Copy palette data directly from the UI or source code

### Example Manual Format

If automatic extraction fails, create a file like this:
```json
[
  {
    "name": "My Custom Palette",
    "baseHue": 220,
    "maxChroma": 0.15,
    "chromaMode": "smooth",
    "lightHueDrift": 0,
    "darkHueDrift": 15
  }
]
```

## 🎨 Next Steps

Once your palettes are imported:

1. **Fine-tune**: Adjust the imported palettes using the control panel
2. **Organize**: Rename palettes to match your naming convention
3. **Extend**: Use imported palettes as starting points for new variations
4. **Share**: Export and share your refined palettes with your team

Need help? Check the console for detailed error messages and extraction logs! 