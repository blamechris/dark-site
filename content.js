// Universal Dark Mode Content Script - Redesigned Architecture
// Handles dark mode injection with smart text readability and site-specific rules
// Fixes: C1-C4, C7, and all high-severity issues

class DarkModeManager {
  constructor() {
    this.settings = {
      enabled: true,
      intensity: 0.95,
      preserveFonts: true,
      handleIframes: true,
      textContrast: true
    };

    this.siteRules = this.initializeSiteRules();
    this.observer = null;
    this.processedIframes = new WeakSet();
    this.processedShadowRoots = new WeakSet();
    this.processedElements = new WeakSet();
    this.eventListeners = []; // Track for cleanup
    this.debounceTimer = null;
    this.pendingNodes = new Set();
    this.styleElement = null;

    // Original element data storage for font preservation
    this.originalStyles = new WeakMap();
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
                    hostname.includes('codesandbox.io') ||
                    hostname.includes('github.com'),

      // Selectors to exclude from dark mode processing
      excludeSelectors: [
        'img', 'video', 'canvas', 'svg',
        'iframe[src*="youtube"]',
        'iframe[src*="vimeo"]',
        '[role="img"]'
      ],

      // Selectors to preserve fonts (for Google Docs, etc.)
      fontPreserveSelectors: [
        '[contenteditable="true"]',
        '.docs-texteditorbubble-text',
        '.cell-input',
        '.kix-canvas-tile-content',
        '.kix-wordhtmlgenerator-word-node'
      ],

      // Preserve syntax highlighting in code blocks
      codeSelectors: [
        'pre', 'code',
        '.hljs', '.highlight',
        '[class*="language-"]',
        '[class*="token"]'
      ]
    };
  }

  async init() {
    // Load settings from storage with fallback
    try {
      const stored = await chrome.storage.sync.get('darkModeSettings');
      if (stored.darkModeSettings) {
        this.settings = { ...this.settings, ...this.validateSettings(stored.darkModeSettings) };
      }
    } catch (err) {
      // Fallback to local storage if sync fails
      try {
        const stored = await chrome.storage.local.get('darkModeSettings');
        if (stored.darkModeSettings) {
          this.settings = { ...this.settings, ...this.validateSettings(stored.darkModeSettings) };
        }
      } catch (localErr) {
        console.warn('Could not load dark mode settings, using defaults');
      }
    }

    if (!this.settings.enabled) return;

    // Inject base CSS immediately (before document.body exists)
    this.injectBaseStyles();

    // Wait for DOM to be ready before processing
    if (document.readyState === 'loading') {
      const domLoadHandler = () => this.processDocument();
      document.addEventListener('DOMContentLoaded', domLoadHandler);
      this.eventListeners.push({ target: document, type: 'DOMContentLoaded', handler: domLoadHandler });
    } else {
      this.processDocument();
    }

    // Set up mutation observer for dynamic content (wait for body)
    this.waitForBody(() => this.setupMutationObserver());
  }

  // Validate settings to prevent injection attacks
  validateSettings(settings) {
    const safe = {};
    if (typeof settings.enabled === 'boolean') safe.enabled = settings.enabled;
    if (typeof settings.intensity === 'number' && settings.intensity >= 0 && settings.intensity <= 1) {
      safe.intensity = settings.intensity;
    }
    if (typeof settings.preserveFonts === 'boolean') safe.preserveFonts = settings.preserveFonts;
    if (typeof settings.handleIframes === 'boolean') safe.handleIframes = settings.handleIframes;
    if (typeof settings.textContrast === 'boolean') safe.textContrast = settings.textContrast;
    return safe;
  }

  // Wait for document.body to exist (Fix C3)
  waitForBody(callback) {
    if (document.body) {
      callback();
    } else {
      requestAnimationFrame(() => this.waitForBody(callback));
    }
  }

  // REDESIGNED: Targeted CSS instead of universal selector (Fix C1)
  injectBaseStyles() {
    if (this.styleElement) return; // Already injected

    this.styleElement = document.createElement('style');
    this.styleElement.id = 'universal-dark-mode-base';

    const intensity = Math.max(0, Math.min(1, this.settings.intensity || 0.95));
    const bgColor = this.calculateBgColor(intensity);
    const textColor = '#e8e6e3';
    const linkColor = '#8ab4f8';
    const borderColor = '#3c4043';

    // HYBRID APPROACH: Targeted selectors + CSS custom properties + lower specificity
    this.styleElement.textContent = `
      /* CSS Custom Properties for easy theming */
      :root {
        --dark-bg: ${bgColor};
        --dark-text: ${textColor};
        --dark-link: ${linkColor};
        --dark-border: ${borderColor};
        --dark-input-bg: #202124;
        --dark-button-bg: #303134;
        --dark-code-bg: #1e1e1e;
      }

      /* Base elements - NO universal selector! */
      html {
        background-color: var(--dark-bg) !important;
      }

      body {
        background-color: var(--dark-bg) !important;
        color: var(--dark-text) !important;
      }

      /* Common layout elements - targeted approach */
      div, span, p, h1, h2, h3, h4, h5, h6,
      article, section, aside, header, footer, nav, main,
      ul, ol, li, dl, dt, dd,
      table, thead, tbody, tfoot, tr, th, td,
      form, fieldset, legend, label {
        background-color: var(--dark-bg);
        color: var(--dark-text);
        border-color: var(--dark-border);
      }

      /* Links */
      a {
        color: var(--dark-link) !important;
      }

      a:visited {
        color: var(--dark-link) !important;
      }

      a:hover {
        color: #aecbfa !important;
      }

      /* Form elements */
      input:not([type="image"]),
      textarea,
      select {
        background-color: var(--dark-input-bg) !important;
        color: var(--dark-text) !important;
        border-color: var(--dark-border) !important;
      }

      input::placeholder,
      textarea::placeholder {
        color: #9aa0a6 !important;
      }

      /* Buttons - lower specificity for site overrides */
      button,
      input[type="button"],
      input[type="submit"],
      input[type="reset"] {
        background-color: var(--dark-button-bg);
        color: var(--dark-text);
        border-color: var(--dark-border);
      }

      button:hover,
      input[type="button"]:hover,
      input[type="submit"]:hover,
      input[type="reset"]:hover {
        background-color: #3c4043;
      }

      /* Preserve media elements */
      img, video, canvas, svg, [role="img"],
      picture, source {
        background-color: transparent !important;
        filter: none !important;
      }

      /* Code blocks - preserve syntax highlighting colors */
      pre, code {
        background-color: var(--dark-code-bg);
      }

      /* Don't override syntax highlighting */
      pre code,
      .hljs, .highlight,
      [class*="language-"],
      [class*="token"] {
        background-color: transparent;
      }

      /* Scrollbars */
      ::-webkit-scrollbar {
        background-color: var(--dark-bg);
      }

      ::-webkit-scrollbar-thumb {
        background-color: #5f6368;
      }

      ::-webkit-scrollbar-thumb:hover {
        background-color: #80868b;
      }

      /* Print media - don't waste ink */
      @media print {
        html, body, * {
          background: white !important;
          color: black !important;
        }
      }

      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        * {
          transition: none !important;
          animation: none !important;
        }
      }
    `;

    // Inject into documentElement (exists before body)
    try {
      if (document.documentElement) {
        document.documentElement.appendChild(this.styleElement);
      } else if (document.head) {
        document.head.appendChild(this.styleElement);
      }
    } catch (err) {
      console.warn('Could not inject dark mode styles:', err);
    }
  }

  calculateBgColor(intensity) {
    // Ensure intensity is a valid number
    intensity = Math.max(0, Math.min(1, parseFloat(intensity) || 0.95));
    const value = Math.round((1 - intensity) * 40);
    return `rgb(${value}, ${value}, ${value})`;
  }

  processDocument() {
    if (!document.body) {
      console.warn('Document body not available yet');
      return;
    }

    // Store original styles for font preservation (before processing)
    if (this.settings.preserveFonts) {
      this.storeOriginalStyles(document.body);
    }

    // Process main document with optimized traversal
    this.processElementsOptimized(document.body);

    // Process iframes
    if (this.settings.handleIframes) {
      this.processIframes();
    }

    // Process shadow DOMs
    this.processShadowRoots(document.body);
  }

  // Store original styles before dark mode is applied (Fix C2)
  storeOriginalStyles(root) {
    if (!root) return;

    const preserveSelectors = this.siteRules.fontPreserveSelectors;
    preserveSelectors.forEach(selector => {
      try {
        const elements = root.querySelectorAll(selector);
        elements.forEach(el => {
          if (!this.originalStyles.has(el)) {
            const computed = window.getComputedStyle(el);
            this.originalStyles.set(el, {
              fontFamily: computed.fontFamily,
              color: el.style.color || computed.color,
              backgroundColor: el.style.backgroundColor || computed.backgroundColor
            });
          }
        });
      } catch (err) {
        // Selector might not be valid
      }
    });
  }

  // OPTIMIZED: Use TreeWalker instead of querySelectorAll('*') (Fix C7)
  processElementsOptimized(root) {
    if (!root) return;

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          // Skip already processed
          if (this.processedElements.has(node)) {
            return NodeFilter.FILTER_SKIP;
          }
          // Skip excluded elements
          if (this.shouldExcludeElement(node)) {
            return NodeFilter.FILTER_SKIP;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const batch = [];
    let node;

    while (node = walker.nextNode()) {
      batch.push(node);

      // Process in batches to avoid blocking
      if (batch.length >= 100) {
        this.processBatch(batch.splice(0));
      }
    }

    // Process remaining
    if (batch.length > 0) {
      this.processBatch(batch);
    }
  }

  // Process batch of elements with requestIdleCallback
  processBatch(elements) {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        elements.forEach(el => this.processElement(el));
      }, { timeout: 1000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        elements.forEach(el => this.processElement(el));
      }, 0);
    }
  }

  shouldExcludeElement(el) {
    // Check against exclude selectors
    return this.siteRules.excludeSelectors.some(selector => {
      try {
        return el.matches(selector);
      } catch {
        return false;
      }
    });
  }

  processElement(el) {
    // Skip if already processed
    if (this.processedElements.has(el)) return;

    // Mark as processed
    this.processedElements.add(el);

    // Get computed styles once (Fix H10)
    const computed = window.getComputedStyle(el);

    // Check text contrast and fix if needed
    if (this.settings.textContrast && this.hasDirectTextContent(el)) {
      this.ensureTextReadability(el, computed);
    }

    // Preserve fonts on special elements
    if (this.settings.preserveFonts) {
      this.preserveFontIfNeeded(el, computed);
    }
  }

  // Only process elements with direct text content (not just descendants)
  hasDirectTextContent(el) {
    return Array.from(el.childNodes).some(
      node => node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0
    );
  }

  ensureTextReadability(el, computed = null) {
    computed = computed || window.getComputedStyle(el);

    const bgColor = this.parseColor(computed.backgroundColor);
    const textColor = this.parseColor(computed.color);

    // Calculate contrast ratio
    const contrast = this.calculateContrastRatio(bgColor, textColor);

    // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
    const minContrast = this.isLargeText(computed) ? 3 : 4.5;

    if (contrast < minContrast) {
      // Adjust text color for better contrast
      const newTextColor = this.adjustTextColor(bgColor, minContrast);
      el.style.setProperty('color', newTextColor);
    }
  }

  // COMPREHENSIVE COLOR PARSING (Fix C4)
  parseColor(colorStr) {
    if (!colorStr || colorStr === 'transparent') {
      return [0, 0, 0, 0];
    }

    // Handle rgb/rgba format
    let match = colorStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
    if (match) {
      return [
        parseInt(match[1]),
        parseInt(match[2]),
        parseInt(match[3]),
        match[4] ? parseFloat(match[4]) : 1
      ];
    }

    // Handle hex format (#fff or #ffffff)
    match = colorStr.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
    if (match) {
      let hex = match[1];
      if (hex.length === 3) {
        // Expand shorthand (#fff -> #ffffff)
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      return [
        parseInt(hex.substr(0, 2), 16),
        parseInt(hex.substr(2, 2), 16),
        parseInt(hex.substr(4, 2), 16),
        1
      ];
    }

    // Handle hsl/hsla format
    match = colorStr.match(/hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+))?\s*\)/);
    if (match) {
      const h = parseFloat(match[1]) / 360;
      const s = parseFloat(match[2]) / 100;
      const l = parseFloat(match[3]) / 100;
      const a = match[4] ? parseFloat(match[4]) : 1;

      const rgb = this.hslToRgb(h, s, l);
      return [...rgb, a];
    }

    // Handle named colors by creating a temporary element
    try {
      const temp = document.createElement('div');
      temp.style.color = colorStr;
      document.body.appendChild(temp);
      const computed = window.getComputedStyle(temp).color;
      document.body.removeChild(temp);

      // Recursively parse the computed rgb value
      if (computed !== colorStr) {
        return this.parseColor(computed);
      }
    } catch (err) {
      // Ignore errors
    }

    // Default to white for unknown formats
    return [255, 255, 255, 1];
  }

  // HSL to RGB conversion
  hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  calculateContrastRatio(color1, color2) {
    const l1 = this.relativeLuminance(color1);
    const l2 = this.relativeLuminance(color2);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  // Handle alpha channel in luminance calculation
  relativeLuminance([r, g, b, a = 1]) {
    // Composite with white background if semi-transparent
    if (a < 1) {
      r = r * a + 255 * (1 - a);
      g = g * a + 255 * (1 - a);
      b = b * a + 255 * (1 - a);
    }

    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  isLargeText(computed) {
    const fontSize = parseFloat(computed.fontSize);
    if (isNaN(fontSize)) return false;

    const fontWeight = computed.fontWeight;
    let weightValue;

    if (fontWeight === 'bold' || fontWeight === 'bolder') {
      weightValue = 700;
    } else if (fontWeight === 'normal') {
      weightValue = 400;
    } else if (fontWeight === 'lighter') {
      weightValue = 300;
    } else {
      weightValue = parseInt(fontWeight, 10);
      if (isNaN(weightValue)) weightValue = 400;
    }

    // Large text is 18pt+ (24px+) or 14pt+ (18.66px+) bold
    return fontSize >= 24 || (fontSize >= 18.66 && weightValue >= 700);
  }

  adjustTextColor(bgColor, targetContrast) {
    // Candidate text colors with their RGB values for contrast calculation
    const candidates = [
      { hex: '#ffffff', rgb: [255, 255, 255, 1] },  // Pure white
      { hex: '#f0f0f0', rgb: [240, 240, 240, 1] },  // Light gray
      { hex: '#e8e6e3', rgb: [232, 230, 227, 1] },  // Warm light gray
      { hex: '#000000', rgb: [0, 0, 0, 1] },        // Pure black
      { hex: '#0a0a0a', rgb: [10, 10, 10, 1] },     // Near black
      { hex: '#1f1f1f', rgb: [31, 31, 31, 1] }      // Dark gray
    ];

    // Find all candidates that meet the target contrast
    const validCandidates = candidates.filter(candidate => {
      const contrast = this.calculateContrastRatio(bgColor, candidate.rgb);
      return contrast >= targetContrast;
    });

    // If we have valid candidates, return the first one (preference order)
    if (validCandidates.length > 0) {
      return validCandidates[0].hex;
    }

    // If no candidate meets the target, return the one with highest contrast
    let best = candidates[0];
    let bestContrast = this.calculateContrastRatio(bgColor, best.rgb);

    for (const candidate of candidates.slice(1)) {
      const contrast = this.calculateContrastRatio(bgColor, candidate.rgb);
      if (contrast > bestContrast) {
        best = candidate;
        bestContrast = contrast;
      }
    }

    return best.hex;
  }

  // FIXED: Preserve original fonts (Fix C2)
  preserveFontIfNeeded(el, computed = null) {
    if (!this.siteRules.isGoogleEditor && !this.siteRules.isCodeEditor) return;

    const preserveSelectors = this.siteRules.fontPreserveSelectors;

    for (const selector of preserveSelectors) {
      try {
        if (el.matches(selector)) {
          // Retrieve original styles stored before dark mode
          const original = this.originalStyles.get(el);

          if (original) {
            // Restore original font (without !important to allow user overrides)
            if (original.fontFamily) {
              el.style.fontFamily = original.fontFamily;
            }

            // Restore original color if user-set
            if (el.style.color && original.color) {
              el.style.setProperty('color', original.color);
            }
          }

          // Set up MutationObserver to preserve dynamically changed colors
          // (e.g., user changes text color in Google Docs after page load)
          this.observeInlineColorChanges(el);
          break;
        }
      } catch (err) {
        // Selector might not be valid
      }
    }
  }

  // Observe style changes to preserve user-set colors dynamically
  observeInlineColorChanges(el) {
    // Only set up one observer per element
    if (el.__darkModeColorObserver) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const inlineColor = el.style.color;
          if (inlineColor) {
            // Preserve the user's color choice
            el.style.setProperty('color', inlineColor);
          }
        }
      });
    });

    observer.observe(el, {
      attributes: true,
      attributeFilter: ['style']
    });

    // Store observer reference for cleanup
    el.__darkModeColorObserver = observer;
    this.eventListeners.push({
      target: el,
      type: 'observer',
      handler: observer
    });
  }

  // FIXED: Process already-loaded iframes + nested iframes (Fix H3)
  processIframes(doc = document) {
    if (!doc) return;

    const iframes = doc.querySelectorAll('iframe');

    iframes.forEach(iframe => {
      if (this.processedIframes.has(iframe)) return;
      this.processedIframes.add(iframe);

      const processIframeDoc = () => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc && iframeDoc.body) {
            this.injectStylesIntoDocument(iframeDoc);

            if (this.settings.preserveFonts) {
              this.storeOriginalStyles(iframeDoc.body);
            }

            this.processElementsOptimized(iframeDoc.body);
            this.processShadowRoots(iframeDoc.body);

            // Recursively process nested iframes
            this.processIframes(iframeDoc);
          }
        } catch (err) {
          // Expected for cross-origin iframes - don't log
        }
      };

      // Try to process immediately (if already loaded)
      processIframeDoc();

      // Also listen for future loads
      const loadHandler = processIframeDoc;
      iframe.addEventListener('load', loadHandler);
      this.eventListeners.push({ target: iframe, type: 'load', handler: loadHandler });
    });
  }

  injectStylesIntoDocument(doc) {
    if (!doc || doc.getElementById('universal-dark-mode-base')) return;

    // Create head if it doesn't exist
    if (!doc.head && doc.documentElement) {
      const head = doc.createElement('head');
      doc.documentElement.insertBefore(head, doc.body);
    }

    const style = doc.createElement('style');
    style.id = 'universal-dark-mode-base';

    const intensity = Math.max(0, Math.min(1, this.settings.intensity || 0.95));
    const bgColor = this.calculateBgColor(intensity);
    const textColor = '#e8e6e3';

    style.textContent = `
      html, body {
        background-color: ${bgColor} !important;
        color: ${textColor} !important;
      }
    `;

    if (doc.head) {
      doc.head.appendChild(style);
    } else if (doc.body) {
      doc.body.insertBefore(style, doc.body.firstChild);
    }
  }

  processShadowRoots(root) {
    if (!root) return;

    // More efficient: only check elements that commonly have shadow roots
    const potentialHosts = root.querySelectorAll(
      '[contenteditable], custom-element, [is], ' +
      'video, audio, input[type="range"], input[type="color"]'
    );

    potentialHosts.forEach(el => {
      if (el.shadowRoot && !this.processedShadowRoots.has(el.shadowRoot)) {
        this.processedShadowRoots.add(el.shadowRoot);

        // Inject styles into shadow DOM
        const style = document.createElement('style');
        style.textContent = this.getShadowDOMStyles();
        el.shadowRoot.appendChild(style);

        // Process elements in shadow DOM
        this.processElementsOptimized(el.shadowRoot);

        // Recursively process nested shadow DOMs
        this.processShadowRoots(el.shadowRoot);
      }
    });

    // Also check for custom elements (any element with hyphen in tag name)
    const customElements = Array.from(root.querySelectorAll('*')).filter(
      el => el.tagName.includes('-')
    );

    customElements.forEach(el => {
      if (el.shadowRoot && !this.processedShadowRoots.has(el.shadowRoot)) {
        this.processedShadowRoots.add(el.shadowRoot);

        const style = document.createElement('style');
        style.textContent = this.getShadowDOMStyles();
        el.shadowRoot.appendChild(style);

        this.processElementsOptimized(el.shadowRoot);
        this.processShadowRoots(el.shadowRoot);
      }
    });
  }

  getShadowDOMStyles() {
    const intensity = Math.max(0, Math.min(1, this.settings.intensity || 0.95));
    const bgColor = this.calculateBgColor(intensity);
    const textColor = '#e8e6e3';

    return `
      :host {
        background-color: ${bgColor};
        color: ${textColor};
      }

      div, span, p {
        background-color: ${bgColor};
        color: ${textColor};
      }
    `;
  }

  // DEBOUNCED MutationObserver (Fix C8, H1)
  setupMutationObserver() {
    if (!document.body) {
      console.warn('Cannot setup MutationObserver: body not available');
      return;
    }

    let processing = false;

    this.observer = new MutationObserver((mutations) => {
      // Collect all added nodes
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.pendingNodes.add(node);
          }
        });
      });

      // Debounce processing
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = setTimeout(() => {
        if (processing || this.pendingNodes.size === 0) return;

        processing = true;

        // Temporarily disconnect to prevent infinite loop
        this.observer.disconnect();

        const nodes = Array.from(this.pendingNodes);
        this.pendingNodes.clear();

        // Store original styles for new nodes
        if (this.settings.preserveFonts) {
          nodes.forEach(node => this.storeOriginalStyles(node));
        }

        // Process nodes
        nodes.forEach(node => {
          if (document.contains(node)) {
            this.processElement(node);
            this.processElementsOptimized(node);
            this.processShadowRoots(node);

            // Check for new iframes
            if (node.tagName === 'IFRAME' && this.settings.handleIframes) {
              this.processIframes();
            }
          }
        });

        // Reconnect observer
        this.observer.observe(document.body, {
          childList: true,
          subtree: true
        });

        processing = false;
      }, 50); // 50ms debounce
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // DYNAMIC UPDATE without reload (Fix H2)
  updateSettings(newSettings) {
    const validated = this.validateSettings(newSettings);
    this.settings = { ...this.settings, ...validated };

    // Re-inject styles with new settings
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }

    this.injectBaseStyles();

    // Clear processed elements to reprocess with new settings
    this.processedElements = new WeakSet();

    // Reprocess document
    if (document.body) {
      this.processElementsOptimized(document.body);
    }
  }

  // CLEANUP with event listener removal (Fix H9)
  destroy() {
    // Disconnect observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // Clear debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // Remove event listeners and MutationObservers
    this.eventListeners.forEach(({ target, type, handler }) => {
      try {
        if (type === 'observer') {
          // Disconnect MutationObserver
          handler.disconnect();
        } else {
          // Remove regular event listener
          target.removeEventListener(type, handler);
        }
      } catch (err) {
        // Target might be gone
      }
    });
    this.eventListeners = [];

    // Remove styles
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }

    // Clean up all dark mode markers
    const allStyles = document.querySelectorAll('#universal-dark-mode-base');
    allStyles.forEach(style => style.remove());

    // Clear WeakMaps and WeakSets
    this.processedElements = new WeakSet();
    this.processedIframes = new WeakSet();
    this.processedShadowRoots = new WeakSet();
    this.originalStyles = new WeakMap();
    this.pendingNodes.clear();
  }
}

// Initialize dark mode
let darkMode = new DarkModeManager();

// Listen for settings changes with proper response handling (Fix H4)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Validate sender (defense in depth, though not critical per validator)
  if (sender.id && sender.id !== chrome.runtime.id) {
    sendResponse({ error: 'Unauthorized' });
    return true;
  }

  if (message.action === 'toggleDarkMode') {
    if (typeof message.enabled !== 'boolean') {
      sendResponse({ error: 'Invalid enabled value' });
      return true;
    }

    if (message.enabled) {
      // Re-initialize instead of reload
      if (darkMode) darkMode.destroy();
      darkMode = new DarkModeManager();
      sendResponse({ success: true });
    } else {
      if (darkMode) darkMode.destroy();
      sendResponse({ success: true });
    }

    return true;
  } else if (message.action === 'updateSettings') {
    // Update settings dynamically without reload
    if (darkMode) {
      darkMode.updateSettings(message.settings);
      sendResponse({ success: true });
    } else {
      sendResponse({ error: 'Dark mode not initialized' });
    }

    return true;
  }

  return true;
});
