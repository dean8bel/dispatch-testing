let activeTabId = null;
let activeHostname = null;
let activeStart = null;

function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function saveTime(hostname, duration) {
  chrome.storage.local.get(["trackingEnabled"], (data) => {
    if (data.trackingEnabled === false) return; // ⛔ don't track
    if (!hostname || !duration) return;
    chrome.storage.local.get([hostname], (siteData) => {
      let stats = siteData[hostname] || { timeSpent: 0, clicks: 0 };
      stats.timeSpent += duration;
      chrome.storage.local.set({ [hostname]: stats });
    });
  });
}

// Tab activated
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (activeHostname && activeStart) {
    let duration = Date.now() - activeStart;
    saveTime(activeHostname, duration);
  }

  let tab = await chrome.tabs.get(activeInfo.tabId);
  activeTabId = tab.id;
  activeHostname = getHostname(tab.url);
  activeStart = Date.now();
});

// Tab updated (URL change)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === activeTabId && changeInfo.url) {
    if (activeHostname && activeStart) {
      let duration = Date.now() - activeStart;
      saveTime(activeHostname, duration);
    }
    activeHostname = getHostname(changeInfo.url);
    activeStart = Date.now();
  }
});

// Window focus change
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (activeHostname && activeStart) {
    let duration = Date.now() - activeStart;
    saveTime(activeHostname, duration);
    activeStart = null;
  }
  if (windowId !== chrome.windows.WINDOW_ID_NONE) {
    chrome.tabs.query({ active: true, windowId }, (tabs) => {
      if (tabs[0]) {
        activeTabId = tabs[0].id;
        activeHostname = getHostname(tabs[0].url);
        activeStart = Date.now();
      }
    });
  }
});

// Idle detection
chrome.idle.onStateChanged.addListener((newState) => {
  if (newState !== "active" && activeHostname && activeStart) {
    let duration = Date.now() - activeStart;
    saveTime(activeHostname, duration);
    activeStart = null;
  } else if (newState === "active" && activeTabId !== null) {
    chrome.tabs.get(activeTabId, (tab) => {
      if (tab) {
        activeHostname = getHostname(tab.url);
        activeStart = Date.now();
      }
    });
  }
});

// Receive click counts from content.js
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === "click") {
    chrome.storage.local.get(["trackingEnabled"], (data) => {
      if (data.trackingEnabled === false) return; // ⛔ don't track
      let hostname = getHostname(message.url);
      chrome.storage.local.get([hostname], (siteData) => {
        let stats = siteData[hostname] || { timeSpent: 0, clicks: 0 };
        stats.clicks += 1;
        chrome.storage.local.set({ [hostname]: stats });
      });
    });
  }
});

// Initialize trackingEnabled to true if undefined
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["trackingEnabled"], (data) => {
    if (data.trackingEnabled === undefined) {
      chrome.storage.local.set({ trackingEnabled: true });
    }
  });
});
