"use client";

import { RuleFlag } from "@/lib/types";

interface Props {
  text: string;
  flags: RuleFlag[];
}

interface HighlightInterval {
  start: number;
  end: number;
  label: string;
  explanation: string;
  severity: string;
}

export default function EvidenceHighlighter({ text, flags }: Props) {
  if (!text) {
    return (
      <div className="text-xs text-ink-faint font-mono italic p-3 text-center bg-base-raised rounded border border-base-border">
        [Screenshot scan: no raw offer text pasted]
      </div>
    );
  }

  // 1. Gather all highlight intervals
  const intervals: HighlightInterval[] = [];

  flags.forEach((flag) => {
    if (!flag.evidence) return;
    const searchStr = flag.evidence.trim().toLowerCase();
    if (searchStr.length === 0) return;

    let index = text.toLowerCase().indexOf(searchStr);
    while (index !== -1) {
      intervals.push({
        start: index,
        end: index + searchStr.length,
        label: flag.label,
        explanation: flag.explanation,
        severity: flag.severity
      });
      // Advance index to find duplicate matches
      index = text.toLowerCase().indexOf(searchStr, index + 1);
    }
  });

  // 2. Sort intervals by start ascending, then length descending
  intervals.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return (b.end - b.start) - (a.end - a.start);
  });

  // 3. Resolve overlaps (keep only non-overlapping intervals)
  const cleanIntervals: HighlightInterval[] = [];
  let lastEnd = 0;

  intervals.forEach((interval) => {
    if (interval.start >= lastEnd) {
      cleanIntervals.push(interval);
      lastEnd = interval.end;
    }
  });

  // 4. Split text into text segments and highlights
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;

  cleanIntervals.forEach((interval, idx) => {
    const { start, end, label, explanation, severity } = interval;

    // Push preceding normal text
    if (start > lastIndex) {
      elements.push(<span key={`txt-${idx}`}>{text.substring(lastIndex, start)}</span>);
    }

    // Highlight border coloring
    const strokeColor =
      severity === "high"
        ? "border-risk-high"
        : severity === "medium"
        ? "border-risk-medium"
        : "border-risk-low";

    const bgColor =
      severity === "high"
        ? "bg-risk-highDim/35 text-ink-primary"
        : severity === "medium"
        ? "bg-risk-mediumDim/35 text-ink-primary"
        : "bg-risk-lowDim/35 text-ink-primary";

    const badgeBg =
      severity === "high"
        ? "bg-risk-high text-white"
        : severity === "medium"
        ? "bg-risk-medium text-black"
        : "bg-risk-low text-white";

    // Push highlighted text segment with tooltip
    elements.push(
      <span
        key={`hl-${idx}`}
        className={`inline border-b-2 ${strokeColor} ${bgColor} font-medium px-0.5 rounded-t-[2px] cursor-help relative group`}
      >
        {text.substring(start, end)}

        {/* Hover Tooltip */}
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-base-raised border border-base-border rounded-lg shadow-xl p-3 text-left opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider mb-1.5 ${badgeBg}`}>
            {severity} risk flag
          </span>
          <h5 className="text-xs font-semibold text-ink-primary mb-1">
            {label}
          </h5>
          <p className="text-[10px] leading-relaxed text-ink-muted">
            {explanation}
          </p>
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-base-border" />
        </span>
      </span>
    );

    lastIndex = end;
  });

  // Push final normal text segment
  if (lastIndex < text.length) {
    elements.push(<span key="txt-final">{text.substring(lastIndex)}</span>);
  }

  return (
    <div className="bg-base-bg border border-base-border rounded p-4 font-body text-xs sm:text-sm text-ink-muted leading-relaxed whitespace-pre-wrap break-words overflow-x-hidden max-h-[300px] overflow-y-auto pr-2 relative shadow-inner">
      <div className="absolute top-2 right-2 bg-base-surface px-1.5 py-0.5 rounded text-[8px] font-mono text-ink-faint border border-base-border select-none pointer-events-none">
        pasted document view
      </div>
      {elements}
    </div>
  );
}
