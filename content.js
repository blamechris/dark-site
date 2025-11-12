// Content script for Dark Site extension
// This script is injected into all web pages and applies dark mode filters

(function() {
  'use strict';

  const STYLE_ID = 'dark-site-filter';
  const CONFIG_KEY = 'darkSiteConfig';

  // Default configuration
  let config = {
    enabled: true,
    brightness: 100,
    contrast: 90,
    sepia: 10,
    grayscale: 0
  };

  // Sites where dark mode is disabled
  let disabledSites = [];

  // Check if current site is disabled
  function isCurrentSiteDisabled() {
    const hostname = window.location.hostname;
    return disabledSites.some(site => hostname.includes(site));
  }

  // Create or update the dark mode style
  function applyDarkMode() {
    if (!config.enabled || isCurrentSiteDisabled()) {
      removeDarkMode();
      return;
    }

    const existingStyle = document.getElementById(STYLE_ID);
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = STYLE_ID;
    
    // Calculate filter values
    const brightness = config.brightness / 100;
    const contrast = config.contrast / 100;
    const sepia = config.sepia / 100;
    const grayscale = config.grayscale / 100;

    // Create CSS filter for dark mode
    // This inverts the colors and then inverts them back for images/videos
    style.textContent = `
      html {
        background-color: #181818 !important;
      }
      
      html, body {
        background-color: #181818 !important;
      }
      
      html {
        filter: invert(${0.9}) hue-rotate(180deg) contrast(${contrast}) brightness(${brightness}) sepia(${sepia}) grayscale(${grayscale}) !important;
      }
      
      /* Prevent double inversion on media elements */
      img, video, iframe, canvas, 
      [style*="background-image"],
      svg,
      .no-dark-mode {
        filter: invert(${1/0.9}) hue-rotate(180deg) !important;
      }
      
      /* Fix for pre-existing dark backgrounds */
      body {
        background-color: #181818 !important;
      }
    `;

    // Insert style as early as possible
    const insertionPoint = document.head || document.documentElement;
    if (insertionPoint) {
      insertionPoint.insertBefore(style, insertionPoint.firstChild);
    }
  }

  // Remove dark mode styling
  function removeDarkMode() {
    const existingStyle = document.getElementById(STYLE_ID);
    if (existingStyle) {
      existingStyle.remove();
    }
  }

  // Load configuration from storage
  async function loadConfig() {
    try {
      const result = await chrome.storage.sync.get([CONFIG_KEY, 'disabledSites']);
      if (result[CONFIG_KEY]) {
        config = { ...config, ...result[CONFIG_KEY] };
      }
      if (result.disabledSites) {
        disabledSites = result.disabledSites;
      }
      applyDarkMode();
    } catch (error) {
      console.error('Dark Site: Error loading config', error);
      applyDarkMode();
    }
  }

  // Listen for configuration changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
      if (changes[CONFIG_KEY]) {
        config = { ...config, ...changes[CONFIG_KEY].newValue };
        applyDarkMode();
      }
      if (changes.disabledSites) {
        disabledSites = changes.disabledSites.newValue || [];
        applyDarkMode();
      }
    }
  });

  // Listen for messages from popup/background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleDarkMode') {
      config.enabled = request.enabled;
      applyDarkMode();
      sendResponse({ success: true });
    } else if (request.action === 'updateConfig') {
      config = { ...config, ...request.config };
      applyDarkMode();
      sendResponse({ success: true });
    } else if (request.action === 'getConfig') {
      sendResponse({ config, hostname: window.location.hostname });
    }
    return true;
  });

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadConfig);
  } else {
    loadConfig();
  }

  // Also apply immediately to prevent flash
  applyDarkMode();

  // Watch for dynamic content changes
  const observer = new MutationObserver(() => {
    if (!document.getElementById(STYLE_ID) && config.enabled && !isCurrentSiteDisabled()) {
      applyDarkMode();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: false
  });
})();
