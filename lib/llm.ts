/**
 * LLM layer.
 *
 * Takes the raw offer text plus the deterministic rule-based flags and asks
 * Gemini for (a) a natural-language explanation a student can actually
 * understand and (b) a final 0-100 risk score / verdict. The model is
 * instructed to return a structured JSON object according to responseJsonSchema.
 *
 * This file is the only place that talks to the Gemini API, and it is
 * only ever imported from server-side code (the API route). The API key is
 * read from process.env and never sent to the client.
 */

import { GoogleGenAI, Type } from "@google/genai";
import { LlmAssessment, OfferInput, RuleFlag, Verdict } from "./types";

const MODEL = "gemini-3.6-flash";

const VALID_VERDICTS: Verdict[] = ["Low Risk", "Medium Risk", "High Risk"];

function buildSystemInstruction(): string {
  return `You are a fraud-detection assistant embedded in a student-facing tool called ScamCheck - Scam Forensics Lab.
You will be given (1) the raw text (or an image of a document) of a job/internship offer a student received, (2) a list of red flags a deterministic rule engine already found in that text, and (3) a machine learning classifier's assessment on how similar this language is to known scam patterns.

Your job:
1. Assess how likely this offer is to be a scam, referencing both the rules flags (Layer 1) and the machine learning classifier confidence (Layer 2) in your final synthesis (explanation).
2. Synthesize these inputs into a 2-4 sentence explanation addressed directly to the student.
3. Compute risk scores (0-100) across 5 categories for the radar chart visualization:
   - paymentRequestRisk: Risk of requests for training fees, laptop shipping keys, refundable security deposits, or direct bank transfer.
   - urgencyLanguage: Risk of manufactured panic, immediate joining mandates, or limited time frames.
   - domainLegitimacy: Risk of recruiting via Gmail/Yahoo domain or domain name spelling mismatches.
   - languageQuality: Risk of typos, irregular spacing, or all caps.
   - offerRealism: Risk of unrealistically high stipend/salaries compared to the effort described.

Guidance for scoring:
- 0-29 -> "Low Risk" (Clean, standard recruiting offers with no financial requests or pressure).
- 30-64 -> "Medium Risk" (Unverified sender or mild urgency, but no upfront payment demands).
- 65-100 -> "High Risk" (Fake offers, upfront fees/deposits, no interview selections, spoofed domains, Telegram/WhatsApp recruiting, or unrealistic earnings. For severe fake offers, score decisively high: 80-98%).
Be calibrated: a message with no red flags and a plausible, verifiable company should score low (0-15%).
Never invent facts about a specific real company. If information is insufficient, say so in the
explanation rather than guessing.`;
}

