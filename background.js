// Universal Dark Mode Background Service Worker

// Install event - set default settings
chrome.runtime.onInstalled.addListener(async () => {
  const defaultSettings = {
    enabled: true,
    intensity: 0.95,
    preserveFonts: true,
    handleIframes: true,
    textContrast: true
  };

  // Check if settings already exist
  const stored = await chrome.storage.sync.get('darkModeSettings');
  if (!stored.darkModeSettings) {
    await chrome.storage.sync.set({ darkModeSettings: defaultSettings });
  }

  console.log('Universal Dark Mode extension installed');
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getSettings') {
    chrome.storage.sync.get('darkModeSettings', (data) => {
      sendResponse(data.darkModeSettings || {});
    });
    return true; // Keep channel open for async response
  }

  if (message.action === 'saveSettings') {
    chrome.storage.sync.set({ darkModeSettings: message.settings }, () => {
      // Notify all tabs about settings change
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            action: 'updateSettings',
            settings: message.settings
          }).catch(() => {
            // Tab might not have content script loaded
          });
        });
      });

      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === 'toggleDarkMode') {
    chrome.storage.sync.get('darkModeSettings', (data) => {
      const settings = data.darkModeSettings || {};
      settings.enabled = message.enabled;

      chrome.storage.sync.set({ darkModeSettings: settings }, () => {
        // Notify all tabs
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
              action: 'toggleDarkMode',
              enabled: message.enabled
            }).catch(() => {
              // Tab might not have content script loaded
            });
          });
        });

        sendResponse({ success: true });
      });
    });
    return true;
  }
});

// Handle toolbar icon click
chrome.action.onClicked.addListener(async (tab) => {
  // Toggle dark mode for current tab
  const stored = await chrome.storage.sync.get('darkModeSettings');
  const settings = stored.darkModeSettings || { enabled: true };

  settings.enabled = !settings.enabled;
  await chrome.storage.sync.set({ darkModeSettings: settings });

  // Notify the tab
  chrome.tabs.sendMessage(tab.id, {
    action: 'toggleDarkMode',
    enabled: settings.enabled
  }).catch(() => {
    // If content script not loaded, reload the page
    chrome.tabs.reload(tab.id);
  });
});
