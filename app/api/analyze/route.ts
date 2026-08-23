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

  const offerText = typeof body?.offerText === "string" ? body.offerText.trim() : "";
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
    if (!offerText) {
      return NextResponse.json(
        {
          error: "The AI assessment service is currently unavailable. Since you uploaded an image-only request, we cannot perform the scan. Please paste the offer text instead to run a rule-based check.",
        },
        { status: 503, headers: CORS_HEADERS }
      );
    }
  }

  // Combined weighted score calculation: 20% Rules + 20% ML + 60% LLM
  const finalScore = llm
    ? Math.round(ruleScore * 0.2 + mlScore * 0.2 + llm.riskScore * 0.6)
    : Math.round(ruleScore * 0.5 + mlScore * 0.5);

  const finalVerdict = verdictFromScore(finalScore);

  const caseId = "SF-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000);
  const timestamp = Date.now();

  const result: AnalysisResult = {
    ruleFlags,
    ruleScore,
    mlScore,
    similarityMatch,
    llm,
    llmUnavailable,
    finalScore,
    finalVerdict,
    caseId,
    timestamp,
  };

  return NextResponse.json(result, { headers: CORS_HEADERS });
}