function buildUserMessage(input: OfferInput, ruleFlags: RuleFlag[], mlScore: number): string {
  const meta = [
    input.companyName ? `Company name given: ${input.companyName}` : null,
    input.senderEmail ? `Sender email: ${input.senderEmail}` : null,
    input.senderPhone ? `Sender phone: ${input.senderPhone}` : null,
    input.offeredAmount ? `Offered salary/stipend: ${input.offeredAmount}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const flagsList = ruleFlags.length
    ? ruleFlags.map((f) => `- [${f.severity.toUpperCase()}] ${f.label}: ${f.explanation}`).join("\n")
    : "(none triggered)";

  let textSection = "";
  if (input.offerText) {
    textSection = `OFFER TEXT:\n"""\n${input.offerText}\n"""`;
  } else if (input.image) {
    textSection = `OFFER IMAGE PROVIDED. Please read and extract the text from the attached image to perform your risk assessment.`;
  }

  return `${textSection}

ADDITIONAL FIELDS PROVIDED BY THE STUDENT:
${meta || "(none provided)"}

LAYER 1 RED FLAGS ALREADY DETECTED:
${flagsList}

LAYER 2 MACHINE LEARNING CLASSIFIER ANALYSIS:
- Classifier confidence score: ${mlScore}% match to historical scam text profiles.`;
}

function clampScore(n: unknown): number {
  const num = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function coerceVerdict(v: unknown, score: number): Verdict {
  if (typeof v === "string" && (VALID_VERDICTS as string[]).includes(v)) {
    return v as Verdict;
  }
  if (score >= 65) return "High Risk";
  if (score >= 30) return "Medium Risk";
  return "Low Risk";
}

/**
 * Race a promise against a timeout.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMsg));
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

/**
 * Query Groq AI (Llama 3.3 70B) for high-speed, high-rate-limit forensic evaluation.
 */
async function getGroqAssessment(
  apiKey: string,
  input: OfferInput,
  ruleFlags: RuleFlag[],
  mlScore: number
): Promise<LlmAssessment> {
  const systemPrompt = buildSystemInstruction() + `\nYou MUST return a JSON object with the exact keys: riskScore (integer 0-100), verdict ("Low Risk" | "Medium Risk" | "High Risk"), explanation (string), additionalFlags (string array), and categoryScores (object with paymentRequestRisk, urgencyLanguage, domainLegitimacy, languageQuality, offerRealism). Output ONLY valid raw JSON.`;

  const userMessage = buildUserMessage(input, ruleFlags, mlScore);

  const models = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "llama3-70b-8192",
    "llama3-8b-8192",
    "gemma2-9b-it",
    "mixtral-8x7b-32768"
  ];

  let rawText = "";
  let lastError = "";

  for (const model of models) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        rawText = data.choices?.[0]?.message?.content || "";
        if (rawText) {
          console.log(`Successfully generated analysis with Groq model: ${model}`);
          break;
        }
      } else {
        lastError = await res.text();
      }
    } catch (e: any) {
      lastError = e?.message || String(e);
    }
  }

  if (!rawText) {
    throw new Error(`All Groq models failed. Last error: ${lastError}`);
  }

  const parsed = JSON.parse(rawText);
  const riskScore = clampScore(parsed.riskScore);
  const verdict = coerceVerdict(parsed.verdict, riskScore);
  const explanation =
    typeof parsed.explanation === "string" && parsed.explanation.trim().length > 0
      ? parsed.explanation.trim()
      : "The model did not return an explanation.";
  const additionalFlags = Array.isArray(parsed.additionalFlags)
    ? parsed.additionalFlags.filter((f: unknown): f is string => typeof f === "string")
    : [];

  const categoryScores = {
    paymentRequestRisk: clampScore(parsed.categoryScores?.paymentRequestRisk),
    urgencyLanguage: clampScore(parsed.categoryScores?.urgencyLanguage),
    domainLegitimacy: clampScore(parsed.categoryScores?.domainLegitimacy),
    languageQuality: clampScore(parsed.categoryScores?.languageQuality),
    offerRealism: clampScore(parsed.categoryScores?.offerRealism),
  };

  return { riskScore, verdict, explanation, additionalFlags, categoryScores };
}

/**
 * Call Groq (preferred) or Gemini to get the LLM assessment.
 * Throws on any failure so the caller (the API route) can decide how to gracefully degrade.
 */
export async function getLlmAssessment(
  input: OfferInput,
  ruleFlags: RuleFlag[],
  mlScore: number
): Promise<LlmAssessment> {
  const groqApiKey = process.env.GROQ_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  // 1. Try Groq AI (Llama 3.3 70B) first if key is configured
  if (groqApiKey && groqApiKey.trim().length > 0) {
    try {
      console.log("Evaluating risk using Groq AI (Llama 3.3 70B)...");
      return await getGroqAssessment(groqApiKey.trim(), input, ruleFlags, mlScore);
    } catch (groqErr) {
      console.warn("Groq AI evaluation failed, attempting Gemini fallback:", groqErr);
    }
  }

  // 2. Fall back to Gemini if configured
  if (!geminiApiKey) {
    throw new Error("Neither GROQ_API_KEY nor GEMINI_API_KEY is configured.");
  }

  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

  const contents: any[] = [];
  if (input.image) {
    contents.push({
      inlineData: {
        data: input.image.data,
        mimeType: input.image.mimeType,
      },
    });
  }
  contents.push({
    text: buildUserMessage(input, ruleFlags, mlScore),
  });

  const isImage = !!input.image;
  const timeoutMs = isImage ? 30000 : 20000; // 30 seconds for images, 20 seconds for text

  async function makeCall() {
    return ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: buildSystemInstruction() + "\nYou MUST return a JSON object with properties: riskScore (integer 0-100), verdict (string), explanation (string), additionalFlags (string array), and categoryScores (object containing keys paymentRequestRisk, urgencyLanguage, domainLegitimacy, languageQuality, offerRealism). Output ONLY valid raw JSON.",
        responseMimeType: "application/json",
      },
    });
  }

  let response: any;
  try {
    response = await withTimeout(
      makeCall(),
      timeoutMs,
      `Gemini API call timed out after ${timeoutMs / 1000} seconds`
    );
  } catch (err: any) {
    console.warn("First Gemini attempt failed/timed out, retrying once...", err?.message || err);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    response = await withTimeout(
      makeCall(),
      timeoutMs,
      `Gemini API retry timed out after ${timeoutMs / 1000} seconds`
    );
  }

  const rawText = response.text;
  if (!rawText) {
    throw new Error("Gemini response contained no text content.");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error("Failed to parse Gemini response as JSON.");
  }

  const riskScore = clampScore(parsed.riskScore);
  const verdict = coerceVerdict(parsed.verdict, riskScore);
  const explanation =
    typeof parsed.explanation === "string" && parsed.explanation.trim().length > 0
      ? parsed.explanation.trim()
      : "The model did not return an explanation.";
  const additionalFlags = Array.isArray(parsed.additionalFlags)
    ? parsed.additionalFlags.filter((f: unknown): f is string => typeof f === "string")
    : [];

  const categoryScores = {
    paymentRequestRisk: clampScore(parsed.categoryScores?.paymentRequestRisk),
    urgencyLanguage: clampScore(parsed.categoryScores?.urgencyLanguage),
    domainLegitimacy: clampScore(parsed.categoryScores?.domainLegitimacy),
    languageQuality: clampScore(parsed.categoryScores?.languageQuality),
    offerRealism: clampScore(parsed.categoryScores?.offerRealism),
  };

  return { riskScore, verdict, explanation, additionalFlags, categoryScores };
}
