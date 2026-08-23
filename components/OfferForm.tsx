"use client";

import { useState } from "react";
import { OfferInput } from "@/lib/types";

interface Props {
  onSubmit: (input: OfferInput) => void;
  isLoading: boolean;
  errorMessage: string | null;
}

export default function OfferForm({ onSubmit, isLoading, errorMessage }: Props) {
  const [offerText, setOfferText] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [offeredAmount, setOfferedAmount] = useState("");
  const [showOptional, setShowOptional] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!offerText.trim() || isLoading) return;
    onSubmit({
      offerText: offerText.trim(),
      senderEmail: senderEmail.trim() || undefined,
      senderPhone: senderPhone.trim() || undefined,
      companyName: companyName.trim() || undefined,
      offeredAmount: offeredAmount.trim() || undefined,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-base-surface border border-base-border rounded-lg p-5 sm:p-6"
    >
      <label htmlFor="offerText" className="block text-sm font-medium text-ink-primary mb-2">
        Paste the offer message
      </label>
      <textarea
        id="offerText"
        value={offerText}
        onChange={(e) => setOfferText(e.target.value)}
        placeholder={`Paste the full internship or job offer message here — from WhatsApp, email, LinkedIn, wherever you received it.\n\nExample: "Dear Candidate, we are pleased to inform you of your selection..."`}
        rows={9}
        maxLength={8000}
        className="w-full resize-y rounded-md bg-base-bg border border-base-border px-4 py-3 text-sm text-ink-primary placeholder:text-ink-faint focus:border-brand focus:ring-0 outline-none font-body leading-relaxed"
      />
      <div className="flex justify-between mt-1 mb-4">
        <span className="text-xs text-ink-faint font-mono">{offerText.length}/8000</span>
      </div>

      <button
        type="button"
        onClick={() => setShowOptional((v) => !v)}
        className="text-xs font-mono text-brand-bright hover:text-brand mb-4 inline-flex items-center gap-1"
      >
        {showOptional ? "− hide" : "+ add"} optional details (improves accuracy)
      </button>

      {showOptional && (
        <div className="grid sm:grid-cols-2 gap-4 mb-5 animate-fade-in">
          <Field
            label="Sender email"
            value={senderEmail}
            onChange={setSenderEmail}
            placeholder="hr@company.com"
          />
          <Field
            label="Sender phone"
            value={senderPhone}
            onChange={setSenderPhone}
            placeholder="+91 90000 00000"
          />
          <Field
            label="Company name"
            value={companyName}
            onChange={setCompanyName}
            placeholder="Acme Technologies"
          />
          <Field
            label="Offered salary / stipend"
            value={offeredAmount}
            onChange={setOfferedAmount}
            placeholder="₹15,000/month"
          />
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 rounded-md border border-risk-high/40 bg-risk-highDim px-4 py-3 text-sm text-ink-primary">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={!offerText.trim() || isLoading}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md bg-brand hover:bg-brand-bright disabled:bg-base-raised disabled:text-ink-faint disabled:cursor-not-allowed text-white font-medium text-sm px-6 py-3 transition-colors"
      >
        {isLoading ? (
          <>
            <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            Analyzing…
          </>
        ) : (
          "Run scam check"
        )}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="block text-xs font-mono text-ink-muted mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md bg-base-bg border border-base-border px-3 py-2 text-sm text-ink-primary placeholder:text-ink-faint focus:border-brand focus:ring-0 outline-none"
      />
    </div>
  );
}
