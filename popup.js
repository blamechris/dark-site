// Popup script for Universal Dark Mode extension
// Improved with better error handling and input validation

// DOM elements
const enableToggle = document.getElementById('enableToggle');
const intensitySlider = document.getElementById('intensitySlider');
const intensityValue = document.getElementById('intensityValue');
const preserveFontsCheckbox = document.getElementById('preserveFonts');
const handleIframesCheckbox = document.getElementById('handleIframes');
const textContrastCheckbox = document.getElementById('textContrast');
const saveButton = document.getElementById('saveButton');
const resetButton = document.getElementById('resetButton');
const statusMessage = document.getElementById('statusMessage');

// Default settings
const defaultSettings = {
  enabled: true,
  intensity: 0.95,
  preserveFonts: true,
  handleIframes: true,
  textContrast: true
};

// Debounce timer for toggle changes
let toggleDebounceTimer = null;

// Load current settings with error handling and validation
async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getSettings' });

    // Validate response
    const settings = (response && Object.keys(response).length > 0)
      ? { ...defaultSettings, ...response }
      : defaultSettings;

    // Update UI with null checks
    if (enableToggle) {
      enableToggle.checked = Boolean(settings.enabled);
    }

    if (intensitySlider && intensityValue) {
      const intensityPercent = Math.max(0, Math.min(100, Math.round(settings.intensity * 100)));
      intensitySlider.value = intensityPercent;
      intensityValue.textContent = `${intensityPercent}%`;
      intensitySlider.setAttribute('aria-valuetext', `${intensityPercent} percent`);
    }

    if (preserveFontsCheckbox) {
      preserveFontsCheckbox.checked = Boolean(settings.preserveFonts);
    }

    if (handleIframesCheckbox) {
      handleIframesCheckbox.checked = Boolean(settings.handleIframes);
    }

    if (textContrastCheckbox) {
      textContrastCheckbox.checked = Boolean(settings.textContrast);
    }
  } catch (err) {
    console.error('Error loading settings:', err);
    showStatus('Error loading settings. Using defaults.', 'error');

    // Load defaults on error
    if (enableToggle) enableToggle.checked = defaultSettings.enabled;
    if (intensitySlider) intensitySlider.value = defaultSettings.intensity * 100;
    if (intensityValue) intensityValue.textContent = `${defaultSettings.intensity * 100}%`;
    if (preserveFontsCheckbox) preserveFontsCheckbox.checked = defaultSettings.preserveFonts;
    if (handleIframesCheckbox) handleIframesCheckbox.checked = defaultSettings.handleIframes;
    if (textContrastCheckbox) textContrastCheckbox.checked = defaultSettings.textContrast;
  }
}

// Save settings with validation
async function saveSettings() {
  if (!validateUIElements()) {
    showStatus('UI elements not found', 'error');
    return;
  }

  // Validate and clamp intensity value
  const intensityValue = Math.max(0, Math.min(100, parseInt(intensitySlider.value, 10) || 95));

  const settings = {
    enabled: Boolean(enableToggle.checked),
    intensity: intensityValue / 100,
    preserveFonts: Boolean(preserveFontsCheckbox.checked),
    handleIframes: Boolean(handleIframesCheckbox.checked),
    textContrast: Boolean(textContrastCheckbox.checked)
  };

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'saveSettings',
      settings: settings
    });

    if (response && response.error) {
      showStatus(`Error: ${response.error}`, 'error');
    } else {
      const tabInfo = response && typeof response.updated === 'number'
        ? ` (${response.updated} tab${response.updated !== 1 ? 's' : ''} updated)`
        : '';
      showStatus(`Settings saved!${tabInfo}`, 'success');
    }
  } catch (err) {
    console.error('Error saving settings:', err);
    showStatus('Error saving settings', 'error');
  }
}

// Reset to defaults
async function resetToDefaults() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'saveSettings',
      settings: defaultSettings
    });

    if (response && response.error) {
      showStatus(`Error: ${response.error}`, 'error');
      return;
    }

    // Update UI
    await loadSettings();
    showStatus('Settings reset to defaults', 'success');
  } catch (err) {
    console.error('Error resetting settings:', err);
    showStatus('Error resetting settings', 'error');
  }
}

// Validate UI elements exist
function validateUIElements() {
  return enableToggle && intensitySlider && intensityValue &&
         preserveFontsCheckbox && handleIframesCheckbox && textContrastCheckbox;
}

// Show status message
function showStatus(message, type) {
  if (!statusMessage) return;

  statusMessage.textContent = message;
  statusMessage.className = `status-message show ${type}`;

  setTimeout(() => {
    statusMessage.classList.remove('show');
  }, 3000);
}

// Update intensity value display
if (intensitySlider && intensityValue) {
  intensitySlider.addEventListener('input', () => {
    const value = Math.max(0, Math.min(100, parseInt(intensitySlider.value, 10)));
    intensityValue.textContent = `${value}%`;
    intensitySlider.setAttribute('aria-valuetext', `${value} percent`);
  });
}

// Event listeners
if (saveButton) {
  saveButton.addEventListener('click', saveSettings);
}

if (resetButton) {
  resetButton.addEventListener('click', resetToDefaults);
}

// Auto-save on toggle change with debouncing
if (enableToggle) {
  enableToggle.addEventListener('change', async () => {
    const enabled = enableToggle.checked;

    // Debounce rapid toggles
    if (toggleDebounceTimer) {
      clearTimeout(toggleDebounceTimer);
    }

    toggleDebounceTimer = setTimeout(async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'toggleDarkMode',
          enabled: enabled
        });

        if (response && response.error) {
          showStatus(`Error: ${response.error}`, 'error');
          // Revert toggle on error
          enableToggle.checked = !enabled;
        } else {
          const tabInfo = response && typeof response.updated === 'number'
            ? ` (${response.updated} tab${response.updated !== 1 ? 's' : ''} updated)`
            : '';
          showStatus(
            enabled ? `Dark mode enabled${tabInfo}` : `Dark mode disabled${tabInfo}`,
            'success'
          );
        }
      } catch (err) {
        console.error('Error toggling dark mode:', err);
        showStatus('Error toggling dark mode', 'error');
        // Revert toggle on error
        enableToggle.checked = !enabled;
      }
      toggleDebounceTimer = null;
    }, 150);
  });
}

// Load settings when popup opens
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadSettings);
} else {
  loadSettings();
}
