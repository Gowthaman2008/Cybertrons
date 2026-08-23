"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import OfferForm from "@/components/OfferForm";
import ResultsPanel from "@/components/ResultsPanel";
import ScanningState from "@/components/ScanningState";
import HistoryPanel, { HistoryEntry } from "@/components/HistoryPanel";
import ScamGame from "@/components/ScamGame";
import { CyberMatrixBg } from "@/components/ui/cyber-matrix-hero";
import { CommitsGrid } from "@/components/ui/commits-grid";
import { AnalysisResult, OfferInput } from "@/lib/types";

const MAX_HISTORY = 8;

function Dashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [currentOfferText, setCurrentOfferText] = useState("");
  const [activeTab, setActiveTab] = useState<"scan" | "game">("scan");
  const [view, setView] = useState<"input" | "report">("input");
  const [showIntro, setShowIntro] = useState(true);

  const searchParams = useSearchParams();

  // Intro animation timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  // Trigger automatic scan if 'text' query parameter is present on mount
  useEffect(() => {
    const textParam = searchParams.get("text");
    if (textParam) {
      handleSubmit({ offerText: textParam });
    }
  }, [searchParams]);

  async function handleSubmit(input: OfferInput) {
    setIsLoading(true);
    setErrorMessage(null);
    setResult(null);
    setCurrentOfferText(input.offerText || "");
    setView("input"); // Stay on input page while loading scanning animation

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
      setView("report"); // Switch to separate report view upon successful analysis

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

  // Reload history logs and render in report view
  function handleSelectHistory(entry: HistoryEntry) {
    setResult(entry.result);
    setActiveId(entry.id);
    setErrorMessage(null);
    setCurrentOfferText(entry.result.llm?.explanation || "");
    setView("report");
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Cyber Hacking Intro Loader */}
      <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0F14] px-4 transition-opacity duration-700 ${showIntro ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <div className="flex flex-col items-center max-w-xl w-full text-center">
          <div className="transform scale-[1.3] sm:scale-[2.0] md:scale-[2.4] transition-transform duration-300">
            <CommitsGrid text="CYBER" />
          </div>
        </div>
      </div>

      <Header />

      <main className="flex-1 mx-auto max-w-5xl w-full px-5 py-8">
        {/* Navigation Tabs */}
        <div className="flex border-b border-base-border mb-8 gap-6 text-sm font-mono select-none">
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
            {isLoading ? (
              // Loading State occupies the view during scan
              <div className="max-w-2xl mx-auto py-12">
                <ScanningState />
              </div>
            ) : view === "input" ? (
              // View 1: Paste details and upload documents
              <div className="max-w-3xl mx-auto space-y-8">
                <div className="mb-4">
                  <h2 className="font-display font-600 text-2xl sm:text-3xl tracking-tight text-ink-primary mb-2">
                    Check an offer before you respond
                  </h2>
                  <p className="text-sm sm:text-base text-ink-muted leading-relaxed">
                    Paste the internship or job message you received, or upload a screenshot. ScamCheck runs a deterministic
                    red-flag scan and an AI review together, then explains exactly what looks off.
                  </p>
                </div>

                <OfferForm onSubmit={handleSubmit} isLoading={isLoading} errorMessage={errorMessage} />

                {history.length > 0 && (
                  <div className="pt-4 animate-fade-in">
                    <HistoryPanel entries={history} onSelect={handleSelectHistory} activeId={activeId} />
                  </div>
                )}
              </div>
            ) : (
              // View 2: Separate, dedicated Forensic Report view
              <div className="max-w-3xl mx-auto">
                <button
                  type="button"
                  onClick={() => setView("input")}
                  className="mb-6 inline-flex items-center gap-2 text-xs font-mono font-bold text-brand-bright hover:underline transition-all transform active:translate-x-[-2px]"
                >
                  ← Back to Scanner
                </button>
                {result && <ResultsPanel result={result} offerText={currentOfferText} />}
              </div>
            )}
          </div>
        ) : (
          // Tab 2: Scam game simulator
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

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-base-bg text-ink-primary flex items-center justify-center font-mono">
        Loading Scam Forensics Lab...
      </div>
    }>
      <CyberMatrixBg>
        <Dashboard />
      </CyberMatrixBg>
    </Suspense>
  );
}
