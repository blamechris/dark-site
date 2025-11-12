# Installation and Testing Guide

## Quick Start

### 1. Load the Extension in Chrome

1. Open Chrome/Edge/Brave browser
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" using the toggle in the top-right corner
4. Click "Load unpacked" button
5. Select the `dark-site` directory (the folder containing manifest.json)
6. The Dark Site extension should now appear in your extensions list

### 2. Pin the Extension (Optional)

1. Click the puzzle piece icon in the Chrome toolbar
2. Find "Dark Site" in the list
3. Click the pin icon to keep it visible in the toolbar

### 3. Test Basic Functionality

1. Visit any website (e.g., https://www.wikipedia.org)
2. The page should automatically appear in dark mode
3. Click the Dark Site extension icon (moon icon) in the toolbar
4. The popup should appear with controls for:
   - Dark Mode toggle switch
   - Brightness slider (50-150%)
   - Contrast slider (50-150%)
   - Sepia slider (0-100%)
   - Grayscale slider (0-100%)
   - Site-specific toggle button

### 4. Test Features

#### Toggle Dark Mode
- Click the toggle switch in the popup
- The page should immediately switch between dark mode and normal mode

#### Adjust Brightness
- Move the brightness slider
- The page brightness should change in real-time

#### Adjust Contrast
- Move the contrast slider
- The page contrast should change in real-time

#### Add Sepia Tone
- Move the sepia slider
- The page should get a warmer, sepia tone (good for reducing eye strain)

#### Add Grayscale
- Move the grayscale slider
- The page should lose color saturation

#### Disable for Specific Site
- On a website, click "Disable for this site" button in the popup
- The page should reload without dark mode
- The button text should change to "Enable for this site"
- Visit another page on the same domain - dark mode should stay disabled
- Click "Enable for this site" to re-enable

#### Options Page
- Click "⚙️ Advanced Settings" link in the popup
- Or right-click the extension icon and select "Options"
- You should see:
  - Information about how Dark Site works
  - List of disabled sites (if any)
  - Ability to remove sites from the disabled list
  - Reset to defaults button

### 5. Test with Different Websites

Test the extension on various types of websites:

#### Good Test Sites:
- **Wikipedia**: https://www.wikipedia.org (text-heavy)
- **GitHub**: https://github.com (already has dark mode, test interaction)
- **News sites**: CNN, BBC, etc. (varied content)
- **Google**: https://www.google.com (simple, clean)
- **Stack Overflow**: https://stackoverflow.com (code formatting)

#### What to Check:
- [ ] Text is readable (white on dark background)
- [ ] Images maintain their original colors (not inverted)
- [ ] Videos maintain their original colors (not inverted)
- [ ] Links are visible and distinguishable
- [ ] Buttons and interactive elements work
- [ ] SVG graphics maintain proper colors
- [ ] Page layout is not broken
- [ ] Dynamic content (loaded after page load) gets dark mode applied

### 6. Test Persistence

1. Adjust settings in the popup (e.g., brightness to 80%, contrast to 100%)
2. Close the popup
3. Visit a new website
4. Open the popup again
5. Settings should be preserved

### 7. Test Sync (if using Chrome with sync enabled)

1. Install the extension in another Chrome browser with the same Google account
2. Settings should sync across browsers

## Troubleshooting

### Extension doesn't load
- Make sure you selected the correct folder (containing manifest.json)
- Check browser console for errors (F12 → Console tab)

### Dark mode not applying
- Check if the website is in the disabled sites list (Options page)
- Ensure dark mode toggle is ON in the popup
- Try refreshing the page
- Check if the website has Content Security Policy that blocks extensions

### Images/Videos are inverted
- This shouldn't happen, but if it does, report it as a bug
- The content.js filter should handle this

### Settings not saving
- Check browser permissions for storage
- Look for errors in the extension console (chrome://extensions/ → Details → Inspect views: background page)

## Development Testing

### Check Console for Errors

1. Go to `chrome://extensions/`
2. Find Dark Site extension
3. Click "Inspect views: service worker" (for background.js)
4. Any errors will appear in the console

### Check Content Script Logs

1. Visit a website with the extension active
2. Open browser DevTools (F12)
3. Check Console tab for any "Dark Site:" prefixed messages

### Test Dynamic Content

Use the included test.html file:
1. Open test.html in your browser (File → Open File)
2. Click the "Add Content" button
3. New content should also have dark mode applied

### Reload Extension After Changes

After modifying any files:
1. Go to `chrome://extensions/`
2. Click the reload icon on the Dark Site extension card
3. Refresh any open tabs to see changes

## Performance Considerations

- The extension uses CSS filters which are GPU-accelerated
- Minimal JavaScript overhead
- Settings are cached to reduce storage reads
- MutationObserver monitors for dynamic content efficiently

## Known Limitations

1. Some websites with complex CSS may not render perfectly
2. Websites that already have dark mode may have double-inversion
3. Canvas elements with dynamic rendering may not be handled perfectly
4. Browser extension pages (chrome://) cannot be modified
5. Local file:// pages require additional permission

## Feature Checklist

- [x] Basic dark mode inversion
- [x] Image/video preservation
- [x] Brightness control
- [x] Contrast control
- [x] Sepia filter
- [x] Grayscale filter
- [x] Per-site enable/disable
- [x] Settings persistence
- [x] Popup UI
- [x] Options page
- [x] Dynamic content handling
- [x] Icon and branding

## Next Steps (Future Enhancements)

Potential improvements for future versions:
- Custom CSS injection for specific sites
- Automatic dark mode based on time of day
- Different dark mode algorithms (not just invert)
- Import/export settings
- Hotkey support
- Website-specific brightness/contrast settings
- Better handling of already-dark websites
- Performance optimizations for large pages
