import { RuleFlag, Severity } from "@/lib/types";

const SEVERITY_COLOR: Record<Severity, string> = {
  low: "text-risk-low border-risk-low/30 bg-risk-lowDim",
  medium: "text-risk-medium border-risk-medium/30 bg-risk-mediumDim",
  high: "text-risk-high border-risk-high/30 bg-risk-highDim",
};

export default function FlagList({
  flags,
  additionalFlags,
}: {
  flags: RuleFlag[];
  additionalFlags?: string[];
}) {
  const hasAny = flags.length > 0 || (additionalFlags && additionalFlags.length > 0);

  if (!hasAny) {
    return (
      <div className="rounded-md border border-risk-low/30 bg-risk-lowDim px-4 py-3 text-sm text-ink-primary font-mono">
        [00] no red flags detected by the rule engine
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {flags.map((flag, i) => (
        <div
          key={flag.id}
          className={`rounded-md border px-4 py-3 ${SEVERITY_COLOR[flag.severity]}`}
        >
          <div className="flex items-start gap-3">
            <span className="font-mono text-xs mt-0.5 opacity-70 shrink-0">
              [{String(i + 1).padStart(2, "0")}]
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm text-ink-primary">{flag.label}</span>
                <span className="text-[10px] font-mono uppercase tracking-wider opacity-80">
                  {flag.severity}
                </span>
              </div>
              <p className="text-sm text-ink-muted mt-1">{flag.explanation}</p>
              {flag.evidence && (
                <p className="text-xs font-mono text-ink-faint mt-1.5 truncate">
                  matched: &ldquo;{flag.evidence}&rdquo;
                </p>
              )}
            </div>
          </div>
        </div>
      ))}

      {additionalFlags && additionalFlags.length > 0 && (
        <>
          {additionalFlags.map((text, i) => (
            <div
              key={`llm-${i}`}
              className="rounded-md border border-brand/30 bg-brand-dim/20 px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <span className="font-mono text-xs mt-0.5 opacity-70 shrink-0">
                  [AI-{String(i + 1).padStart(2, "0")}]
                </span>
                <p className="text-sm text-ink-primary">{text}</p>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
