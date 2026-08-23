"use client";

import { useState, useEffect } from "react";
import { AnalysisResult } from "@/lib/types";
import ScoreGauge from "./ScoreGauge";
import EvidenceHighlighter from "./EvidenceHighlighter";
import RadarChart from "./RadarChart";
import ActionStation from "./ActionStation";

function recommendationFor(finalScore: number): string {
  if (finalScore >= 65) {
    return "Do not pay, share IDs, or click links. Verify directly through the company's official careers page or a known HR contact before taking any further action.";
  }
  if (finalScore >= 30) {
    return "Proceed carefully. Verify the sender and company independently — call the company's listed number or check their official site — before sharing any personal information.";
  }
  return "No major red flags found, but it's still good practice to verify the sender's email domain and confirm the role on the company's official careers page before proceeding.";
}

export default function ResultsPanel({ result, offerText }: { result: AnalysisResult; offerText: string }) {
  const { ruleFlags, ruleScore, mlScore, similarityMatch, llm, llmUnavailable, finalScore, finalVerdict, caseId, timestamp } = result;

  const [showPsychology, setShowPsychology] = useState(false);
  const [psychologyText, setPsychologyText] = useState<string | null>(null);
  const [loadingPsychology, setLoadingPsychology] = useState(false);

  async function handleTogglePsychology() {
    if (showPsychology) {
      setShowPsychology(false);
      return;
    }

    setShowPsychology(true);
    if (psychologyText) return; // already loaded

    setLoadingPsychology(true);
    try {
      const res = await fetch("/api/psychology", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerText,
          companyName: llm?.additionalFlags?.find((f: string) => f.toLowerCase().includes("company")) || "Acclaimed Recruiter",
          verdict: finalVerdict,
          riskScore: finalScore,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to load psychology analysis.");
      }

      const data = await res.json();
      setPsychologyText(data.psychology);
    } catch (err) {
      setPsychologyText("Unable to retrieve psychological tactics analysis. Please verify your Gemini API key is configured.");
    } finally {
      setLoadingPsychology(false);
    }
  }

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Formatting case timestamp (preventing client-server timezone hydration mismatch)
  const dateStr = mounted
    ? new Date(timestamp).toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      })
    : "";

  return (
    <div className="bg-base-surface border border-base-border rounded-lg overflow-hidden animate-fade-in space-y-6 pb-6 shadow-xl">
      {/* CASE FILE HEADER */}
      <div className="bg-base-raised border-b border-base-border px-5 py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
        <div>
          <span className="text-[9px] font-mono uppercase text-brand-bright font-bold tracking-widest bg-brand-dim/15 px-2 py-0.5 rounded border border-brand-dim/30">
            forensic report
          </span>
          <h3 className="text-sm font-mono font-bold text-ink-primary mt-2">
            CASE #{caseId}
          </h3>
        </div>
        <div className="text-right text-[10px] font-mono text-ink-faint">
          <div>{dateStr}</div>
          <div>STATUS: COMPLETED</div>
        </div>
      </div>

      {/* VERDICT SUMMARY */}
      <div className="bg-scan-grid bg-grid border-b border-base-border px-5 sm:px-6 pt-2 pb-6">
        <ScoreGauge score={finalScore} verdict={finalVerdict} />
      </div>

      <div className="px-5 sm:px-6 space-y-6">
        {/* PIPELINE EVIDENCE BREAKDOWN */}
        <div>
          <h3 className="text-xs font-mono uppercase tracking-wider text-ink-faint mb-3">
            Evidence Pipeline Breakdown
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-base-bg border border-base-border rounded p-3">
              <div className="text-[10px] font-mono text-ink-muted uppercase">Layer 1: Rules</div>
              <div className="text-lg font-bold font-mono text-ink-primary mt-1">{ruleScore}%</div>
            </div>
            <div className="bg-base-bg border border-base-border rounded p-3">
              <div className="text-[10px] font-mono text-ink-muted uppercase">Layer 2: ML</div>
              <div className="text-lg font-bold font-mono text-ink-primary mt-1">{mlScore}%</div>
            </div>
            <div className="bg-base-bg border border-base-border rounded p-3">
              <div className="text-[10px] font-mono text-ink-muted uppercase">Layer 3: LLM</div>
              <div className="text-lg font-bold font-mono text-ink-primary mt-1">
                {llmUnavailable ? "N/A" : `${llm?.riskScore}%`}
              </div>
            </div>
          </div>
        </div>

        {/* EVIDENCE HIGHLIGHTER */}
        <div>
          <h3 className="text-xs font-mono uppercase tracking-wider text-ink-faint mb-2.5">
            Inline Document Evidence Review
          </h3>
          <EvidenceHighlighter text={offerText} flags={ruleFlags} />
          {ruleFlags.length > 0 && (
            <p className="text-[10px] font-mono text-ink-faint mt-1.5">
              💡 Hover/tap highlighted phrases to view specific rule violations.
            </p>
          )}
        </div>

        {/* RADAR CHART BREAKDOWN */}
        {llm?.categoryScores && (
          <div className="border-t border-base-border pt-5">
            <RadarChart scores={llm.categoryScores} riskVerdict={finalVerdict} />
          </div>
        )}

        {/* SIMILARITY MATCH CARD */}
        {similarityMatch && (
          <div className="bg-base-bg border border-base-border rounded-md p-4 animate-fade-in">
            <div className="flex justify-between items-center mb-1.5">
              <h4 className="text-[10px] font-mono uppercase text-brand-bright font-bold tracking-wider">
                Cosine Similarity Match
              </h4>
              <span className="text-xs font-mono font-semibold text-brand-bright bg-brand-dim/15 px-1.5 py-0.5 rounded border border-brand-dim/20">
                {similarityMatch.similarityScore}% match
              </span>
            </div>
            <h5 className="text-xs font-bold text-ink-primary mb-1">
              Pattern: {similarityMatch.patternName}
            </h5>
            <p className="text-[11px] leading-relaxed text-ink-muted">
              {similarityMatch.description}
            </p>
          </div>
        )}

        {/* LLM TEXT ASSESSMENT */}
        {llm && (
          <div className="border-t border-base-border pt-5">
            <h3 className="text-xs font-mono uppercase tracking-wider text-ink-faint mb-2">
              Forensic Synthesis
            </h3>
            <p className="text-sm text-ink-primary leading-relaxed">{llm.explanation}</p>
          </div>
        )}

        {/* PSYCHOLOGY EXPLAINER */}
        {llm && (
          <div className="border-t border-base-border pt-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-ink-faint">
                Psychology Explainer
              </h3>
              <button
                type="button"
                onClick={handleTogglePsychology}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-medium transition-all ${
                  showPsychology
                    ? "bg-brand text-white shadow"
                    : "bg-base-raised border border-base-border text-ink-primary hover:border-brand-bright"
                }`}
              >
                {showPsychology ? "hide explainer" : "show explainer"}
              </button>
            </div>

            {showPsychology && (
              <div className="bg-base-bg rounded border border-base-border p-4 animate-fade-in">
                {loadingPsychology ? (
                  <div className="flex flex-col items-center justify-center p-3 text-center">
                    <span className="w-5 h-5 rounded-full border-2 border-brand-bright/40 border-t-brand-bright animate-spin mb-2" />
                    <p className="text-[10px] text-ink-faint font-mono">Analyzing social engineering tactics using Gemini...</p>
                  </div>
                ) : (
                  <pre className="text-xs text-ink-primary font-body whitespace-pre-wrap leading-relaxed max-h-[220px] overflow-y-auto pr-1">
                    {psychologyText}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {/* RECOMMENDATION BLOCK */}
        <div className="rounded border border-brand/20 bg-brand-dim/5 px-4 py-3.5 mt-5">
          <h3 className="text-[10px] font-mono uppercase tracking-wider text-brand-bright mb-1">
            recommended course of action
          </h3>
          <p className="text-sm text-ink-primary leading-relaxed">
            {recommendationFor(finalScore)}
          </p>
        </div>

        {/* ACTION STATION */}
        {finalScore >= 30 && (
          <ActionStation result={result} offerText={offerText} />
        )}
      </div>
    </div>
  );
}
