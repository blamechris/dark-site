// Universal Dark Mode Content Script
// Handles dark mode injection with smart text readability and site-specific rules

class DarkModeManager {
  constructor() {
    this.settings = {
      enabled: true,
      intensity: 0.95, // 0-1 scale for darkness
      preserveFonts: true,
      handleIframes: true,
      textContrast: true
    };

    this.siteRules = this.initializeSiteRules();
    this.observer = null;
    this.processedIframes = new WeakSet();
    this.processedShadowRoots = new WeakSet();

    this.init();
  }

  // Site-specific rules to prevent breaking special content
  initializeSiteRules() {
    const hostname = window.location.hostname;

    return {
      // Google Docs/Sheets/Slides - preserve editor content
      isGoogleEditor: hostname.includes('docs.google.com') ||
                      hostname.includes('sheets.google.com') ||
                      hostname.includes('slides.google.com'),

      // Other sites that might need special handling
      isGmail: hostname.includes('mail.google.com'),
      isCodeEditor: hostname.includes('github.dev') ||
                    hostname.includes('vscode.dev') ||
                    hostname.includes('codesandbox.io'),

      // Selectors to exclude from font changes
      fontPreserveSelectors: [
        '.docs-texteditorbubble-text',  // Google Docs editor
        '.cell-input',                   // Google Sheets cells
        '[contenteditable="true"]',      // Any contenteditable
        '.kix-canvas-tile-content',      // Google Docs canvas
        'canvas',                         // Canvas elements
        'pre', 'code'                    // Code blocks
      ],

      // Elements that should keep their background colors
      preserveBackgroundSelectors: [
        'canvas',
        'img',
        'video',
        '[role="img"]'
      ]
    };
  }

