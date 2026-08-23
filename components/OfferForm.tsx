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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isChatMode, setIsChatMode] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (PNG, JPG, JPEG, WEBP).");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveImage() {
    setImageFile(null);
    setImagePreview(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if ((!offerText.trim() && !imagePreview) || isLoading) return;

    let imagePayload = undefined;
    if (imagePreview && imageFile) {
      const commaIndex = imagePreview.indexOf(",");
      if (commaIndex !== -1) {
        imagePayload = {
          data: imagePreview.substring(commaIndex + 1),
          mimeType: imageFile.type,
        };
      }
    }

    onSubmit({
      offerText: offerText.trim(),
      senderEmail: senderEmail.trim() || undefined,
      senderPhone: senderPhone.trim() || undefined,
      companyName: companyName.trim() || undefined,
      offeredAmount: offeredAmount.trim() || undefined,
      image: imagePayload,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-base-surface border border-base-border rounded-lg p-5 sm:p-6"
    >
      <div className="flex gap-2 p-1 bg-base-bg border border-base-border rounded-md mb-5 w-fit">
        <button
          type="button"
          onClick={() => setIsChatMode(false)}
          className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-all ${
            !isChatMode
              ? "bg-brand text-white shadow"
              : "text-ink-muted hover:text-ink-primary"
          }`}
        >
          🔍 Offer Letter / Email
        </button>
        <button
          type="button"
          onClick={() => setIsChatMode(true)}
          className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-all ${
            isChatMode
              ? "bg-brand text-white shadow"
              : "text-ink-muted hover:text-ink-primary"
          }`}
        >
          💬 Chat Log / WhatsApp
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-4">
        <div>
          <label htmlFor="offerText" className="block text-sm font-medium text-ink-primary mb-2">
            {isChatMode ? "Paste the chat transcript" : "Paste the offer message"}
          </label>
          <textarea
            id="offerText"
            value={offerText}
            onChange={(e) => setOfferText(e.target.value)}
            placeholder={
              isChatMode
                ? `Paste dialogue text from WhatsApp, Telegram, or SMS. E.g.\nRecruiter: "Hi, I have a remote typing job."\nMe: "Is there an interview?"\nRecruiter: "No interview needed, just pay RS 500 fee..."`
                : `Paste the full internship or job offer message here — from WhatsApp, email, LinkedIn, wherever you received it.\n\nExample: "Dear Candidate, we are pleased to inform you of your selection..."`
            }
            rows={8}
            maxLength={8000}
            className="w-full resize-none rounded-md bg-base-bg border border-base-border px-4 py-3 text-sm text-ink-primary placeholder:text-ink-faint focus:border-brand focus:ring-0 outline-none font-body leading-relaxed"
          />
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-ink-faint font-mono">{offerText.length}/8000</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-primary mb-2">
            Or upload an image / screenshot
          </label>

          {!imagePreview ? (
            <div className="w-full h-[184px] rounded-md bg-base-bg border border-dashed border-base-border flex flex-col items-center justify-center p-4 hover:border-brand transition-colors cursor-pointer relative group">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />
              <svg
                className="w-8 h-8 text-ink-faint group-hover:text-brand-bright mb-2 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-sm font-medium text-ink-primary">Click or drag screenshot</p>
              <p className="text-xs text-ink-faint mt-0.5">PNG, JPG, WEBP</p>
            </div>
          ) : (
            <div className="w-full h-[184px] rounded-md bg-base-bg border border-base-border relative overflow-hidden flex items-center justify-center p-2 group">
              <img
                src={imagePreview}
                alt="Screenshot preview"
                className="max-w-full max-h-full object-contain rounded"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-base-raised border border-base-border text-ink-primary hover:bg-risk-high hover:text-white rounded-full p-1.5 shadow-md transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
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
        disabled={(!offerText.trim() && !imagePreview) || isLoading}
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
