// Configuration: Swap URL here to switch between local development and production
const API_URL = "https://cybertrons.vercel.app/api/analyze";
// const API_URL = "http://localhost:3000/api/analyze";

const WEB_APP_URL = "https://cybertrons.vercel.app";
// const WEB_APP_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", () => {
  const scanText = document.getElementById("scan-text");
  const scanBtn = document.getElementById("scan-btn");
  const screenshotBtn = document.getElementById("screenshot-btn");
  const pageBtn = document.getElementById("page-btn");
  const uploadBtn = document.getElementById("upload-btn");
  const imageInput = document.getElementById("image-input");
  const loader = document.getElementById("loader");
  const resultPanel = document.getElementById("result-panel");
  const errorBox = document.getElementById("error-box");

  const verdictEl = document.getElementById("verdict");
  const scoreEl = document.getElementById("score");
  const caseIdEl = document.getElementById("case-id");
  const explanationEl = document.getElementById("explanation");
  const reportLinkEl = document.getElementById("view-full-report");

  // Load history list
  loadHistory();

  // 1. Text-Only Manual Input scan click listener
  scanBtn.addEventListener("click", async () => {
    const text = scanText.value.trim();
    if (!text) {
      showError("Please paste some text to check first.");
      return;
    }
    executeScan({ offerText: text });
  });

  // 2. Screenshot Scan click listener
  screenshotBtn.addEventListener("click", () => {
    // Disable interface
    setControlsDisabled(true);
    showLoader("Capturing tab viewport screenshot...");

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab) {
        showError("Could not retrieve active tab to capture screenshot.");
        setControlsDisabled(false);
        return;
      }

      chrome.tabs.captureVisibleTab(null, { format: "png" }, async (dataUrl) => {
        if (!dataUrl) {
          showError("Screenshot capture failed. Make sure you are on a standard webpage.");
          setControlsDisabled(false);
          return;
        }

        // Clean Base64 prefix
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");

        executeScan({
          offerText: "",
          image: {
            data: base64Data,
            mimeType: "image/png"
          }
        });
      });
    });
  });

  // 3. Current Page Text Scan click listener
  pageBtn.addEventListener("click", () => {
    setControlsDisabled(true);
    showLoader("Extracting text from current page...");

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) {
        showError("Could not identify current active tab.");
        setControlsDisabled(false);
        return;
      }

      // Inject script to scrape document inner text
      chrome.scripting.executeScript(
        {
          target: { tabId: activeTab.id },
          func: () => document.body.innerText
        },
        (results) => {
          if (!results || !results[0] || !results[0].result) {
            showError("Could not extract text from this page. Make sure it contains readable text.");
            setControlsDisabled(false);
            return;
          }

          const extractedText = results[0].result.trim();
          if (extractedText.length === 0) {
            showError("The current page is empty.");
            setControlsDisabled(false);
            return;
          }

          scanText.value = extractedText.slice(0, 500) + (extractedText.length > 500 ? "..." : "");
          executeScan({ offerText: extractedText });
        }
      );
    });
  });

  // 4. Upload Image click triggers
  uploadBtn.addEventListener("click", () => {
    imageInput.click();
  });

  imageInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showError("Please upload a valid image file (PNG, JPG, JPEG, WEBP).");
      return;
    }

    setControlsDisabled(true);
    showLoader("Reading image file details...");

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");

      executeScan({
        offerText: "",
        image: {
          data: base64Data,
          mimeType: file.type
        }
      });
    };
    reader.readAsDataURL(file);
    // Reset file input value so same image can be reselected if needed
    imageInput.value = "";
  });

  async function executeScan(payload) {
    errorBox.style.display = "none";
    resultPanel.style.display = "none";
    setControlsDisabled(true);
    showLoader("Checking rules, ML classifier, and Gemini AI...");

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        let msg = "Server request failed.";
        try {
          const errData = await res.json();
          if (errData.error) msg = errData.error;
        } catch {}
        throw new Error(msg);
      }

      const data = await res.json();
      const inputText = payload.offerText || `[SCREENSHOT SCAN] - CASE #${data.caseId}`;
      renderResult(inputText, data);
      
      // Update history in storage
      chrome.storage.local.get({ history: [] }, (result) => {
        const history = result.history;
        const newEntry = {
          id: `${Date.now()}`,
          text: inputText.slice(0, 80) + (inputText.length > 80 ? "..." : ""),
          result: data,
          timestamp: Date.now()
        };
        const updatedHistory = [newEntry, ...history].slice(0, 3);
        chrome.storage.local.set({ history: updatedHistory }, () => {
          loadHistory();
        });
      });

    } catch (err) {
      showError(err.message || "Failed to contact analysis server.");
    } finally {
      loader.style.display = "none";
      setControlsDisabled(false);
    }
  }

  function setControlsDisabled(disabled) {
    scanBtn.disabled = disabled;
    screenshotBtn.disabled = disabled;
    pageBtn.disabled = disabled;
    uploadBtn.disabled = disabled;
  }

  function showLoader(text) {
    loader.textContent = text;
    loader.style.display = "block";
  }

  function renderResult(text, data) {
    resultPanel.style.display = "block";
    const score = data.finalScore;
    const verdict = data.finalVerdict;

    // Apply color-coded themes
    const themeColor = score >= 65 ? "#E0503A" : score >= 30 ? "#E0A430" : "#3FB27F";
    const badgeBg = score >= 65 ? "#E0503A" : score >= 30 ? "#E0A430" : "#3FB27F";

    verdictEl.textContent = verdict;
    verdictEl.style.color = themeColor;

    scoreEl.textContent = `${score}% Risk`;
    scoreEl.style.backgroundColor = badgeBg;
    scoreEl.style.color = score >= 30 && score < 65 ? "#121821" : "#FFFFFF";

    caseIdEl.textContent = `CASE #${data.caseId}`;
    
    explanationEl.textContent = data.llm ? data.llm.explanation : "Deterministic rules completed. Check the full dashboard for details.";

    // Set view full report deep-link
    reportLinkEl.href = `${WEB_APP_URL}/?text=${encodeURIComponent(text)}`;
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = "block";
    loader.style.display = "none";
  }

  function loadHistory() {
    chrome.storage.local.get({ history: [] }, (result) => {
      const historyList = document.getElementById("history-list");
      const historySection = document.getElementById("history-section");
      const history = result.history || [];

      if (history.length === 0) {
        historySection.style.display = "none";
        return;
      }

      historySection.style.display = "block";
      historyList.innerHTML = "";

      history.forEach((entry) => {
        const item = document.createElement("div");
        item.className = "history-item";
        
        const score = entry.result.finalScore;
        const color = score >= 65 ? "#E0503A" : score >= 30 ? "#E0A430" : "#3FB27F";

        item.innerHTML = `
          <div style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; flex-shrink: 0;"></div>
          <div style="flex-grow: 1; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 200px;">
            ${entry.text}
          </div>
          <div style="font-size: 8px; font-family: monospace; color: ${color};">${score}%</div>
        `;

        item.addEventListener("click", () => {
          scanText.value = entry.result.llm?.explanation || entry.text; // Fill text
          renderResult(entry.text, entry.result);
        });

        historyList.appendChild(item);
      });
    });
  }
});
