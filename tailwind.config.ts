import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base "console" surfaces — deep slate, not pure black.
        base: {
          bg: "#0B0F14",
          surface: "#121821",
          raised: "#1A222D",
          border: "#2A3542",
        },
        ink: {
          primary: "#E7ECF2",
          muted: "#8B98A8",
          faint: "#5B6878",
        },
        // Brand accent: steel blue — "verification", not hype.
        brand: {
          DEFAULT: "#3E7CB1",
          bright: "#5B9BD5",
          dim: "#2C587F",
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
        "scan-grid":
          "linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "28px 28px",
      },
      keyframes: {
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        scanline: "scanline 1.8s linear infinite",
        "fade-in": "fade-in 0.35s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
