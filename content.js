// Track clicks
document.addEventListener('click', () => {
  chrome.runtime.sendMessage({
    type: 'click',
    url: window.location.href
  });
}, true);

// Track keystrokes
document.addEventListener('keydown', () => {
  chrome.runtime.sendMessage({
    type: 'keystroke',
    url: window.location.href
  });
}, true);