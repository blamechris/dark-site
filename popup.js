// Popup script for Universal Dark Mode extension

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

// Load current settings
async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
    const settings = response || defaultSettings;

    // Update UI
    enableToggle.checked = settings.enabled;
    intensitySlider.value = Math.round(settings.intensity * 100);
    intensityValue.textContent = `${Math.round(settings.intensity * 100)}%`;
    preserveFontsCheckbox.checked = settings.preserveFonts;
    handleIframesCheckbox.checked = settings.handleIframes;
    textContrastCheckbox.checked = settings.textContrast;
  } catch (err) {
    console.error('Error loading settings:', err);
    showStatus('Error loading settings', 'error');
  }
}

// Save settings
async function saveSettings() {
  const settings = {
    enabled: enableToggle.checked,
    intensity: parseInt(intensitySlider.value) / 100,
    preserveFonts: preserveFontsCheckbox.checked,
    handleIframes: handleIframesCheckbox.checked,
    textContrast: textContrastCheckbox.checked
  };

  try {
    await chrome.runtime.sendMessage({
      action: 'saveSettings',
      settings: settings
    });

    showStatus('Settings saved! Reload pages to apply.', 'success');
  } catch (err) {
    console.error('Error saving settings:', err);
    showStatus('Error saving settings', 'error');
  }
}

// Reset to defaults
async function resetToDefaults() {
  try {
    await chrome.runtime.sendMessage({
      action: 'saveSettings',
      settings: defaultSettings
    });

    // Update UI
    await loadSettings();
    showStatus('Settings reset to defaults', 'success');
  } catch (err) {
    console.error('Error resetting settings:', err);
    showStatus('Error resetting settings', 'error');
  }
}

// Show status message
function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message show ${type}`;

  setTimeout(() => {
    statusMessage.classList.remove('show');
  }, 3000);
}

// Update intensity value display
intensitySlider.addEventListener('input', () => {
  intensityValue.textContent = `${intensitySlider.value}%`;
});

// Event listeners
saveButton.addEventListener('click', saveSettings);
resetButton.addEventListener('click', resetToDefaults);

// Auto-save on toggle change
enableToggle.addEventListener('change', async () => {
  const enabled = enableToggle.checked;

  try {
    await chrome.runtime.sendMessage({
      action: 'toggleDarkMode',
      enabled: enabled
    });

    showStatus(enabled ? 'Dark mode enabled' : 'Dark mode disabled', 'success');
  } catch (err) {
    console.error('Error toggling dark mode:', err);
    showStatus('Error toggling dark mode', 'error');
  }
});

// Load settings when popup opens
document.addEventListener('DOMContentLoaded', loadSettings);
