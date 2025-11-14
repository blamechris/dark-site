# Universal Dark Mode - Chrome Extension

A robust dark mode browser extension that intelligently darkens all web pages while ensuring text remains readable and special content (like Google Docs) isn't broken.

## ✨ Features

- **Smart CSS Injection**: Targeted selectors instead of universal styling to preserve site functionality
- **Text Readability**: WCAG AA compliant contrast detection (4.5:1 for normal text, 3:1 for large text)
- **Font Preservation**: Protects user-set fonts in Google Docs, Sheets, and other rich text editors
- **Nested Content Support**: Handles iframes and Shadow DOM elements for complete page coverage
- **Performance Optimized**: TreeWalker-based traversal with batching and debouncing for large pages
- **Dynamic Updates**: Settings apply without page reload
- **Comprehensive Color Parsing**: Supports RGB, hex, HSL, and named colors
- **Print-Friendly**: Reverts to light colors when printing to save ink
- **Accessibility**: Respects `prefers-reduced-motion` and includes ARIA support

## 🎯 Design Goals

1. **Don't break special content** - Site-specific rules for Google Docs, code editors, and complex web apps
2. **Ensure text is always readable** - Automatic contrast adjustment
3. **Handle nested pages** - Process iframes and Shadow DOM
4. **Preserve user formatting** - Don't override fonts in rich text editors
5. **Perform well** - <100ms impact on page load, smooth on large DOMs

## 🏗️ Architecture

### Hybrid CSS Approach

Instead of using a universal `*` selector (which breaks sites), we use:
- **Targeted selectors** for common elements (p, div, span, etc.)
- **CSS custom properties** for easy theming
- **Lower specificity** to allow inline styles to take precedence
- **Site-specific exceptions** for Google Docs, code editors

### Font Preservation Strategy

1. Store original styles **before** applying dark mode
2. Use WeakMap to track original font families and colors
3. Restore preserved fonts for contenteditable elements
4. Let inline styles win for user-set formatting

### Performance Optimizations

- **TreeWalker** instead of `querySelectorAll('*')` for element traversal
- **Batching** with `requestIdleCallback` to avoid blocking the main thread
- **Debounced MutationObserver** (50ms) to handle dynamic content efficiently
- **WeakSet tracking** to avoid reprocessing elements
- **Early exclusion** of media elements (img, video, canvas)

## 📦 Installation

1. Generate icons:
   - Open `icons/generate-icons.html` in your browser
   - Click "Download All Icons"
   - Save `icon16.png`, `icon48.png`, `icon128.png` to the `icons/` folder

2. Load in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select this directory

## 🔧 Configuration

The extension includes a popup UI with:
- **Enable/Disable** toggle
- **Darkness intensity** slider (0-100%)
- **Preserve fonts** in editors
- **Handle nested content** (iframes)
- **Ensure text readability** (contrast checking)

Settings are synced across devices via `chrome.storage.sync` with local storage fallback.

## 🧪 Testing Recommendations

### Critical Test Sites:
- **Google Docs** - Verify fonts and colors are preserved
- **Wikipedia** - Test performance on large DOMs (10,000+ elements)
- **GitHub** - Ensure syntax highlighting remains intact
- **Gmail** - Check dynamic content handling
- **YouTube** - Verify Shadow DOM processing
- **News sites** - Test iframe handling

### Performance Targets:
- Page load impact: <100ms
- No visible flash on 3G connections
- Smooth scrolling on infinite-scroll sites
- No console errors on cross-origin iframes

## 🐛 Known Limitations

- Cross-origin iframes cannot be styled (browser security restriction)
- Some sites with aggressive CSS may override dark mode styles
- Canvas-based rendering (some games/apps) cannot be darkened

## 🔄 Recent Changes (v2.0)

**Major Architectural Redesign:**
- Replaced universal selector with targeted CSS approach
- Fixed font preservation to store originals before modification
- Comprehensive color parsing (hex, HSL, named colors)
- TreeWalker optimization for large DOMs
- Debounced MutationObserver for dynamic content
- Dynamic settings updates without page reload
- Event listener cleanup to prevent memory leaks
- Storage fallback (sync → local)
- Removed conflicting icon click handler

**Fixes:**
- C1: Universal CSS selector breaking sites → Targeted selectors
- C2: Font preservation not working → Store before modification
- C3: document.body null crashes → waitForBody helper
- C4: Color parsing incomplete → Comprehensive parser
- C7: querySelectorAll('*') performance → TreeWalker
- H1: MutationObserver no debouncing → 50ms debounce
- H2: location.reload() on settings change → Dynamic updates
- H3: Iframe processing timing → Process loaded + listen for new
- H9: Event listener memory leaks → Tracked cleanup
- H13: Conflicting icon click handler → Removed

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please test thoroughly on Google Docs family of products before submitting PRs.
