import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base light mode console surfaces - soft light grey & white card frames.
        base: {
          bg: "#F4F6F8",
          surface: "#FFFFFF",
          raised: "#E9ECEF",
          border: "#DDE1E5",
        },
        ink: {
          primary: "#1E293B",
          muted: "#475569",
          faint: "#64748B",
        },
        // Brand accent: royal blue - high accessibility and tech look.
        brand: {
          DEFAULT: "#2563EB",
          bright: "#1D4ED8",
          dim: "#DBEAFE",
        },
        // Risk traffic-light system.
        risk: {
          low: "#16A34A",
          lowDim: "#DCFCE7",
          medium: "#D97706",
          mediumDim: "#FEF3C7",
          high: "#DC2626",
          highDim: "#FEE2E2",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        // Subtle grid overlay for premium light design
        "scan-grid":
          "linear-gradient(to right, rgba(37,99,235,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(37,99,235,0.035) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "24px 24px",
      },
      keyframes: {
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(16px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
      },
      animation: {
        scanline: "scanline 1.8s linear infinite",
        "fade-in": "fade-in 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        float: "float 5s ease-in-out infinite",
        "slide-in-right": "slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