  async init() {
    // Load settings from storage
    try {
      const stored = await chrome.storage.sync.get('darkModeSettings');
      if (stored.darkModeSettings) {
        this.settings = { ...this.settings, ...stored.darkModeSettings };
      }
    } catch (err) {
      console.warn('Could not load dark mode settings:', err);
    }

    if (!this.settings.enabled) return;

    // Inject base CSS immediately
    this.injectBaseStyles();

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.processDocument());
    } else {
      this.processDocument();
    }

    // Set up mutation observer for dynamic content
    this.setupMutationObserver();
  }

  injectBaseStyles() {
    const style = document.createElement('style');
    style.id = 'universal-dark-mode-base';

    const intensity = this.settings.intensity;
    const bgColor = this.calculateBgColor(intensity);
    const textColor = '#e8e6e3';
    const linkColor = '#8ab4f8';

    style.textContent = `
      /* Base dark mode styles */
      html {
        background-color: ${bgColor} !important;
        filter: none !important;
      }

      body {
        background-color: ${bgColor} !important;
        color: ${textColor} !important;
      }

      /* All elements default dark */
      * {
        background-color: ${bgColor} !important;
        color: ${textColor} !important;
        border-color: #3c4043 !important;
      }

      /* Links */
      a, a:visited {
        color: ${linkColor} !important;
      }

      a:hover {
        color: #aecbfa !important;
      }

      /* Input fields */
      input, textarea, select {
        background-color: #202124 !important;
        color: ${textColor} !important;
        border: 1px solid #5f6368 !important;
      }

      input::placeholder, textarea::placeholder {
        color: #9aa0a6 !important;
      }

      /* Buttons */
      button {
        background-color: #303134 !important;
        color: ${textColor} !important;
      }

      button:hover {
        background-color: #3c4043 !important;
      }

      /* Preserve images and videos */
      img, video, canvas, svg, [role="img"] {
        background-color: transparent !important;
        filter: none !important;
      }

      /* Code blocks */
      pre, code {
        background-color: #1e1e1e !important;
        color: #d4d4d4 !important;
      }

      /* Scrollbars */
      ::-webkit-scrollbar {
        background-color: ${bgColor} !important;
      }

      ::-webkit-scrollbar-thumb {
        background-color: #5f6368 !important;
      }

      ::-webkit-scrollbar-thumb:hover {
        background-color: #80868b !important;
      }
    `;

    document.documentElement.appendChild(style);
  }

  calculateBgColor(intensity) {
    // Pure black at 1.0, softer gray at lower intensities
    const value = Math.round((1 - intensity) * 40);
    return `rgb(${value}, ${value}, ${value})`;
  }

  processDocument() {
    // Process main document
    this.processElements(document.body);

    // Process iframes
    if (this.settings.handleIframes) {
      this.processIframes();
    }

    // Process shadow DOMs
    this.processShadowRoots(document.body);
  }

  processElements(root) {
    if (!root) return;

    const elements = root.querySelectorAll('*');

    elements.forEach(el => {
      this.processElement(el);
    });
  }

  processElement(el) {
    // Skip if already processed or is special element
    if (el.hasAttribute('data-dark-mode-processed')) return;

    // Check text contrast and fix if needed
    if (this.settings.textContrast) {
      this.ensureTextReadability(el);
    }

    // Preserve fonts on special elements
    if (this.settings.preserveFonts) {
      this.preserveFontIfNeeded(el);
    }

    // Mark as processed
    el.setAttribute('data-dark-mode-processed', 'true');
  }

  ensureTextReadability(el) {
    // Skip elements without text
    if (!el.textContent || el.textContent.trim().length === 0) return;

    // Get computed colors
    const computed = window.getComputedStyle(el);
    const bgColor = this.parseColor(computed.backgroundColor);
    const textColor = this.parseColor(computed.color);

    // Calculate contrast ratio
    const contrast = this.calculateContrastRatio(bgColor, textColor);

    // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
    const minContrast = this.isLargeText(computed) ? 3 : 4.5;

    if (contrast < minContrast) {
      // Adjust text color for better contrast
      const newTextColor = this.adjustTextColor(bgColor, minContrast);
      el.style.setProperty('color', newTextColor, 'important');
    }
  }

  parseColor(colorStr) {
    // Parse rgb/rgba color string to array [r, g, b, a]
    const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!match) return [0, 0, 0, 1];

    return [
      parseInt(match[1]),
      parseInt(match[2]),
      parseInt(match[3]),
      match[4] ? parseFloat(match[4]) : 1
    ];
  }

  calculateContrastRatio(color1, color2) {
    const l1 = this.relativeLuminance(color1);
    const l2 = this.relativeLuminance(color2);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  relativeLuminance([r, g, b]) {
    // Convert to relative luminance
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  isLargeText(computed) {
    const fontSize = parseFloat(computed.fontSize);
    const fontWeight = computed.fontWeight;

    // Large text is 18pt+ (24px+) or 14pt+ (18.66px+) bold
    return fontSize >= 24 || (fontSize >= 18.66 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700));
  }

  adjustTextColor(bgColor, targetContrast) {
    const bgLuminance = this.relativeLuminance(bgColor);

    // If background is dark, use light text; if light, use dark text
    if (bgLuminance < 0.5) {
      // Dark background - use light text
      return '#e8e6e3';
    } else {
      // Light background - use dark text
      return '#1f1f1f';
    }
  }

  preserveFontIfNeeded(el) {
    // For Google Docs and similar editors, preserve fonts
    if (this.siteRules.isGoogleEditor) {
      const preserveSelectors = this.siteRules.fontPreserveSelectors;

      for (const selector of preserveSelectors) {
        if (el.matches(selector)) {
          // Remove font-family override
          const originalFont = window.getComputedStyle(el).fontFamily;
          el.style.setProperty('font-family', originalFont, 'important');

          // Also preserve any inline color styles set by user
          const inlineColor = el.style.color;
          if (inlineColor) {
            el.style.setProperty('color', inlineColor, 'important');
          }
          break;
        }
      }
    }
  }

  processIframes() {
    const iframes = document.querySelectorAll('iframe');

    iframes.forEach(iframe => {
      if (this.processedIframes.has(iframe)) return;
      this.processedIframes.add(iframe);

      try {
        // Wait for iframe to load
        iframe.addEventListener('load', () => {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc) {
              // Inject styles into iframe
              this.injectStylesIntoDocument(iframeDoc);
              this.processElements(iframeDoc.body);
              this.processShadowRoots(iframeDoc.body);
            }
          } catch (err) {
            // Cross-origin iframe, can't access
            console.debug('Cannot access iframe:', err);
          }
        });
      } catch (err) {
        console.debug('Error processing iframe:', err);
      }
    });
  }

  injectStylesIntoDocument(doc) {
    if (!doc || doc.getElementById('universal-dark-mode-base')) return;

    const style = doc.createElement('style');
    style.id = 'universal-dark-mode-base';

    const intensity = this.settings.intensity;
    const bgColor = this.calculateBgColor(intensity);
    const textColor = '#e8e6e3';

    style.textContent = `
      html, body {
        background-color: ${bgColor} !important;
        color: ${textColor} !important;
      }
    `;

    doc.head?.appendChild(style);
  }

  processShadowRoots(root) {
    if (!root) return;

    const elements = root.querySelectorAll('*');

    elements.forEach(el => {
      if (el.shadowRoot && !this.processedShadowRoots.has(el.shadowRoot)) {
        this.processedShadowRoots.add(el.shadowRoot);

        // Inject styles into shadow DOM
        const style = document.createElement('style');
        style.textContent = this.getShadowDOMStyles();
        el.shadowRoot.appendChild(style);

        // Process elements in shadow DOM
        this.processElements(el.shadowRoot);

        // Recursively process nested shadow DOMs
        this.processShadowRoots(el.shadowRoot);
      }
    });
  }

  getShadowDOMStyles() {
    const intensity = this.settings.intensity;
    const bgColor = this.calculateBgColor(intensity);
    const textColor = '#e8e6e3';

    return `
      :host {
        background-color: ${bgColor} !important;
        color: ${textColor} !important;
      }

      * {
        background-color: ${bgColor} !important;
        color: ${textColor} !important;
      }
    `;
  }

  setupMutationObserver() {
    // Observe DOM changes to catch dynamically added content
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.processElement(node);
            this.processElements(node);
            this.processShadowRoots(node);

            // Check for new iframes
            if (node.tagName === 'IFRAME' && this.settings.handleIframes) {
              this.processIframes();
            }
          }
        });
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  destroy() {
    // Clean up
    if (this.observer) {
      this.observer.disconnect();
    }

    const style = document.getElementById('universal-dark-mode-base');
    if (style) {
      style.remove();
    }

    // Remove all processed markers
    document.querySelectorAll('[data-dark-mode-processed]').forEach(el => {
      el.removeAttribute('data-dark-mode-processed');
    });
  }
}

// Initialize dark mode
const darkMode = new DarkModeManager();

// Listen for settings changes
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleDarkMode') {
    if (message.enabled) {
      location.reload();
    } else {
      darkMode.destroy();
    }
  } else if (message.action === 'updateSettings') {
    darkMode.settings = { ...darkMode.settings, ...message.settings };
    location.reload(); // Reload to apply new settings
  }
});
