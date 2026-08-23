import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ScamCheck — Scam Forensics Lab",
  description:
    "Paste a job or internship offer and get an instant, explainable scam-risk assessment before you respond.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable}`}>
      <body className="font-body bg-base-bg text-ink-primary min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
