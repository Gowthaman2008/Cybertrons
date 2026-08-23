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
  return `You are a fraud-detection assistant embedded in a student-facing tool called ScamCheck.
You will be given (1) the raw text (or an image of a document) of a job/internship offer a student received, and (2) a list of
red flags a deterministic rule engine already found in that text.

Your job: assess how likely this offer is to be a scam, using the rule flags as a starting point but
also reading the raw text or the uploaded image for anything the rules missed (tone, plausibility, internal inconsistencies,
role/pay mismatch, requests that don't fit how real hiring works, etc).

Guidance for scoring:
- 0-29 -> "Low Risk"
- 30-64 -> "Medium Risk"
- 65-100 -> "High Risk"
Be calibrated: a message with no red flags and a plausible, verifiable company should score low.
Never invent facts about a specific real company. If information is insufficient, say so in the
explanation rather than guessing.`;
}

function buildUserMessage(input: OfferInput, ruleFlags: RuleFlag[]): string {
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

RULE-BASED FLAGS ALREADY DETECTED:
${flagsList}`;
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
 * Call Gemini to get the LLM assessment. Throws on any failure so the caller
 * (the API route) can decide how to gracefully degrade to rule-based-only.
 */
export async function getLlmAssessment(
  input: OfferInput,
  ruleFlags: RuleFlag[]
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
        description: "2-4 sentences, plain English, addressed directly to the student, explaining the overall assessment and what stands out most — do not just repeat the rule flags verbatim, synthesize.",
      },
      additionalFlags: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
        },
        description: "Short strings for any NEW concerns you noticed that were NOT in the provided rule flags list; empty array if none.",
      },
    },
    required: ["riskScore", "verdict", "explanation", "additionalFlags"],
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
    text: buildUserMessage(input, ruleFlags),
  });

  const response = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: {
      systemInstruction: buildSystemInstruction(),
      responseMimeType: "application/json",
      responseJsonSchema: responseSchema,
    },
  });

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

  return { riskScore, verdict, explanation, additionalFlags };
}
