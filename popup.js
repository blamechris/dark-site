// Popup script for Dark Site extension

const CONFIG_KEY = 'darkSiteConfig';

// Get DOM elements
const enableToggle = document.getElementById('enableToggle');
const brightnessSlider = document.getElementById('brightness');
const contrastSlider = document.getElementById('contrast');
const sepiaSlider = document.getElementById('sepia');
const grayscaleSlider = document.getElementById('grayscale');

const brightnessValue = document.getElementById('brightnessValue');
const contrastValue = document.getElementById('contrastValue');
const sepiaValue = document.getElementById('sepiaValue');
const grayscaleValue = document.getElementById('grayscaleValue');

const currentSiteSpan = document.getElementById('currentSite');
const toggleSiteBtn = document.getElementById('toggleSiteBtn');

let currentHostname = '';
let disabledSites = [];

// Update value displays
function updateValueDisplays() {
  brightnessValue.textContent = brightnessSlider.value + '%';
  contrastValue.textContent = contrastSlider.value + '%';
  sepiaValue.textContent = sepiaSlider.value + '%';
  grayscaleValue.textContent = grayscaleSlider.value + '%';
}

// Save configuration to storage
async function saveConfig() {
  const config = {
    enabled: enableToggle.checked,
    brightness: parseInt(brightnessSlider.value),
    contrast: parseInt(contrastSlider.value),
    sepia: parseInt(sepiaSlider.value),
    grayscale: parseInt(grayscaleSlider.value)
  };

  await chrome.storage.sync.set({ [CONFIG_KEY]: config });
  
  // Update all tabs
  const tabs = await chrome.tabs.query({});
  tabs.forEach(tab => {
    chrome.tabs.sendMessage(tab.id, {
      action: 'updateConfig',
      config: config
    }).catch(() => {
      // Ignore errors for tabs that don't have content script
    });
  });
}

// Load configuration from storage
async function loadConfig() {
  const result = await chrome.storage.sync.get([CONFIG_KEY, 'disabledSites']);
  
  if (result[CONFIG_KEY]) {
    const config = result[CONFIG_KEY];
    enableToggle.checked = config.enabled !== false;
    brightnessSlider.value = config.brightness || 100;
    contrastSlider.value = config.contrast || 90;
    sepiaSlider.value = config.sepia || 10;
    grayscaleSlider.value = config.grayscale || 0;
    updateValueDisplays();
  }

  disabledSites = result.disabledSites || [];
  updateSiteToggleButton();
}

// Get current tab's hostname
async function getCurrentHostname() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url) {
    try {
      const url = new URL(tab.url);
      currentHostname = url.hostname;
      currentSiteSpan.textContent = currentHostname;
      updateSiteToggleButton();
    } catch (e) {
      currentSiteSpan.textContent = 'N/A';
      toggleSiteBtn.disabled = true;
    }
  }
}

// Update site toggle button state
function updateSiteToggleButton() {
  if (currentHostname) {
    const isDisabled = disabledSites.includes(currentHostname);
    if (isDisabled) {
      toggleSiteBtn.textContent = 'Enable for this site';
      toggleSiteBtn.classList.add('disabled');
    } else {
      toggleSiteBtn.textContent = 'Disable for this site';
      toggleSiteBtn.classList.remove('disabled');
    }
  }
}

// Toggle current site
async function toggleCurrentSite() {
  if (!currentHostname) return;

  const isDisabled = disabledSites.includes(currentHostname);
  
  // Update disabled sites list
  if (isDisabled) {
    disabledSites = disabledSites.filter(site => site !== currentHostname);
  } else {
    disabledSites.push(currentHostname);
  }

  await chrome.storage.sync.set({ disabledSites });
  updateSiteToggleButton();

  // Reload current tab to apply changes
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id) {
    chrome.tabs.reload(tab.id);
  }
}

// Event listeners
enableToggle.addEventListener('change', saveConfig);
brightnessSlider.addEventListener('input', () => {
  updateValueDisplays();
  saveConfig();
});
contrastSlider.addEventListener('input', () => {
  updateValueDisplays();
  saveConfig();
});
sepiaSlider.addEventListener('input', () => {
  updateValueDisplays();
  saveConfig();
});
grayscaleSlider.addEventListener('input', () => {
  updateValueDisplays();
  saveConfig();
});

toggleSiteBtn.addEventListener('click', toggleCurrentSite);

// Initialize popup
loadConfig();
getCurrentHostname();
updateValueDisplays();
