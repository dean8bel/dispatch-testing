// Function to send click info to background
function reportClick(event) {
    chrome.runtime.sendMessage({
      type: "click",
      url: window.location.href,
      x: event.clientX,
      y: event.clientY,
      button: event.button,
      tag: event.target.tagName
    });
    console.log("Click detected:", event.type, event.target.tagName, "on", window.location.hostname);
  }
  
  // Attach listeners to a root (document or shadowRoot)
  function addClickListeners(root) {
    if (!root) return;
  
    // Capture phase ensures we get clicks before page JS can stop them
    root.addEventListener("mousedown", reportClick, true);
    root.addEventListener("click", reportClick, true);
  
    // Recursively attach to existing shadow DOMs
    const shadowElements = root.querySelectorAll("*");
    shadowElements.forEach(el => {
      if (el.shadowRoot) {
        addClickListeners(el.shadowRoot);
      }
    });
  }
  
  // Initial attachment to the main document
  addClickListeners(document);
  
  // Observe DOM mutations to catch dynamically added shadow DOMs
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.shadowRoot) {
          addClickListeners(node.shadowRoot);
        }
        // If node itself is an element, check its subtree for shadow roots
        if (node.querySelectorAll) {
          node.querySelectorAll("*").forEach(el => {
            if (el.shadowRoot) {
              addClickListeners(el.shadowRoot);
            }
          });
        }
      });
    });
  });
  
  // Observe the entire document for new nodes
  observer.observe(document, { childList: true, subtree: true });
  