# ScamCheck — Scam Forensics Lab

Built for **Hackspora 2.0 (PS3)**.

ScamCheck is an advanced opportunity verification and cyber-forensics platform. Students receive internship/job opportunities over WhatsApp, email, and social media, and often have no quick way to tell a real offer from a scam. ScamCheck parses the offer letter or chat screenshot, passes it through a multi-layered forensics pipeline, and generates a structured incident file with highlighted evidence tooltips, risk metrics, and cosine similarity matches against known fraud types.

---

## What it does

1. **Dual Scanner**: Paste raw text or upload screenshots/images of internship or job offers (processed using Gemini's multimodal computer-vision capabilities).
2. **Three-Layer Forensics Pipeline**:
   - **Layer 1 (Deterministic Rules)**: Extracts pattern flags locally for upfront fee payments, skips-interview indicators, extreme urgency keywords, or suspicious banking credentials pre-hire.
   - **Layer 2 (Lightweight ML Classifier)**: Runs a JS-native vectorizer + Logistic Regression model trained on illustrative recruiting datasets to calculate a scam resemblance probability.
   - **Layer 3 (LLM Synthesizer)**: Query Gemini with Layer 1 and Layer 2 outputs as context to write a unified forensic explanation and break down risk values.
3. **Forensic Category Breakdown**: Scores risk across 5 distinct axes and renders a custom interactive SVG Radar Chart.
4. **Cosine Similarity Matcher**: Runs a TF-IDF comparison against a library of 10 real-world scam templates to report which exact profile this document resembles.
5. **Psychology Explainer Toggle**: Pulls a turn-by-turn social-engineering breakdown of triggers (Urgency, Authority, Greed, Commitment) active in the message.
6. **AI Action Station**: Drafts safe copy-pasteable rejection messages or pre-formatted Placement Cell report emails based on the incident findings.
7. **Gamified Cybersecurity Simulator**: Play through realistic scenarios in an awareness game to train your eyes on warning cues.

---

## Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **UI**: React + Tailwind CSS
- **AI Backend**: Google Gen AI SDK (`@google/genai`) querying `gemini-3.6-flash`
- **Deployment**: Vercel

---

## How the multi-layer pipeline works

Scoring and analysis are orchestrated in [`app/api/analyze/route.ts`](file:///d:/HACKATHON/scamcheck/app/api/analyze/route.ts):

### Layer 1: Rule-Based Matcher (Rules Engine)
Ten independent checks look for key flags (e.g. `upfront-payment`, `no-interview`, `domain-mismatch`). Each flag adds score points based on severity (`low: +6`, `medium: +12`, `high: +22`), capped at 100%.

### Layer 2: Machine Learning Classifier
- **Model File**: [`lib/classifier.ts`](file:///d:/HACKATHON/scamcheck/lib/classifier.ts)
- **Algorithm**: TF-IDF Vectorization + Logistic Regression.
- **Training Data**: Labeled dataset of 40 representative recruiting text profiles (20 scam templates and 20 legitimate corporate messages) included inside the classifier code.
- **Execution**: The model is trained dynamically in-memory on server load (takes less than 5ms for 250 gradient descent epochs). Given incoming tokens, it calculates a sigmoid score (0-100%) reflecting scam vocabulary resemblance.

### Layer 3: LLM Synthesizer
- **Model**: `gemini-3.6-flash`
- **Execution**: The model receives the rules results and the ML classification score, and evaluates category details (Payment Request, Urgency, Domain, Language Quality, Realism) to build a unified report.

### Final Score Weighting
The overall risk score is calculated as a weighted average:
```typescript
finalScore = (RuleScore * 0.2) + (MlScore * 0.2) + (LlmRiskScore * 0.6)
```
If the AI layer fails or is unconfigured, the app **degrades gracefully** to:
```typescript
finalScore = (RuleScore * 0.5) + (MlScore * 0.5)
```

---

## Setup & Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Create local environment file**:
   ```bash
   cp .env.example .env.local
   ```
   Paste your Gemini API Key in `.env.local`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. **Run local server**:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000).

---

## Deploying to Vercel

1. Push this repository to GitHub.
2. Import the project into Vercel.
3. Configure the environment variable **`GEMINI_API_KEY`** in the project settings.
4. Deploy. Vercel automatically builds and deploys the Next.js routes.

---

## Setup ScamCheck Browser Companion Extension

The browser extension (Manifest V3) lets you run opportunity checks directly inside Gmail, WhatsApp Web, LinkedIn, or any webpage using the context menu or manual paste toolbar popup.

### How to install locally (Chrome / Edge / Brave):
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer Mode** in the top-right corner.
3. Click **Load Unpacked** in the top-left corner.
4. Select the **`extension`** folder from this project directory.

### Swapping between Localhost and Production URLs:
By default, the extension calls the live production endpoint. To point to your local dev environment:
- Open [`extension/background.js`](file:///d:/HACKATHON/scamcheck/extension/background.js):
  - Comment out `const API_URL = "https://cybertrons.vercel.app/api/analyze";`
  - Uncomment `const API_URL = "http://localhost:3000/api/analyze";`
- Open [`extension/popup.js`](file:///d:/HACKATHON/scamcheck/extension/popup.js):
  - Comment out the production constants and uncomment the `localhost` constants at the top.
- Click the **Update** or **Reload** icon on the extension page in `chrome://extensions/` to apply changes.

### How to use:
- **Right-Click Method**: Highlight any text on a webpage, right-click, and select **Check with ScamCheck**. A floating incident report card will slide in from the top-right. Click **View Full Forensic Report** to deep-link straight to the web dashboard.
- **Toolbar Popup Method**: Click the extension icon in the toolbar, paste raw text, and click **Analyze Offer**. It renders a mini-report card along with a list of the last 3 checks.

---

---

## Project Structure

```
app/
  api/analyze/route.ts       # POST route: orchestrates Rule + ML + LLM pipeline
  api/action/route.ts        # POST route: generates rejection drafts and reports
  api/psychology/route.ts    # POST route: generates psychological tactic explainer
  page.tsx                   # Main layout: navigation tabs, scanner panel, game deck
  globals.css, layout.tsx
components/
  OfferForm.tsx              # Split panel scanner: text paste / screenshot upload
  ResultsPanel.tsx           # Forensic report dashboard
  RadarChart.tsx             # Custom SVG Radar chart category visualizer
  EvidenceHighlighter.tsx    # Inline review document with hover violation tooltips
  ActionStation.tsx          # Rejection email and cyber report compiler
  ScamGame.tsx               # Gamified card-swiping quiz simulator
  ScanningState.tsx          # Scanning animation
  HistoryPanel.tsx           # Session history panel
lib/
  rules.ts                   # Deterministic regex matching rules (Layer 1)
  classifier.ts              # In-memory TF-IDF + Logistic Regression ML (Layer 2)
  patternLibrary.ts          # 10 Scam patterns + Cosine Similarity matching
  llm.ts                     # Gemini SDK structured output schema handler (Layer 3)
  types.ts                   # Shared TypeScript definitions
```

---

## Disclaimer

ScamCheck is a decision aid, not a guarantee. It can miss novel scam patterns and can be wrong. Always verify independently through a company's official careers page or a known HR contact before paying money or sharing personal/financial information.
