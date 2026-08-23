import { AnalysisResult } from "@/lib/types";
import ScoreGauge from "./ScoreGauge";
import FlagList from "./FlagList";
import ActionStation from "./ActionStation";

function recommendationFor(finalScore: number): string {
  if (finalScore >= 65) {
    return "Do not pay, share IDs, or click links. Verify directly through the company's official careers page or a known HR contact before taking any further action.";
  }
  if (finalScore >= 30) {
    return "Proceed carefully. Verify the sender and company independently — call the company's listed number or check their official site — before sharing any personal information.";
  }
  return "No major red flags found, but it's still good practice to verify the sender's email domain and confirm the role on the company's official careers page before proceeding.";
}

export default function ResultsPanel({ result, offerText }: { result: AnalysisResult; offerText: string }) {
  const { ruleFlags, llm, llmUnavailable, finalScore, finalVerdict } = result;

  return (
    <div className="bg-base-surface border border-base-border rounded-lg overflow-hidden animate-fade-in">
      <div className="bg-scan-grid bg-grid border-b border-base-border px-5 sm:px-6 pt-6 pb-2">
        <ScoreGauge score={finalScore} verdict={finalVerdict} />
      </div>

      <div className="px-5 sm:px-6 py-6 space-y-6">
        {llm && (
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-ink-faint mb-2">
              assessment
            </h3>
            <p className="text-sm text-ink-primary leading-relaxed">{llm.explanation}</p>
          </div>
        )}

        {llmUnavailable && (
          <div className="rounded-md border border-risk-medium/30 bg-risk-mediumDim px-4 py-3 text-sm text-ink-primary">
            The AI assessment layer is unavailable right now, so this result is based on the
            deterministic rule engine only. The score below reflects rule-based flags alone.
          </div>
        )}

        <div>
          <h3 className="text-xs font-mono uppercase tracking-wider text-ink-faint mb-3">
            detected flags ({ruleFlags.length + (llm?.additionalFlags.length ?? 0)})
          </h3>
          <FlagList flags={ruleFlags} additionalFlags={llm?.additionalFlags} />
        </div>

        <div className="rounded-md border border-brand/30 bg-brand-dim/15 px-4 py-3.5">
          <h3 className="text-xs font-mono uppercase tracking-wider text-brand-bright mb-1.5">
            recommendation
          </h3>
          <p className="text-sm text-ink-primary leading-relaxed">
            {recommendationFor(finalScore)}
          </p>
        </div>

        {finalScore >= 30 && (
          <ActionStation result={result} offerText={offerText} />
        )}
      </div>
    </div>
  );
}
