"use client";

import { useState } from "react";
import Header from "@/components/Header";
import OfferForm from "@/components/OfferForm";
import ResultsPanel from "@/components/ResultsPanel";
import ScanningState from "@/components/ScanningState";
import HistoryPanel, { HistoryEntry } from "@/components/HistoryPanel";
import ScamGame from "@/components/ScamGame";
import { AnalysisResult, OfferInput } from "@/lib/types";

const MAX_HISTORY = 8;

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [currentOfferText, setCurrentOfferText] = useState("");
  const [activeTab, setActiveTab] = useState<"scan" | "game">("scan");

  async function handleSubmit(input: OfferInput) {
    setIsLoading(true);
    setErrorMessage(null);
    setResult(null);
    setCurrentOfferText(input.offerText || "");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        let message = "Something went wrong while analyzing this offer. Please try again.";
        try {
          const errBody = await res.json();
          if (errBody?.error) message = errBody.error;
        } catch {
          // response wasn't JSON — keep the generic message
        }
        setErrorMessage(message);
        return;
      }

      const data: AnalysisResult = await res.json();
      setResult(data);

      const previewText = input.offerText
        ? input.offerText.slice(0, 70) + (input.offerText.length > 70 ? "…" : "")
        : "Image Scan - " + (input.companyName || "Unknown Company");

      const entry: HistoryEntry = {
        id: `${Date.now()}`,
        preview: previewText,
        result: data,
        timestamp: Date.now(),
      };
      setActiveId(entry.id);
      setHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY));
    } catch (err) {
      setErrorMessage(
        "Couldn't reach the analysis service. Check your connection and try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleSelectHistory(entry: HistoryEntry) {
    setResult(entry.result);
    setActiveId(entry.id);
    setErrorMessage(null);
    // Best-effort recovery of preview text for ActionStation if needed
    setCurrentOfferText(entry.result.llm?.explanation || "");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 mx-auto max-w-5xl w-full px-5 py-8">
        {/* Navigation Tabs */}
        <div className="flex border-b border-base-border mb-8 gap-6 text-sm font-mono">
          <button
            type="button"
            onClick={() => setActiveTab("scan")}
            className={`pb-3 transition-all relative ${
              activeTab === "scan"
                ? "text-brand-bright font-semibold border-b-2 border-brand-bright"
                : "text-ink-muted hover:text-ink-primary"
            }`}
          >
            🔍 Opportunity Scanner
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("game")}
            className={`pb-3 transition-all relative ${
              activeTab === "game"
                ? "text-brand-bright font-semibold border-b-2 border-brand-bright"
                : "text-ink-muted hover:text-ink-primary"
            }`}
          >
            🎮 Scam Awareness Game
          </button>
        </div>

        {activeTab === "scan" ? (
          <div>
            <div className="mb-8 max-w-2xl">
              <h2 className="font-display font-600 text-2xl sm:text-3xl tracking-tight text-ink-primary mb-2">
                Check an offer before you respond
              </h2>
              <p className="text-sm sm:text-base text-ink-muted leading-relaxed">
                Paste the internship or job message you received, or upload a screenshot. ScamCheck runs a deterministic
                red-flag scan and an AI review together, then explains exactly what looks off — so
                you can verify before you act, not after.
              </p>
            </div>

            <div className="grid lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 space-y-6">
                <OfferForm onSubmit={handleSubmit} isLoading={isLoading} errorMessage={errorMessage} />
                {history.length > 0 && (
                  <div className="lg:hidden">
                    <HistoryPanel entries={history} onSelect={handleSelectHistory} activeId={activeId} />
                  </div>
                )}
              </div>

              <div className="lg:col-span-2 space-y-6">
                {isLoading && <ScanningState />}
                {!isLoading && result && <ResultsPanel result={result} offerText={currentOfferText} />}
                {!isLoading && !result && (
                  <div className="border border-dashed border-base-border rounded-lg px-6 py-10 text-center">
                    <p className="text-sm text-ink-faint font-mono">
                      results will appear here after you run a check
                    </p>
                  </div>
                )}
                {history.length > 0 && (
                  <div className="hidden lg:block">
                    <HistoryPanel entries={history} onSelect={handleSelectHistory} activeId={activeId} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-2">
            <div className="mb-8 text-center max-w-xl mx-auto">
              <h2 className="font-display font-600 text-2xl sm:text-3xl tracking-tight text-ink-primary mb-2">
                Scam Awareness Simulator
              </h2>
              <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                Practice identifying recruitment scams. Swipe through realistic internship messages, decide if they are safe or scams, and learn the red flags to look out for.
              </p>
            </div>
            <ScamGame />
          </div>
        )}
      </main>

      <footer className="border-t border-base-border py-6">
        <div className="mx-auto max-w-5xl px-5 text-xs text-ink-faint font-mono">
          ScamCheck is a decision aid, not a guarantee. Always verify independently with the
          company before sharing money or personal information.
        </div>
      </footer>
    </div>
  );
}
