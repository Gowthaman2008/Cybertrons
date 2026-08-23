/**
 * Shared types for the ScamCheck analysis pipeline.
 *
 * Pipeline shape:
 *   raw input  ->  rule-based detector (lib/rules.ts)  ->  RuleFlag[]
 *   RuleFlag[] + raw text  ->  LLM layer (lib/llm.ts)  ->  LlmAssessment
 *   RuleFlag[] + LlmAssessment  ->  AnalysisResult (returned to the client)
 */

export type Severity = "low" | "medium" | "high";

/** A single deterministic red flag produced by the rule-based detector. */
export interface RuleFlag {
  /** Stable machine-readable id, e.g. "upfront-payment". */
  id: string;
  /** Short label shown as a chip/tag in the UI. */
  label: string;
  /** Plain-English explanation of why this was flagged. */
  explanation: string;
  /** How much this single flag contributes to the deterministic score. */
  severity: Severity;
  /** The substring (if any) from the input that triggered the match. */
  evidence?: string;
}

/** Optional structured fields the user can supply alongside the raw offer text. */
export interface OfferInput {
  offerText: string;
  senderEmail?: string;
  senderPhone?: string;
  companyName?: string;
  offeredAmount?: string;
  image?: {
    data: string; // Base64 string (excluding prefix)
    mimeType: string; // e.g. "image/png" or "image/jpeg"
  };
}

export type Verdict = "Low Risk" | "Medium Risk" | "High Risk";

/** The strict JSON shape we require back from the LLM layer. */
export interface LlmAssessment {
  riskScore: number; // 0-100
  verdict: Verdict;
  explanation: string;
  additionalFlags: string[];
  categoryScores: {
    paymentRequestRisk: number; // 0-100
    urgencyLanguage: number; // 0-100
    domainLegitimacy: number; // 0-100
    languageQuality: number; // 0-100
    offerRealism: number; // 0-100
  };
}

/** Final combined result sent to the frontend. */
export interface AnalysisResult {
  ruleFlags: RuleFlag[];
  ruleScore: number; // 0-100, deterministic-only score
  mlScore: number; // 0-100, Layer 2 ML classifier confidence
  similarityMatch: {
    patternName: string;
    similarityScore: number; // 0-100
    description: string;
  } | null;
  llm: LlmAssessment | null;
  llmUnavailable: boolean;
  finalScore: number; // what the UI treats as authoritative
  finalVerdict: Verdict;
  caseId: string;
  timestamp: number;
}
