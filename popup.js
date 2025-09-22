const toggleBtn = document.getElementById("toggleBtn");
const resetBtn = document.getElementById("resetBtn");
const table = document.getElementById("statsTable");

// Load tracking state
chrome.storage.local.get(["trackingEnabled"], (data) => {
  if (data.trackingEnabled === false) {
    toggleBtn.textContent = "Start Tracking";
  } else {
    toggleBtn.textContent = "Stop Tracking";
  }
});

// Toggle tracking
toggleBtn.addEventListener("click", () => {
  chrome.storage.local.get(["trackingEnabled"], (data) => {
    let newState = !(data.trackingEnabled === false);
    chrome.storage.local.set({ trackingEnabled: !newState }, () => {
      toggleBtn.textContent = newState ? "Start Tracking" : "Stop Tracking";
    });
  });
});

// Reset stats
resetBtn.addEventListener("click", () => {
  chrome.storage.local.clear(() => {
    chrome.storage.local.set({ trackingEnabled: true }, () => {
      table.innerHTML = "<tr><th>Site</th><th>Time (s)</th><th>Clicks</th></tr>";
    });
  });
});

// Display stats
chrome.storage.local.get(null, (data) => {
  for (let site in data) {
    if (site === "trackingEnabled") continue;
    let row = table.insertRow();
    row.insertCell().textContent = site;
    row.insertCell().textContent = Math.round(data[site].timeSpent / 1000);
    row.insertCell().textContent = data[site].clicks;
  }
});
