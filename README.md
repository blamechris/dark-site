# 🌙 Dark Site

Browser extension to make all pages dark mode without breaking special content like images and videos!

## Features

- **Intelligent Dark Mode**: Applies dark mode to all websites while preserving images and videos
- **Customizable Filters**: Adjust brightness, contrast, sepia, and grayscale to your preference
- **Site-Specific Control**: Enable or disable dark mode for individual websites
- **Simple UI**: Easy-to-use popup interface for quick adjustments
- **Persistent Settings**: Your preferences are saved and synced across browsers

## How It Works

Dark Site uses CSS filters to intelligently invert the colors of web pages, similar to the popular Dark Reader extension. The extension:

1. Inverts page colors to create a dark background
2. Applies hue rotation to maintain natural color appearance
3. Re-inverts images, videos, and media elements to preserve their original appearance
4. Provides customizable filters for brightness, contrast, sepia, and grayscale

## Installation

### Chrome/Edge/Brave (Developer Mode)

1. Download or clone this repository
2. Open Chrome/Edge/Brave and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the `dark-site` directory
6. The extension icon should appear in your browser toolbar

### Testing

1. After installing the extension, visit any website
2. Dark mode should be automatically applied
3. Click the extension icon to:
   - Toggle dark mode on/off
   - Adjust brightness, contrast, sepia, and grayscale
   - Enable/disable dark mode for the current site
4. Visit the Options page for advanced settings

## Usage

### Popup Controls

- **Dark Mode Toggle**: Enable or disable dark mode globally
- **Brightness**: Adjust overall page brightness (50-150%)
- **Contrast**: Control contrast between dark and light elements (50-150%)
- **Sepia**: Add warm tone to reduce eye strain (0-100%)
- **Grayscale**: Remove color for monochrome appearance (0-100%)
- **Site Toggle**: Disable dark mode for specific websites

### Options Page

- View and manage sites where dark mode is disabled
- Reset all settings to defaults
- Learn more about how the extension works

## Technical Details

### Architecture

- **Manifest V3**: Uses the latest Chrome extension manifest version
- **Content Script**: Injected into all pages to apply dark mode filters
- **Background Service Worker**: Manages extension state and settings
- **Popup**: Provides user interface for controls
- **Options Page**: Advanced configuration and site management

### Files

- `manifest.json`: Extension configuration
- `content.js`: Core dark mode logic
- `background.js`: Background service worker
- `popup.html/js`: Extension popup interface
- `options.html/js`: Options page
- `icons/`: Extension icons

## Development

This extension is built with vanilla JavaScript and requires no build process. To modify:

1. Edit the source files
2. Go to `chrome://extensions/`
3. Click the reload icon on the Dark Site extension card
4. Test your changes

## Credits

Inspired by the Dark Reader extension, recreated with a focus on simplicity and core functionality.

## License

This project is open source and available for educational and personal use.
