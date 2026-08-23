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
- 0-29 -> "Low Risk"
- 30-64 -> "Medium Risk"
- 65-100 -> "High Risk"
Be calibrated: a message with no red flags and a plausible, verifiable company should score low.
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
 * Call Gemini to get the LLM assessment. Throws on any failure so the caller
 * (the API route) can decide how to gracefully degrade to rule-based-only.
 */
export async function getLlmAssessment(
  input: OfferInput,
  ruleFlags: RuleFlag[],
  mlScore: number
): Promise<LlmAssessment> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      riskScore: {
        type: Type.INTEGER,
        description: "An integer 0-100, 0 = clearly legitimate, 100 = almost certainly a scam.",
      },
      verdict: {
        type: Type.STRING,
        enum: ["Low Risk", "Medium Risk", "High Risk"],
        description: "The risk verdict mapping: Low Risk (0-29), Medium Risk (30-64), High Risk (65-100).",
      },
      explanation: {
        type: Type.STRING,
        description: "2-4 sentences, plain English, addressed directly to the student, explaining the overall assessment, synthesizing the rule-based flags (Layer 1) and the ML score (Layer 2) into a cohesive warning.",
      },
      additionalFlags: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
        },
        description: "Short strings for any NEW concerns you noticed that were NOT in the provided rule flags list; empty array if none.",
      },
      categoryScores: {
        type: Type.OBJECT,
        properties: {
          paymentRequestRisk: {
            type: Type.INTEGER,
            description: "Risk score (0-100) based on upfront fees, payments requested, or sensitive banking details.",
          },
          urgencyLanguage: {
            type: Type.INTEGER,
            description: "Risk score (0-100) based on pressure tactics, quick response times, or slot limitations.",
          },
          domainLegitimacy: {
            type: Type.INTEGER,
            description: "Risk score (0-100) based on domain discrepancies or consumer email handles.",
          },
          languageQuality: {
            type: Type.INTEGER,
            description: "Risk score (0-100) based on typos, casing abnormalities, or structural grammar flaws.",
          },
          offerRealism: {
            type: Type.INTEGER,
            description: "Risk score (0-100) based on role tasks vs compensation mismatch.",
          },
        },
        required: ["paymentRequestRisk", "urgencyLanguage", "domainLegitimacy", "languageQuality", "offerRealism"],
      },
    },
    required: ["riskScore", "verdict", "explanation", "additionalFlags", "categoryScores"],
  };

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

  const responsePromise = ai.models.generateContent({
    model: MODEL,
    contents,
    config: {
      systemInstruction: buildSystemInstruction() + "\nYou MUST return a JSON object with properties: riskScore (integer 0-100), verdict (string), explanation (string), additionalFlags (string array), and categoryScores (object containing keys paymentRequestRisk, urgencyLanguage, domainLegitimacy, languageQuality, offerRealism). Output ONLY valid raw JSON.",
      responseMimeType: "application/json",
    },
  });

  const response = await withTimeout(
    responsePromise,
    5500,
    "Gemini API call timed out after 5.5 seconds"
  );

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
