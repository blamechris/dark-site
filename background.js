// Background service worker for Dark Site extension

const CONFIG_KEY = 'darkSiteConfig';

// Default configuration
const defaultConfig = {
  enabled: true,
  brightness: 100,
  contrast: 90,
  sepia: 10,
  grayscale: 0
};

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Dark Site extension installed');
  
  // Set default configuration if not exists
  const result = await chrome.storage.sync.get([CONFIG_KEY]);
  if (!result[CONFIG_KEY]) {
    await chrome.storage.sync.set({ 
      [CONFIG_KEY]: defaultConfig,
      disabledSites: []
    });
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  // This is handled by the popup, but we keep this for fallback
  console.log('Extension icon clicked for tab:', tab.id);
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getConfig') {
    chrome.storage.sync.get([CONFIG_KEY, 'disabledSites'], (result) => {
      sendResponse({
        config: result[CONFIG_KEY] || defaultConfig,
        disabledSites: result.disabledSites || []
      });
    });
    return true; // Will respond asynchronously
  } else if (request.action === 'saveConfig') {
    chrome.storage.sync.set({ [CONFIG_KEY]: request.config }, () => {
      sendResponse({ success: true });
    });
    return true;
  } else if (request.action === 'toggleSite') {
    chrome.storage.sync.get(['disabledSites'], (result) => {
      let disabledSites = result.disabledSites || [];
      const hostname = request.hostname;
      
      if (request.disabled) {
        // Add to disabled list
        if (!disabledSites.includes(hostname)) {
          disabledSites.push(hostname);
        }
      } else {
        // Remove from disabled list
        disabledSites = disabledSites.filter(site => site !== hostname);
      }
      
      chrome.storage.sync.set({ disabledSites }, () => {
        sendResponse({ success: true, disabledSites });
      });
    });
    return true;
  }
});

console.log('Dark Site background script loaded');
