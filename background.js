// State variables
let activeTabId = null;
let activeHostname = null;
let activeStartTime = null;
let isTracking = true; // Default to tracking enabled

// Extract hostname from URL
function getHostname(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

// Save time spent on a hostname
function saveTime(hostname, duration) {
  if (!hostname || duration <= 0 || !isTracking) return;

  chrome.storage.local.get(['stats'], (result) => {
    const stats = result.stats || {};
    
    if (!stats[hostname]) {
      stats[hostname] = { timeSpent: 0, clicks: 0, keystrokes: 0 };
    }
    
    stats[hostname].timeSpent += duration;
    chrome.storage.local.set({ stats });
  });
}

// Stop tracking current tab
function stopTracking() {
  if (activeHostname && activeStartTime) {
    const duration = Date.now() - activeStartTime;
    saveTime(activeHostname, duration);
  }
  activeHostname = null;
  activeStartTime = null;
}

// Start tracking a new tab
function startTracking(hostname) {
  if (!isTracking) return;
  activeHostname = hostname;
  activeStartTime = Date.now();
}

// Handle tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  stopTracking();
  
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    activeTabId = tab.id;
    const hostname = getHostname(tab.url);
    if (hostname) {
      startTracking(hostname);
    }
  } catch (error) {
    console.error('Error getting tab:', error);
  }
});

// Handle tab URL updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === activeTabId && changeInfo.url) {
    stopTracking();
    const hostname = getHostname(changeInfo.url);
    if (hostname) {
      startTracking(hostname);
    }
  }
});

// Handle window focus changes
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    stopTracking();
  } else {
    chrome.tabs.query({ active: true, windowId }, (tabs) => {
      if (tabs && tabs[0]) {
        stopTracking();
        activeTabId = tabs[0].id;
        const hostname = getHostname(tabs[0].url);
        if (hostname) {
          startTracking(hostname);
        }
      }
    });
  }
});

// Handle idle state
chrome.idle.onStateChanged.addListener((newState) => {
  if (newState !== 'active') {
    stopTracking();
  } else if (activeTabId !== null) {
    chrome.tabs.get(activeTabId, (tab) => {
      if (tab && tab.url) {
        const hostname = getHostname(tab.url);
        if (hostname) {
          startTracking(hostname);
        }
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'toggleTracking') {
    isTracking = !isTracking;

    if (!isTracking) {
      stopTracking();
      chrome.storage.local.set({ isTracking }, () => {
        sendResponse({ isTracking });
      });
    } else {
      // Restart tracking if we have an active tab
      if (activeTabId !== null) {
        chrome.tabs.get(activeTabId, (tab) => {
          if (tab && tab.url) {
            const hostname = getHostname(tab.url);
            if (hostname) startTracking(hostname);
          }
          chrome.storage.local.set({ isTracking }, () => {
            sendResponse({ isTracking });
          });
        });
      } else {
        chrome.storage.local.set({ isTracking }, () => {
          sendResponse({ isTracking });
        });
      }
    }

    // ✅ Important: Keep the message channel open
    return true;
  }

  if (message.type === 'getTrackingStatus') {
    sendResponse({ isTracking });
    return true;
  }

  // Handle click/keystroke tracking
  if (!message.type || !message.url || !isTracking) return;
  const hostname = getHostname(message.url);
  if (!hostname) return;

  chrome.storage.local.get(['stats'], (result) => {
    const stats = result.stats || {};

    if (!stats[hostname]) {
      stats[hostname] = { timeSpent: 0, clicks: 0, keystrokes: 0 };
    }

    if (message.type === 'click') {
      stats[hostname].clicks += 1;
    } else if (message.type === 'keystroke') {
      stats[hostname].keystrokes += 1;
    }

    chrome.storage.local.set({ stats });
  });

  return true;
});


// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['stats', 'isTracking'], (result) => {
    if (!result.stats) {
      chrome.storage.local.set({ stats: {} });
    }
    // Load saved tracking state or default to true
    if (result.isTracking !== undefined) {
      isTracking = result.isTracking;
    } else {
      chrome.storage.local.set({ isTracking: true });
    }
  });
  
  // Start tracking current active tab if tracking is enabled
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0] && isTracking) {
      activeTabId = tabs[0].id;
      const hostname = getHostname(tabs[0].url);
      if (hostname) {
        startTracking(hostname);
      }
    }
  });
});