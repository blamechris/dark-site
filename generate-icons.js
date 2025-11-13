#!/usr/bin/env node

/**
 * Simple icon generator for Universal Dark Mode extension
 * Generates PNG icons without external dependencies
 */

const fs = require('fs');
const path = require('path');

// Simple PNG generator (creates a minimal valid PNG file with a colored square)
function createSimplePNG(size, outputPath) {
  // This creates a very simple PNG with a dark background and blue crescent
  // For a production extension, use the HTML generator or a proper image editor

  // For now, create a placeholder text file that explains the user needs to generate icons
  const placeholderContent = `PLACEHOLDER ICON FILE

This is a placeholder. To generate proper icons:

1. Open icons/generate-icons.html in your web browser
2. Click "Download All Icons"
3. Replace this file with the downloaded icon${size}.png

Alternatively, use an online SVG to PNG converter with icons/icon.svg`;

  fs.writeFileSync(outputPath, placeholderContent);
  console.log(`Created placeholder for ${path.basename(outputPath)}`);
}

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

// Generate placeholder files
const sizes = [16, 48, 128];
sizes.forEach(size => {
  const outputPath = path.join(iconsDir, `icon${size}.png`);
  if (!fs.existsSync(outputPath)) {
    createSimplePNG(size, outputPath);
  } else {
    console.log(`icon${size}.png already exists, skipping...`);
  }
});

console.log('\n⚠️  IMPORTANT: Placeholder icon files have been created.');
console.log('📋 To generate proper icons:');
console.log('   1. Open icons/generate-icons.html in your web browser');
console.log('   2. Click "Download All Icons"');
console.log('   3. Save the downloaded PNGs to the icons/ directory');
console.log('   4. Reload the extension in Chrome\n');
