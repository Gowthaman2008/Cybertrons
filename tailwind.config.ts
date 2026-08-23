import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base Matrix theme pitch black & dark green borders.
        base: {
          bg: "#000000",
          surface: "#080C08",
          raised: "#121A12",
          border: "#1F331F",
        },
        ink: {
          primary: "#E0EBE0",
          muted: "#99B399",
          faint: "#526652",
        },
        // Brand accent: neon green matrix.
        brand: {
          DEFAULT: "#00FF66",
          bright: "#39FF14",
          dim: "rgba(0, 255, 102, 0.15)",
        },
        // Risk traffic-light system.
        risk: {
          low: "#3FB27F",
          lowDim: "#1C3A2C",
          medium: "#E0A430",
          mediumDim: "#3D3016",
          high: "#E0503A",
          highDim: "#3D1F18",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        // Subtle dark grid overlay
        "scan-grid":
          "linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px)",
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
        highlight: {
          "0%": { backgroundColor: "transparent" },
          "100%": { backgroundColor: "var(--highlight)" },
        },
        flash: {
          "0%": { backgroundColor: "#121821" },
          "50%": { backgroundColor: "var(--highlight)" },
          "100%": { backgroundColor: "#121821" },
        },
      },
      animation: {
        scanline: "scanline 1.8s linear infinite",
        "fade-in": "fade-in 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        float: "float 5s ease-in-out infinite",
        "slide-in-right": "slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        highlight: "highlight 0.6s ease forwards",
        flash: "flash 0.6s ease forwards",
      },
    },
  },
  plugins: [],
};
export default config;
