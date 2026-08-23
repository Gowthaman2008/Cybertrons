import { Verdict } from "@/lib/types";

function riskTier(score: number): "low" | "medium" | "high" {
  if (score >= 65) return "high";
  if (score >= 30) return "medium";
  return "low";
}

const TIER_COLOR: Record<string, string> = {
  low: "#3FB27F",
  medium: "#E0A430",
  high: "#E0503A",
};

const TIER_LABEL: Record<string, string> = {
  low: "text-risk-low",
  medium: "text-risk-medium",
  high: "text-risk-high",
};

export default function ScoreGauge({ score, verdict }: { score: number; verdict: Verdict }) {
  const tier = riskTier(score);
  const color = TIER_COLOR[tier];
  // Circular gauge geometry.
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="flex flex-col items-center justify-center py-2">
      <div className="relative w-40 h-40">
        <svg viewBox="0 0 128 128" className="w-40 h-40 -rotate-90">
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="#2A3542"
            strokeWidth="10"
          />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-4xl font-500 text-ink-primary tabular-nums">
            {score}
          </span>
          <span className="text-[10px] font-mono text-ink-faint uppercase tracking-wider">
            risk score
          </span>
        </div>
      </div>
      <div
        className={`mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 font-mono text-sm ${TIER_LABEL[tier]}`}
        style={{ borderColor: color + "55", backgroundColor: color + "1a" }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        {verdict}
      </div>
    </div>
  );
}
