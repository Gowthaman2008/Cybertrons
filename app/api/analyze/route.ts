import { NextRequest, NextResponse } from "next/server";
import { runRuleBasedChecks, computeRuleScore } from "@/lib/rules";
import { getLlmAssessment } from "@/lib/llm";
import { classifyText } from "@/lib/classifier";
import { findClosestPattern } from "@/lib/patternLibrary";
import { AnalysisResult, OfferInput, Verdict } from "@/lib/types";

export const runtime = "nodejs";

const MAX_INPUT_LENGTH = 8000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}

function verdictFromScore(score: number): Verdict {
  if (score >= 65) return "High Risk";
  if (score >= 30) return "Medium Risk";
  return "Low Risk";
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  let offerText = typeof body?.offerText === "string" ? body.offerText.trim() : "";
  const image = body?.image;
  let parsedImage: { data: string; mimeType: string } | undefined = undefined;
  if (image && typeof image.data === "string" && typeof image.mimeType === "string") {
    // Strip any potential base64 prefix just in case the client sent it
    const dataCleaned = image.data.replace(/^data:image\/\w+;base64,/, "");
    parsedImage = {
      data: dataCleaned,
      mimeType: image.mimeType,
    };
  }

  if (!offerText && !parsedImage) {
    return badRequest("Please paste the offer message or upload an image before running a check.");
  }

  if (offerText.length > MAX_INPUT_LENGTH) {
    return badRequest(`Offer text is too long (max ${MAX_INPUT_LENGTH} characters).`);
  }

  const input: OfferInput = {
    offerText,
    senderEmail: typeof body?.senderEmail === "string" ? body.senderEmail.trim() : undefined,
    senderPhone: typeof body?.senderPhone === "string" ? body.senderPhone.trim() : undefined,
    companyName: typeof body?.companyName === "string" ? body.companyName.trim() : undefined,
    offeredAmount: typeof body?.offeredAmount === "string" ? body.offeredAmount.trim() : undefined,
    image: parsedImage,
  };

  // Step 1: deterministic rule-based pass (Layer 1).
  const ruleFlags = runRuleBasedChecks(input);
  const ruleScore = computeRuleScore(ruleFlags);

  // Layer 2: Lightweight ML classifier score (0-100)
  const mlScore = Math.round(classifyText(offerText) * 100);

  // Cosine Similarity Match against pattern library
  const similarityMatch = findClosestPattern(offerText);

  // Step 3: LLM pass (Layer 3).
  let llm = null;
  let llmUnavailable = false;
  try {
    llm = await getLlmAssessment(input, ruleFlags, mlScore);
  } catch (err) {
    llmUnavailable = true;
    console.error("LLM assessment failed, falling back to rule-based score:", err);
  }

  // Combined weighted score calculation: 20% Rules + 20% ML + 60% LLM
  const finalScore = llm
    ? Math.round(ruleScore * 0.2 + mlScore * 0.2 + llm.riskScore * 0.6)
    : Math.round(ruleScore * 0.5 + mlScore * 0.5);

  const finalVerdict = verdictFromScore(finalScore);

  const caseId = "SF-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000);
  const timestamp = Date.now();

  const computedFallbackLlm = {
    riskScore: finalScore,
    verdict: finalVerdict,
    explanation: offerText
      ? `⚠️ [OFFLINE FALLBACK] The AI scan timed out or was unavailable. We analyzed the text using local deterministic rules and ML models. Detected ${ruleFlags.length} red flag(s).`
      : "⚠️ [OFFLINE FALLBACK] The AI scan timed out or was unavailable. No readable text could be extracted from the uploaded image. Please verify manually or paste the text.",
    additionalFlags: ruleFlags.map(f => f.label),
    categoryScores: {
      paymentRequestRisk: ruleFlags.some(f => f.id === "upfront-payment" || f.id === "suspicious-payment-rail" || f.id === "sensitive-info-request") ? 85 : 10,
      urgencyLanguage: ruleFlags.some(f => f.id === "urgency-pressure") ? 85 : 10,
      domainLegitimacy: ruleFlags.some(f => f.id === "suspicious-tld" || f.id === "free-email-domain" || f.id === "domain-mismatch") ? 90 : 10,
      languageQuality: ruleFlags.some(f => f.id === "grammar-quality") ? 80 : 10,
      offerRealism: ruleFlags.some(f => f.id === "salary-contradiction" || f.id === "job-type-contradiction" || f.id === "unrealistic-earnings") ? 85 : 10,
    }
  };

  const result: AnalysisResult = {
    ruleFlags,
    ruleScore,
    mlScore,
    similarityMatch,
    llm: llm || computedFallbackLlm,
    llmUnavailable,
    finalScore,
    finalVerdict,
    caseId,
    timestamp,
    extractedText: offerText || undefined,
  };

  return NextResponse.json(result, { headers: CORS_HEADERS });
}
