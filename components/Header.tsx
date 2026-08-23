"use client";

import { useState } from "react";

export default function Header() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <header className="border-b border-base-border">
        <div className="mx-auto max-w-5xl px-5 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-base-raised border border-base-border flex items-center justify-center">
              <span className="font-mono text-brand-bright text-sm">SC</span>
            </div>
            <div>
              <h1 className="font-display font-600 text-lg tracking-tight text-ink-primary">
                ScamCheck
              </h1>
              <p className="text-xs text-ink-faint font-mono -mt-0.5">
                opportunity verification
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="bg-brand-dim/15 hover:bg-brand-dim/30 border border-brand-dim/30 hover:border-brand-bright text-brand-bright text-xs px-3 py-1.5 rounded font-mono transition-all flex items-center gap-1.5"
            >
              🔌 Add Extension
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-ink-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-risk-low inline-block" />
              rule engine + gemini
            </div>
          </div>
        </div>
      </header>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-base-surface border border-base-border rounded-lg max-w-md w-full p-6 relative shadow-2xl animate-fade-in font-mono text-xs">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-ink-muted hover:text-ink-primary text-sm"
            >
              ✕
            </button>
            <span className="text-[9px] uppercase text-brand-bright font-bold tracking-widest bg-brand-dim/15 px-2 py-0.5 rounded border border-brand-dim/30">
              Browser Companion
            </span>
            <h3 className="text-base font-semibold text-ink-primary mt-3 mb-2 font-display">
              ScamCheck Browser Extension
            </h3>
            <p className="text-ink-muted leading-relaxed mb-4 text-[11px] font-sans">
              Scan job offers, WhatsApp messages, and emails directly on any website without leaving the tab.
            </p>

            <div className="space-y-3.5 border-t border-base-border pt-4 text-[11px] font-sans text-ink-muted">
              <div className="flex gap-2">
                <span className="text-brand-bright font-bold font-mono">1.</span>
                <p>
                  Locate the <code className="bg-base-raised px-1.5 py-0.5 rounded border border-base-border text-ink-primary font-mono text-[10px]">/extension</code> directory in the project files.
                </p>
              </div>
              <div className="flex gap-2">
                <span className="text-brand-bright font-bold font-mono">2.</span>
                <p>
                  Open Chrome/Edge and go to <code className="bg-base-raised px-1.5 py-0.5 rounded border border-base-border text-ink-primary font-mono text-[10px]">chrome://extensions/</code>.
                </p>
              </div>
              <div className="flex gap-2">
                <span className="text-brand-bright font-bold font-mono">3.</span>
                <p>
                  Enable <strong className="text-ink-primary font-semibold">Developer Mode</strong> using the toggle in the top-right corner.
                </p>
              </div>
              <div className="flex gap-2">
                <span className="text-brand-bright font-bold font-mono">4.</span>
                <p>
                  Click <strong className="text-ink-primary font-semibold">Load Unpacked</strong> in the top-left and select the <code className="bg-base-raised px-1 py-0.5 rounded border border-base-border text-ink-primary font-mono text-[10px]">extension</code> folder.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-base-border bg-brand-dim/5 p-3 rounded border border-brand/10">
              <p className="text-ink-muted leading-relaxed font-sans text-[11px]">
                🚀 <strong>Quick Scan:</strong> Highlight text on WhatsApp Web, Gmail, or LinkedIn, right-click, and select <strong>"Check with ScamCheck"</strong> to run immediate forensic checks!
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="mt-5 w-full bg-brand-bright hover:bg-brand-bright/95 text-white font-mono py-2 rounded text-center text-xs font-semibold"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
}
