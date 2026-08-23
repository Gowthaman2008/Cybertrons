import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScamCheck — Opportunity Verification",
  description:
    "Paste a job or internship offer and get an instant, explainable scam-risk assessment before you respond.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body bg-base-bg text-ink-primary min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
