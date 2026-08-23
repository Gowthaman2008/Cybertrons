// Configuration: Swap URL here to switch between local development and production
const API_URL = "https://cybertrons.vercel.app/api/analyze";
// const API_URL = "http://localhost:3000/api/analyze";

// Install-time context menu setup
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "scamcheck-scan",
    title: "Check with ScamCheck",
    contexts: ["selection"]
  });
});

// Listener for context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "scamcheck-scan" || !info.selectionText || !tab?.id) {
    return;
  }

  const selectedText = info.selectionText;

  // 1. Tell content.js to inject and display the floating loading overlay card
  try {
    await chrome.tabs.sendMessage(tab.id, { action: "SHOW_LOADING", text: selectedText });
  } catch (err) {
    // If the content script isn't loaded yet (e.g. on chrome:// settings or newly loaded tabs),
    // we inject it dynamically.
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });
    // Retry sending
    await chrome.tabs.sendMessage(tab.id, { action: "SHOW_LOADING", text: selectedText });
  }

  // 2. Perform background server-side analysis request
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerText: selectedText })
    });

    if (!res.ok) {
      let errMsg = "Server check failed.";
      try {
        const errJson = await res.json();
        if (errJson.error) errMsg = errJson.error;
      } catch {}
      throw new Error(errMsg);
    }

    const data = await res.json();

    // Save history (last 3 items) in local chrome storage
    chrome.storage.local.get({ history: [] }, (result) => {
      const history = result.history;
      const newEntry = {
        id: `${Date.now()}`,
        text: selectedText.slice(0, 100) + (selectedText.length > 100 ? "..." : ""),
        result: data,
        timestamp: Date.now()
      };
      const updatedHistory = [newEntry, ...history].slice(0, 3);
      chrome.storage.local.set({ history: updatedHistory });
    });

    // 3. Post result back to content.js overlay
    chrome.tabs.sendMessage(tab.id, {
      action: "SHOW_RESULT",
      text: selectedText,
      result: data
    });
  } catch (err) {
    chrome.tabs.sendMessage(tab.id, {
      action: "SHOW_ERROR",
      text: selectedText,
      error: err.message || "Failed to contact the analysis server. Make sure ScamCheck is running."
    });
  }
});
