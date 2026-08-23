"use client";

import { AnalysisResult } from "@/lib/types";

export interface HistoryEntry {
  id: string;
  preview: string;
  result: AnalysisResult;
  timestamp: number;
}

const TIER_DOT: Record<string, string> = {
  "Low Risk": "bg-risk-low",
  "Medium Risk": "bg-risk-medium",
  "High Risk": "bg-risk-high",
};

export default function HistoryPanel({
  entries,
  onSelect,
  activeId,
}: {
  entries: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  activeId: string | null;
}) {
  if (entries.length === 0) return null;

  return (
    <div className="bg-base-surface border border-base-border rounded-lg p-4">
      <h3 className="text-xs font-mono uppercase tracking-wider text-ink-faint mb-3 px-1">
        this session ({entries.length})
      </h3>
      <div className="space-y-1">
        {entries.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onSelect(entry)}
            className={`w-full text-left rounded-md px-3 py-2.5 transition-colors flex items-center gap-3 ${
              activeId === entry.id
                ? "bg-base-raised border border-base-border"
                : "hover:bg-base-raised/60 border border-transparent"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${TIER_DOT[entry.result.finalVerdict]}`}
            />
            <span className="text-sm text-ink-muted truncate flex-1">{entry.preview}</span>
            <span className="text-xs font-mono text-ink-faint shrink-0">
              {entry.result.finalScore}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
