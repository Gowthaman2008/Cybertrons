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
import { SparklesCore } from "@/components/ui/sparkles";
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
  const [view, setView] = useState<"landing" | "input" | "report">("landing");
  const [showIntro, setShowIntro] = useState(true);
  const [showModal, setShowModal] = useState(false);

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
      <div
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#000000] px-4 transition-opacity duration-700 ${showIntro ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(0, 255, 102, 0.08) 1.5px, transparent 0)",
          backgroundSize: "24px 24px"
        }}
      >
        <div className="flex flex-col items-center max-w-2xl w-full text-center">
          <div className="transform scale-[0.9] sm:scale-[1.1] md:scale-[1.3] transition-transform duration-300">
            <CommitsGrid text="CYBERTRONS" />
          </div>
          <h2 className="mt-6 font-display font-bold text-xs sm:text-sm tracking-[0.3em] uppercase text-brand-bright drop-shadow-[0_0_12px_rgba(57,255,20,0.5)] select-none">
            Scam Check
          </h2>
        </div>

        {/* Footer brand label positioned at the bottom of the viewport */}
        <p className="absolute bottom-8 text-[11px] sm:text-xs font-body tracking-[0.15em] text-white/45 uppercase select-none">
          TEAM ID : <span className="font-semibold text-white/85">HS2026-086</span>
        </p>
      </div>

      <Header showModal={showModal} setShowModal={setShowModal} onLogoClick={() => { setView("landing"); setActiveTab("scan"); }} />

      <main className="flex-1 mx-auto max-w-5xl w-full px-5 py-8">
        {/* Navigation Tabs */}
        {view !== "landing" && (
          <div className="flex border-b border-base-border mb-8 gap-6 text-sm font-display select-none">
            <button
              type="button"
              onClick={() => {
                setActiveTab("scan");
                setView("input");
              }}
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
        )}

          {view === "landing" ? (
          // Landing Page: Full details about ScamCheck
          <div className="max-w-4xl mx-auto space-y-12 py-4 animate-fade-in">
            {/* Hero section */}
            <div className="relative text-center space-y-6 max-w-2xl mx-auto py-8 rounded-2xl overflow-hidden border border-base-border/30 bg-base-surface/20 backdrop-blur-[2px]">
              <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
                <SparklesCore
                  id="landing-sparkles"
                  background="transparent"
                  minSize={0.6}
                  maxSize={1.6}
                  particleDensity={100}
                  className="w-full h-full"
                  particleColor="#00FF66"
                  speed={0.4}
                />
              </div>
              
              <div className="relative z-10 space-y-6 flex flex-col items-center px-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-[10px] font-mono font-bold text-brand-bright uppercase tracking-wider">
                  🛡️ Multi-Layer Security Forensic Lab
                </span>
                <h2 className="font-display font-bold text-4xl sm:text-6xl tracking-tight text-ink-primary leading-[1.1]">
                  Verify Offers. <span className="text-brand-bright">Detect Scams.</span>
                </h2>
                <p className="text-sm sm:text-base text-ink-muted leading-relaxed max-w-xl">
                  Protect yourself from fake job templates, spoofed corporate identities, and recruitment scams. ScamCheck runs real-time rule parsing, template similarity matching, and advanced social engineering analysis before you share personal data.
                </p>
                
                {/* Two Main Call-To-Action buttons in front */}
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setView("input")}
                    className="w-full sm:w-auto px-6 py-3.5 bg-brand hover:bg-brand-bright text-black font-bold font-mono text-xs tracking-wider uppercase rounded-lg shadow-[0_0_15px_rgba(0,255,102,0.25)] hover:shadow-[0_0_20px_rgba(0,255,102,0.55)] transition-all flex items-center justify-center gap-2 transform active:scale-95 duration-200"
                  >
                    🔍 Check Scam Risk
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="w-full sm:w-auto px-6 py-3.5 bg-base-raised hover:bg-base-raised/80 border border-base-border text-brand-bright font-bold font-mono text-xs tracking-wider uppercase rounded-lg transition-all flex items-center justify-center gap-2 transform active:scale-95 duration-200"
                  >
                    🔌 Add Extension
                  </button>
                </div>
              </div>
            </div>

            {/* Features Matrix Grid */}
            <div className="grid md:grid-cols-3 gap-6 pt-6">
              <div className="bg-base-surface border border-base-border p-6 rounded-xl space-y-3 hover:border-brand/40 transition-all">
                <div className="w-10 h-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand-bright text-lg">
                  ⚡
                </div>
                <h3 className="font-display font-semibold text-base text-ink-primary">1. Rule Engine</h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Instant scanning for high-frequency hiring scams, fake domains, verification deposits, and suspicious messaging handle prompts.
                </p>
              </div>

              <div className="bg-base-surface border border-base-border p-6 rounded-xl space-y-3 hover:border-brand/40 transition-all">
                <div className="w-10 h-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand-bright text-lg">
                  🧠
                </div>
                <h3 className="font-display font-semibold text-base text-ink-primary">2. ML Classifier</h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Natural language vector similarity scoring that screens incoming texts against templates extracted from real-world scam configurations.
                </p>
              </div>

              <div className="bg-base-surface border border-base-border p-6 rounded-xl space-y-3 hover:border-brand/40 transition-all">
                <div className="w-10 h-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand-bright text-lg">
                  🤖
                </div>
                <h3 className="font-display font-semibold text-base text-ink-primary">3. Gemini Forensics</h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Social engineering analysis mapping gaslighting tactics, fake urgency, and pressure hooks, providing a clear explanation of what is off.
                </p>
              </div>
            </div>

            {/* Landing page footer */}
            <div className="border-t border-base-border/40 pt-8 mt-12 text-center text-[10px] sm:text-xs font-body tracking-[0.15em] text-white/45 uppercase select-none">
              powered by <span className="font-semibold text-white/85">Cybertrons</span>
            </div>
          </div>
        ) : activeTab === "scan" ? (
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
                  <button
                    type="button"
                    onClick={() => { setView("landing"); setActiveTab("scan"); }}
                    className="mb-4 inline-flex items-center gap-2 text-xs font-mono font-bold text-brand-bright hover:underline transition-all"
                  >
                    ← Back to Home
                  </button>
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
                  onClick={() => { setView("input"); setErrorMessage(null); }}
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
            <button
              type="button"
              onClick={() => {
                setView("landing");
                setActiveTab("scan");
              }}
              className="mb-6 inline-flex items-center gap-2 text-xs font-mono font-bold text-brand-bright hover:underline transition-all"
            >
              ← Back to Home
            </button>
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
