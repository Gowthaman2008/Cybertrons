"use client";

import { useState } from "react";
import { AnalysisResult } from "@/lib/types";

export default function ActionStation({ result, offerText }: { result: AnalysisResult; offerText: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"rejection" | "report" | null>(null);
  const [copied, setCopied] = useState(false);

  const { finalScore, finalVerdict, llm } = result;

  async function generateDraft(type: "rejection" | "report") {
    setIsLoading(true);
    setDraft(null);
    setActiveType(type);
    setCopied(false);

    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: type,
          offerText: offerText,
          companyName: llm?.additionalFlags?.find((f: string) => f.toLowerCase().includes("company")) || "Acclaimed Recruiter",
          riskScore: finalScore,
          verdict: finalVerdict,
          explanation: llm?.explanation || "This offer has suspicious properties.",
          additionalFlags: llm?.additionalFlags || [],
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate draft.");
      }

      const data = await res.json();
      setDraft(data.draft);
    } catch (err) {
      alert("Error generating action template. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleCopy() {
    if (!draft) return;
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="border-t border-base-border pt-5 mt-5">
      <h3 className="text-xs font-mono uppercase tracking-wider text-ink-faint mb-3">
        AI Action Station
      </h3>
      <p className="text-xs text-ink-muted mb-4">
        Safely exit the conversation or report this scan to university placement cells or authorities.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          type="button"
          onClick={() => generateDraft("rejection")}
          className={`flex items-center justify-center gap-1.5 rounded bg-base-raised border px-3 py-2 text-xs font-medium transition-colors ${
            activeType === "rejection" && draft
              ? "border-brand text-brand-bright bg-brand-dim/10"
              : "border-base-border text-ink-primary hover:border-brand-bright"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          Draft Rejection
        </button>

        <button
          type="button"
          onClick={() => generateDraft("report")}
          className={`flex items-center justify-center gap-1.5 rounded bg-base-raised border px-3 py-2 text-xs font-medium transition-colors ${
            activeType === "report" && draft
              ? "border-brand text-brand-bright bg-brand-dim/10"
              : "border-base-border text-ink-primary hover:border-brand-bright"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Draft Incident Report
        </button>
      </div>

      {isLoading && (
        <div className="bg-base-raised rounded border border-base-border p-4 flex flex-col items-center justify-center text-center">
          <span className="w-5 h-5 rounded-full border-2 border-brand-bright/40 border-t-brand-bright animate-spin mb-2" />
          <p className="text-xs text-ink-muted font-mono">Generating custom template using Gemini...</p>
        </div>
      )}

      {!isLoading && draft && (
        <div className="bg-base-bg rounded border border-base-border p-4 relative animate-fade-in">
          <button
            type="button"
            onClick={handleCopy}
            className="absolute top-3 right-3 rounded bg-base-raised border border-base-border hover:border-brand-bright px-2 py-1 text-[10px] font-mono text-ink-primary flex items-center gap-1 shadow transition-colors"
          >
            {copied ? (
              <>
                <svg className="w-3 h-3 text-risk-low" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy Draft
              </>
            )}
          </button>
          
          <h4 className="text-[10px] font-mono uppercase text-ink-faint mb-2">
            Generated {activeType === "rejection" ? "Rejection Message" : "Cybercrime Incident Report"}
          </h4>
          <pre className="text-xs text-ink-primary whitespace-pre-wrap font-body leading-relaxed max-h-[220px] overflow-y-auto pr-2">
            {draft}
          </pre>
        </div>
      )}
    </div>
  );
}
