import { NextRequest, NextResponse } from "next/server";
import { runRuleBasedChecks, computeRuleScore } from "@/lib/rules";
import { getLlmAssessment } from "@/lib/llm";
import { AnalysisResult, OfferInput, Verdict } from "@/lib/types";

export const runtime = "nodejs";

const MAX_INPUT_LENGTH = 8000;

function verdictFromScore(score: number): Verdict {
  if (score >= 65) return "High Risk";
  if (score >= 30) return "Medium Risk";
  return "Low Risk";
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
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

  // Step 1: deterministic rule-based pass. Always succeeds, no network call.
  const ruleFlags = runRuleBasedChecks(input);
  const ruleScore = computeRuleScore(ruleFlags);

  // Step 2: LLM pass. May fail (missing key, rate limit, network) — degrade gracefully.
  let llm = null;
  let llmUnavailable = false;
  try {
    llm = await getLlmAssessment(input, ruleFlags);
  } catch (err) {
    llmUnavailable = true;
    console.error("LLM assessment failed, falling back to rule-based score:", err);
    if (!offerText) {
      return NextResponse.json(
        {
          error: "The AI assessment service is currently unavailable. Since you uploaded an image-only request, we cannot perform the scan. Please paste the offer text instead to run a rule-based check.",
        },
        { status: 503 }
      );
    }
  }

  const finalScore = llm ? llm.riskScore : ruleScore;
  const finalVerdict = llm ? llm.verdict : verdictFromScore(ruleScore);

  const result: AnalysisResult = {
    ruleFlags,
    ruleScore,
    llm,
    llmUnavailable,
    finalScore,
    finalVerdict,
  };

  return NextResponse.json(result);
}
