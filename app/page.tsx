"use client";

import { useState } from "react";
import Header from "@/components/Header";
import OfferForm from "@/components/OfferForm";
import ResultsPanel from "@/components/ResultsPanel";
import ScanningState from "@/components/ScanningState";
import HistoryPanel, { HistoryEntry } from "@/components/HistoryPanel";
import { AnalysisResult, OfferInput } from "@/lib/types";

const MAX_HISTORY = 8;

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  async function handleSubmit(input: OfferInput) {
    setIsLoading(true);
    setErrorMessage(null);
    setResult(null);

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
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 mx-auto max-w-5xl w-full px-5 py-10">
        <div className="mb-8 max-w-2xl">
          <h2 className="font-display font-600 text-2xl sm:text-3xl tracking-tight text-ink-primary mb-2">
            Check an offer before you respond
          </h2>
          <p className="text-sm sm:text-base text-ink-muted leading-relaxed">
            Paste the internship or job message you received. ScamCheck runs a deterministic
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
            {!isLoading && result && <ResultsPanel result={result} />}
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
