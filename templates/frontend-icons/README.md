# PWA Icon Files

This directory contains the source SVG and placeholder files for PWA icons.

## How to Generate PNGs from SVG

### Option 1: Online Tools
1. Go to https://realfavicongenerator.net or https://www.pwabuilder.com/imageGenerator
2. Upload `icon.svg`
3. Download the generated icon pack
4. Copy the appropriate sizes to replace the placeholder files

### Option 2: Command Line (ImageMagick)
```bash
# Install ImageMagick if needed
# Ubuntu: sudo apt install imagemagick
# macOS: brew install imagemagick

# Generate all sizes
convert icon.svg -resize 180x180 icon-180.png
convert icon.svg -resize 192x192 icon-192.png
convert icon.svg -resize 512x512 icon-512.png
convert icon.svg -resize 32x32 icon-32.png

# Copy for apple-touch-icon
cp icon-180.png apple-touch-icon.png
```

### Option 3: macOS Preview
1. Open `icon.svg` in Preview
2. File > Export
3. Select PNG format and set dimensions

## Required Files

| File | Size | Purpose |
|------|------|---------|
| `icon.svg` | Vector | Source file, also used as favicon |
| `icon-32.png` | 32x32 | Favicon for browsers |
| `icon-180.png` | 180x180 | iOS home screen |
| `icon-192.png` | 192x192 | Android/PWA standard |
| `icon-512.png` | 512x512 | Android/PWA splash, maskable |
| `apple-touch-icon.png` | 180x180 | iOS Safari fallback (copy of icon-180) |

## Installation

After generating PNGs, copy all files to:
```
frontend/public/icons/
```

## Maskable Icon Notes

The `icon-512.png` is also used as a maskable icon. The SVG design keeps content
in the center 80% "safe zone" so Android can crop to circle/squircle shapes
without cutting off important parts.
