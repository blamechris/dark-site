// Universal Dark Mode Background Service Worker
// Redesigned with proper error handling and storage fallback

// Install event - set default settings with error handling
chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    const defaultSettings = {
      enabled: true,
      intensity: 0.95,
      preserveFonts: true,
      handleIframes: true,
      textContrast: true
    };

    // Check if settings already exist
    const stored = await chrome.storage.sync.get('darkModeSettings');

    if (details.reason === 'update') {
      // Migrate old settings to new schema if needed
      const migrated = migrateSettings(stored.darkModeSettings, details.previousVersion);
      await chrome.storage.sync.set({ darkModeSettings: migrated });
    } else if (!stored.darkModeSettings || Object.keys(stored.darkModeSettings).length === 0) {
      // Fresh install - use defaults
      await chrome.storage.sync.set({ darkModeSettings: defaultSettings });
    }

    console.log('Universal Dark Mode extension installed/updated successfully');
  } catch (err) {
    // If sync storage fails, try local storage
    console.warn('Failed to initialize sync storage, falling back to local:', err);

    try {
      const defaultSettings = {
        enabled: true,
        intensity: 0.95,
        preserveFonts: true,
        handleIframes: true,
        textContrast: true
      };
      await chrome.storage.local.set({ darkModeSettings: defaultSettings });
    } catch (localErr) {
      console.error('Failed to initialize local storage:', localErr);
    }
  }
});

// Settings migration for future versions
function migrateSettings(settings, fromVersion) {
  if (!settings) return null;

  // Add migration logic here for future versions
  // Example: if (fromVersion === '1.0.0') { ... }

  return settings;
}

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Validate message structure
  if (!message || typeof message !== 'object' || !message.action) {
    sendResponse({ error: 'Invalid message format' });
    return true;
  }

  if (message.action === 'getSettings') {
    getSettings().then(settings => {
      sendResponse(settings || {});
    }).catch(err => {
      console.error('Error getting settings:', err);
      sendResponse({});
    });
    return true; // Keep channel open for async response
  }

  if (message.action === 'saveSettings') {
    if (!validateSettings(message.settings)) {
      sendResponse({ error: 'Invalid settings' });
      return true;
    }

    saveSettings(message.settings).then(success => {
      if (success) {
        // Notify all tabs about settings change
        notifyAllTabs({
          action: 'updateSettings',
          settings: message.settings
        }).then(results => {
          sendResponse({
            success: true,
            updated: results.succeeded,
            failed: results.failed
          });
        });
      } else {
        sendResponse({ error: 'Failed to save settings' });
      }
    });
    return true;
  }

  if (message.action === 'toggleDarkMode') {
    if (typeof message.enabled !== 'boolean') {
      sendResponse({ error: 'Invalid enabled value' });
      return true;
    }

    getSettings().then(settings => {
      settings.enabled = message.enabled;

      saveSettings(settings).then(success => {
        if (success) {
          // Notify all tabs
          notifyAllTabs({
            action: 'toggleDarkMode',
            enabled: message.enabled
          }).then(results => {
            sendResponse({
              success: true,
              updated: results.succeeded,
              failed: results.failed
            });
          });
        } else {
          sendResponse({ error: 'Failed to save enabled state' });
        }
      });
    });
    return true;
  }

  sendResponse({ error: 'Unknown action' });
  return true;
});

// Helper: Get settings with fallback
async function getSettings() {
  try {
    const stored = await chrome.storage.sync.get('darkModeSettings');
    return stored.darkModeSettings || {};
  } catch (err) {
    // Fallback to local storage
    try {
      const stored = await chrome.storage.local.get('darkModeSettings');
      return stored.darkModeSettings || {};
    } catch (localErr) {
      console.error('Failed to get settings:', localErr);
      return {};
    }
  }
}

// Helper: Save settings with fallback
async function saveSettings(settings) {
  try {
    await chrome.storage.sync.set({ darkModeSettings: settings });
    return true;
  } catch (err) {
    // Check if quota exceeded
    if (err.message && err.message.includes('QUOTA')) {
      console.warn('Sync storage quota exceeded, using local storage');
    }

    // Fallback to local storage
    try {
      await chrome.storage.local.set({ darkModeSettings: settings });
      return true;
    } catch (localErr) {
      console.error('Failed to save settings:', localErr);
      return false;
    }
  }
}

// Helper: Validate settings
function validateSettings(settings) {
  if (typeof settings !== 'object' || settings === null) return false;

  // Validate each field if present
  if ('intensity' in settings) {
    if (typeof settings.intensity !== 'number' || settings.intensity < 0 || settings.intensity > 1) {
      return false;
    }
  }

  if ('enabled' in settings && typeof settings.enabled !== 'boolean') return false;
  if ('preserveFonts' in settings && typeof settings.preserveFonts !== 'boolean') return false;
  if ('handleIframes' in settings && typeof settings.handleIframes !== 'boolean') return false;
  if ('textContrast' in settings && typeof settings.textContrast !== 'boolean') return false;

  return true;
}

// Helper: Notify all tabs with retry logic
async function notifyAllTabs(message) {
  const tabs = await chrome.tabs.query({});
  const results = {
    succeeded: 0,
    failed: 0
  };

  const promises = tabs.map(async (tab) => {
    try {
      await chrome.tabs.sendMessage(tab.id, message);
      results.succeeded++;
    } catch (err) {
      results.failed++;
      // Tab might not have content script loaded (chrome:// pages, PDF viewer, etc.)
      // This is expected and not an error
    }
  });

  await Promise.allSettled(promises);
  return results;
}

// REMOVED: Conflicting action.onClicked handler (Fix H13)
// The manifest defines default_popup, so this handler would never fire
// Removed to eliminate dead code and confusion
