// content.js - Injects floating card overlay via isolated Shadow DOM

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "SHOW_LOADING") {
    createOrUpdateOverlay(message.text, { state: "loading" });
  } else if (message.action === "SHOW_RESULT") {
    createOrUpdateOverlay(message.text, { state: "success", data: message.result });
  } else if (message.action === "SHOW_ERROR") {
    createOrUpdateOverlay(message.text, { state: "error", error: message.error });
  }
});

function createOrUpdateOverlay(text, options) {
  let root = document.getElementById("scamcheck-overlay-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "scamcheck-overlay-root";
    // Place at maximum z-index to avoid overlap by host page elements
    root.style.position = "fixed";
    root.style.top = "20px";
    root.style.right = "20px";
    root.style.zIndex = "2147483647";
    document.body.appendChild(root);
  }

  // Create Shadow DOM if not already present
  let shadow = root.shadowRoot;
  if (!shadow) {
    shadow = root.attachShadow({ mode: "open" });
  }

  // Define shadow DOM styles (scoped completely to avoid page style leakage)
  const styles = `
    .card {
      width: 320px;
      background-color: #121821;
      border: 1px solid #2A3542;
      border-radius: 10px;
      color: #E7ECF2;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
      padding: 16px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      position: relative;
      box-sizing: border-box;
      animation: slideIn 0.25s ease-out;
    }
    @keyframes slideIn {
      from { transform: translateX(50px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .close-btn {
      position: absolute;
      top: 10px;
      right: 12px;
      background: none;
      border: none;
      color: #708090;
      font-size: 16px;
      cursor: pointer;
      line-height: 1;
      padding: 2px 5px;
    }
    .close-btn:hover {
      color: #E7ECF2;
    }
    .header {
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #00E6FF;
      margin-bottom: 8px;
    }
    .title {
      font-size: 14px;
      font-weight: 600;
      margin: 0 0 12px 0;
      color: #FFFFFF;
    }
    .loader {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(0, 230, 255, 0.25);
      border-top-color: #00E6FF;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      vertical-align: middle;
      margin-right: 8px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .score-container {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      background: #1D2633;
      padding: 8px 12px;
      border-radius: 6px;
    }
    .score-circle {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: bold;
      border: 3px solid;
    }
    .verdict {
      font-size: 13px;
      font-weight: bold;
    }
    .desc {
      font-size: 11px;
      line-height: 1.4;
      color: #9AA5B5;
      margin-bottom: 12px;
    }
    .flags-title {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #708090;
      margin-bottom: 6px;
      font-weight: bold;
    }
    .flag-item {
      font-size: 10px;
      background: rgba(255, 255, 255, 0.03);
      border-left: 2px solid;
      padding: 4px 8px;
      margin-bottom: 4px;
      border-radius: 0 4px 4px 0;
    }
    .flag-high { border-left-color: #E0503A; background: rgba(224, 80, 58, 0.05); }
    .flag-medium { border-left-color: #E0A430; background: rgba(224, 164, 48, 0.05); }
    .flag-low { border-left-color: #3FB27F; background: rgba(63, 178, 127, 0.05); }
    
    .btn-action {
      display: block;
      text-align: center;
      background: #00E6FF;
      color: #121821;
      font-size: 11px;
      font-weight: bold;
      text-decoration: none;
      padding: 8px;
      border-radius: 4px;
      margin-top: 14px;
      transition: background 0.2s;
    }
    .btn-action:hover {
      background: #00B3CC;
    }
    .error-box {
      color: #E0503A;
      font-size: 11px;
      line-height: 1.4;
    }
  `;

  let contentHtml = "";

  if (options.state === "loading") {
    contentHtml = `
      <div class="card">
        <button class="close-btn" id="scamcheck-close">×</button>
        <div class="header">ScamCheck Lab</div>
        <div class="title">Analysing text...</div>
        <div style="font-size: 12px; color: #9AA5B5;">
          <span class="loader"></span> Running rules, ML, and LLM scans...
        </div>
      </div>
    `;
  } else if (options.state === "error") {
    contentHtml = `
      <div class="card">
        <button class="close-btn" id="scamcheck-close">×</button>
        <div class="header">Analysis Error</div>
        <div class="title">Verification Failed</div>
        <div class="error-box">${options.error}</div>
      </div>
    `;
  } else if (options.state === "success") {
    const data = options.data;
    const score = data.finalScore;
    const verdict = data.finalVerdict;
    const explanation = data.llm ? data.llm.explanation : "Rule-based analysis complete.";

    // Get color theme
    const themeColor = score >= 65 ? "#E0503A" : score >= 30 ? "#E0A430" : "#3FB27F";

    // Format top 2 flags
    const flagElements = (data.ruleFlags || [])
      .slice(0, 2)
      .map((f) => {
        const flagClass = f.severity === "high" ? "flag-high" : f.severity === "medium" ? "flag-medium" : "flag-low";
        return `<div class="flag-item ${flagClass}"><strong>${f.label}</strong>: ${f.explanation.slice(0, 50)}...</div>`;
      })
      .join("");

    // Create deep link URL to full site
    const deepLinkUrl = `https://cybertrons.vercel.app/?text=${encodeURIComponent(text)}`;

    contentHtml = `
      <div class="card">
        <button class="close-btn" id="scamcheck-close">×</button>
        <div class="header">Incident Verification</div>
        <div class="title">Forensics Assessment Complete</div>
        
        <div class="score-container">
          <div class="score-circle" style="border-color: ${themeColor}; color: ${themeColor};">
            ${score}%
          </div>
          <div>
            <div class="verdict" style="color: ${themeColor};">${verdict}</div>
            <div style="font-size: 9px; color: #708090; font-family: monospace;">CASE: ${data.caseId}</div>
          </div>
        </div>

        <div class="desc">${explanation}</div>

        ${flagElements ? `
          <div class="flags-title">Key Evidence Detected</div>
          <div style="margin-bottom: 8px;">${flagElements}</div>
        ` : ""}

        <a href="${deepLinkUrl}" target="_blank" class="btn-action">
          View Full Forensic Report ↗
        </a>
      </div>
    `;
  }

  // Inject scoped CSS stylesheet and card markup
  shadow.innerHTML = `
    <style>${styles}</style>
    ${contentHtml}
  `;

  // Attach click listener for closing button inside Shadow DOM
  const closeBtn = shadow.getElementById("scamcheck-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      document.body.removeChild(root);
    });
  }
}
