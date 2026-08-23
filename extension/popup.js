// Configuration: Swap URL here to switch between local development and production
const API_URL = "https://cybertrons.vercel.app/api/analyze";
// const API_URL = "http://localhost:3000/api/analyze";

const WEB_APP_URL = "https://cybertrons.vercel.app";
// const WEB_APP_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", () => {
  const scanText = document.getElementById("scan-text");
  const scanBtn = document.getElementById("scan-btn");
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

  scanBtn.addEventListener("click", async () => {
    const text = scanText.value.trim();
    if (!text) {
      showError("Please paste some text to check first.");
      return;
    }

    // Reset view
    errorBox.style.display = "none";
    resultPanel.style.display = "none";
    loader.style.display = "block";
    scanBtn.disabled = true;

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerText: text })
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
      renderResult(text, data);
      
      // Update history in storage
      chrome.storage.local.get({ history: [] }, (result) => {
        const history = result.history;
        const newEntry = {
          id: `${Date.now()}`,
          text: text.slice(0, 80) + (text.length > 80 ? "..." : ""),
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
      scanBtn.disabled = false;
    }
  });

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
