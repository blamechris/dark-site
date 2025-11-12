// Options page script for Dark Site extension

const CONFIG_KEY = 'darkSiteConfig';

const defaultConfig = {
  enabled: true,
  brightness: 100,
  contrast: 90,
  sepia: 10,
  grayscale: 0
};

// Load and display disabled sites
async function loadDisabledSites() {
  const result = await chrome.storage.sync.get(['disabledSites']);
  const disabledSites = result.disabledSites || [];
  
  const listContainer = document.getElementById('disabledSitesList');
  
  if (disabledSites.length === 0) {
    listContainer.innerHTML = '<div class="empty-state">No sites have been disabled</div>';
    return;
  }

  listContainer.innerHTML = '';
  
  disabledSites.forEach(site => {
    const item = document.createElement('div');
    item.className = 'disabled-site-item';
    
    const siteName = document.createElement('span');
    siteName.className = 'site-name';
    siteName.textContent = site;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => removeSite(site));
    
    item.appendChild(siteName);
    item.appendChild(removeBtn);
    listContainer.appendChild(item);
  });
}

// Remove a site from the disabled list
async function removeSite(siteToRemove) {
  const result = await chrome.storage.sync.get(['disabledSites']);
  let disabledSites = result.disabledSites || [];
  
  disabledSites = disabledSites.filter(site => site !== siteToRemove);
  
  await chrome.storage.sync.set({ disabledSites });
  loadDisabledSites();
}

// Reset all settings to defaults
async function resetSettings() {
  if (!confirm('Are you sure you want to reset all settings to defaults? This will clear your disabled sites list and restore default filter values.')) {
    return;
  }

  await chrome.storage.sync.set({
    [CONFIG_KEY]: defaultConfig,
    disabledSites: []
  });

  loadDisabledSites();
  
  // Show confirmation
  const resetBtn = document.getElementById('resetBtn');
  const originalText = resetBtn.textContent;
  resetBtn.textContent = '✓ Reset Complete';
  resetBtn.style.background = '#27ae60';
  
  setTimeout(() => {
    resetBtn.textContent = originalText;
    resetBtn.style.background = '';
  }, 2000);

  // Reload all tabs
  const tabs = await chrome.tabs.query({});
  tabs.forEach(tab => {
    chrome.tabs.reload(tab.id).catch(() => {
      // Ignore errors for special tabs
    });
  });
}

// Event listeners
document.getElementById('resetBtn').addEventListener('click', resetSettings);

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.disabledSites) {
    loadDisabledSites();
  }
});

// Initialize
loadDisabledSites();
