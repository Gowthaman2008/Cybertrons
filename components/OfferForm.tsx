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

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setImageFile(file);
          setImagePreview(reader.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.8);
        setImagePreview(compressedBase64);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              setImageFile(compressedFile);
            } else {
              setImageFile(file);
            }
          },
          "image/jpeg",
          0.8
        );
      };
      img.src = event.target?.result as string;
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
      className="bg-base-surface border border-base-border rounded-xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in"
    >
      <div className="flex p-1 bg-base-raised border border-base-border rounded-full mb-6 w-fit select-none">
        <button
          type="button"
          onClick={() => setIsChatMode(false)}
          className={`px-4 py-1.5 rounded-full text-xs font-display font-semibold transition-all duration-200 ${
            !isChatMode
              ? "bg-brand text-white shadow-sm"
              : "text-ink-muted hover:text-ink-primary"
          }`}
        >
          🔍 Offer Letter / Email
        </button>
        <button
          type="button"
          onClick={() => setIsChatMode(true)}
          className={`px-4 py-1.5 rounded-full text-xs font-display font-semibold transition-all duration-200 ${
            isChatMode
              ? "bg-brand text-white shadow-sm"
              : "text-ink-muted hover:text-ink-primary"
          }`}
        >
          💬 Chat Log / WhatsApp
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-4">
        <div>
          <label htmlFor="offerText" className="block text-sm font-semibold text-ink-primary mb-2">
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
            className="w-full resize-none rounded-xl bg-base-bg border border-base-border px-4 py-3 text-sm text-ink-primary placeholder:text-ink-faint focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none font-body leading-relaxed transition-all duration-200 shadow-inner"
          />
          <div className="flex justify-between mt-1.5 px-1">
            <span className="text-xs text-ink-faint font-mono">{offerText.length}/8000</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-ink-primary mb-2">
            Or upload an image / screenshot
          </label>

          {!imagePreview ? (
            <div className="w-full h-[184px] rounded-xl bg-base-bg border-2 border-dashed border-base-border flex flex-col items-center justify-center p-4 hover:border-brand hover:bg-brand-dim/5 transition-all duration-200 cursor-pointer relative group">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />
              <svg
                className="w-8 h-8 text-ink-faint group-hover:text-brand-bright group-hover:scale-110 mb-2.5 transition-all duration-200"
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
              <p className="text-sm font-semibold text-ink-primary">Click or drag screenshot</p>
              <p className="text-xs text-ink-faint mt-0.5 font-mono">PNG, JPG, WEBP</p>
            </div>
          ) : (
            <div className="w-full h-[184px] rounded-xl bg-base-bg border border-base-border relative overflow-hidden flex items-center justify-center p-2 group shadow-inner">
              <img
                src={imagePreview}
                alt="Screenshot preview"
                className="max-w-full max-h-full object-contain rounded"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-base-surface border border-base-border text-ink-primary hover:bg-risk-high hover:text-white rounded-full p-2 shadow-md transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <button
          type="button"
          onClick={() => setShowOptional((v) => !v)}
          className="text-xs font-display text-brand-bright hover:text-brand-bright/80 font-bold inline-flex items-center gap-1.5 transition-colors"
        >
          {showOptional ? "− hide" : "+ add"} optional details (improves accuracy)
        </button>
      </div>

      {showOptional && (
        <div className="grid sm:grid-cols-2 gap-4 mb-6 animate-fade-in">
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
        <div className="mb-6 rounded-lg border border-risk-high/30 bg-risk-highDim/50 px-4 py-3 text-sm text-ink-primary animate-fade-in font-sans">
          {errorMessage}
        </div>
      )}

      <div className="pt-5 border-t border-base-border/30 flex justify-end">
        <button
          type="submit"
          disabled={(!offerText.trim() && !imagePreview) || isLoading}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-brand hover:bg-brand-bright disabled:bg-base-raised disabled:text-ink-faint disabled:cursor-not-allowed text-black font-bold text-xs font-display tracking-wider uppercase px-6 py-3.5 transition-all duration-200 transform active:scale-95 shadow-md shadow-brand/15 hover:shadow-lg hover:shadow-brand/25"
        >
          {isLoading ? (
            <>
              <span className="w-3.5 h-3.5 rounded-full border-2 border-black/40 border-t-black animate-spin" />
              Analyzing…
            </>
          ) : (
            "Run scam check"
          )}
        </button>
      </div>
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
    <div className="animate-fade-in">
      <label className="block text-xs font-mono font-bold text-ink-muted mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg bg-base-bg border border-base-border px-3.5 py-2.5 text-sm text-ink-primary placeholder:text-ink-faint focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none transition-all duration-200 shadow-inner"
      />
    </div>
  );
}
