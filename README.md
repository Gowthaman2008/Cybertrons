# ScamCheck — Opportunity Verification

Built for **Hackspora 2.0 (PS3)**.

Students receive internship/job opportunities over WhatsApp, email, and social media and
often have no quick way to tell a real offer from a scam. ScamCheck lets a student paste
the message they received and get back, in seconds, a risk score, a plain-English
breakdown of exactly what looks suspicious, and a clear next step.

## What it does

1. You paste the offer text (plus optional sender email/phone, company name, and
   offered pay).
2. A **deterministic rule engine** scans the text locally for known scam patterns —
   upfront payment requests, "no interview needed," urgency language, unrealistic pay,
   generic greetings, free-email-domain senders, poor grammar, shortened links, and
   requests for sensitive info (bank details, Aadhaar, OTP, etc).
3. The raw text plus those flags are sent to **Claude**, which adds a natural-language
   read of the offer and a final calibrated risk score (0–100) with a verdict.
4. You get a combined result: score, verdict, every flag found (rule-based and
   AI-added), and a recommendation for what to do next.
5. Recent checks from the current session are listed in a history panel — nothing is
   persisted server-side, and there's no login.

## Tech stack

- **Framework**: Next.js 14 (App Router, TypeScript) — single deployable app, API routes
  double as the backend
- **UI**: React + Tailwind CSS
- **AI**: Anthropic API (`@anthropic-ai/sdk`), called server-side only
- **Deployment**: Vercel

## How the risk scoring works

Scoring happens in two layers (`lib/rules.ts` and `lib/llm.ts`, orchestrated in
`app/api/analyze/route.ts`):

**1. Rule-based pass (always runs, no API cost)**
Ten independent checks each look for a specific scam pattern (see `lib/rules.ts` for the
full list and the exact regexes/keyword lists used). Each triggered check has a fixed
severity weight — `low` (+6), `medium` (+12), or `high` (+22) — and the rule score is the
sum of triggered weights, capped at 100. This layer is fully deterministic and doesn't
depend on the AI being available.

**2. LLM pass**
The offer text and the rule flags are sent to Claude with a system prompt that
constrains it to return **only** a JSON object:
`{ riskScore, verdict, explanation, additionalFlags }` — no free-form chat. Claude uses
the rule flags as a starting point but also reads the raw text for anything the rules
missed (tone, plausibility, role/pay mismatch, internal inconsistencies).

**Final result**: when the LLM call succeeds, its `riskScore`/`verdict` are shown as the
authoritative result (the rule flags are still shown alongside it). If the LLM call fails
for any reason (missing key, rate limit, network error), the app **gracefully degrades**
to the rule-based score/verdict instead of breaking, and says so in the UI.

Verdict thresholds: `0–29` Low Risk · `30–64` Medium Risk · `65–100` High Risk.

## Setup

```bash
npm install
cp .env.example .env.local   # then paste your Anthropic API key into .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

You need an Anthropic API key from [console.anthropic.com](https://console.anthropic.com/).
The key is read server-side only (`process.env.ANTHROPIC_API_KEY` inside `lib/llm.ts`) and
is never sent to or exposed in the browser. If it's missing or a request to Claude fails,
the app still works using the rule-based score alone.

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import it into Vercel.
3. Add an environment variable `ANTHROPIC_API_KEY` in the Vercel project settings.
4. Deploy — no other manual steps needed (`vercel.json` sets the Next.js build/install
   commands explicitly).

## Project structure

```
app/
  api/analyze/route.ts   # POST endpoint: orchestrates rules -> LLM -> combined result
  page.tsx                # main UI: form, results, session history
  layout.tsx, globals.css
components/
  OfferForm.tsx            # input form (offer text + optional fields)
  ResultsPanel.tsx          # score gauge + flags + AI explanation + recommendation
  ScoreGauge.tsx            # circular risk-score gauge
  FlagList.tsx               # numbered, severity-colored flag readout
  ScanningState.tsx        # loading state
  HistoryPanel.tsx          # session-only history (no persistence)
  Header.tsx
lib/
  rules.ts     # rule-based detector — the deterministic scam-pattern checks
  llm.ts       # Claude API call + strict JSON parsing/validation
  types.ts     # shared TypeScript types for the pipeline
```

## Out of scope (by design, for this hackathon build)

- No user accounts or authentication
- No persistent database — history lives only in the browser session's React state
- No multi-language support

## Disclaimer

ScamCheck is a decision aid, not a guarantee. It can miss novel scam patterns and can be
wrong. Always verify independently — through a company's official careers page or a known
HR contact — before paying money or sharing personal/financial information.
