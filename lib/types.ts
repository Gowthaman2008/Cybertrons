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
}

export type Verdict = "Low Risk" | "Medium Risk" | "High Risk";

/** The strict JSON shape we require back from the LLM layer. */
export interface LlmAssessment {
  riskScore: number; // 0-100
  verdict: Verdict;
  explanation: string;
  additionalFlags: string[];
}

/** Final combined result sent to the frontend. */
export interface AnalysisResult {
  ruleFlags: RuleFlag[];
  ruleScore: number; // 0-100, deterministic-only score
  llm: LlmAssessment | null;
  /** True if the LLM call failed and we fell back to rule-based-only output. */
  llmUnavailable: boolean;
  finalScore: number; // what the UI treats as authoritative
  finalVerdict: Verdict;
}
