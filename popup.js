// Format time duration
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// Update toggle button state
function updateToggleButton(isTracking) {
  const toggleBtn = document.getElementById('toggleBtn');
  if (isTracking) {
    toggleBtn.textContent = '⏸️ Stop Tracking';
    toggleBtn.classList.remove('stopped');
  } else {
    toggleBtn.textContent = '▶️ Start Tracking';
    toggleBtn.classList.add('stopped');
  }
}

// Load tracking status
chrome.runtime.sendMessage({ type: 'getTrackingStatus' }, (response) => {
  if (response) {
    updateToggleButton(response.isTracking);
  }
});

// Load and display stats
function loadStats() {
  chrome.storage.local.get(['stats'], (result) => {
    const stats = result.stats || {};
    const tbody = document.getElementById('statsBody');
    tbody.innerHTML = '';

    const entries = Object.entries(stats);

    if (entries.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="no-data">No data yet. Start browsing!</td></tr>';
      return;
    }

    // Sort by time spent (descending)
    entries.sort((a, b) => b[1].timeSpent - a[1].timeSpent);

    entries.forEach(([hostname, data]) => {
      const row = tbody.insertRow();
      
      const siteCell = row.insertCell();
      siteCell.textContent = hostname;
      
      const timeCell = row.insertCell();
      timeCell.textContent = formatTime(data.timeSpent);
      timeCell.className = 'time-cell';
      
      const clicksCell = row.insertCell();
      clicksCell.textContent = data.clicks.toLocaleString();
      
      const keystrokesCell = row.insertCell();
      keystrokesCell.textContent = data.keystrokes.toLocaleString();
    });
  });
}

// Reset all stats
document.getElementById('toggleBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'toggleTracking' }, (response) => {
    if (response) {
      updateToggleButton(response.isTracking);
    }
  });
});

// Reset all stats
document.getElementById('resetBtn').addEventListener('click', () => {
  if (confirm('Are you sure you want to reset all statistics?')) {
    chrome.storage.local.set({ stats: {} }, () => {
      loadStats();
    });
  }
});

// Export data as JSON
document.getElementById('exportBtn').addEventListener('click', () => {
  chrome.storage.local.get(['stats'], (result) => {
    const stats = result.stats || {};
    const dataStr = JSON.stringify(stats, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `website-stats-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  });
});

// Load stats on popup open
loadStats();