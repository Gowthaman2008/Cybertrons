export default function ScanningState() {
  return (
    <div className="bg-base-surface border border-base-border rounded-lg overflow-hidden animate-fade-in">
      <div className="relative h-44 bg-scan-grid bg-grid overflow-hidden flex items-center justify-center">
        <div
          className="absolute left-0 right-0 h-24 animate-scanline"
          style={{
            background:
              "linear-gradient(to bottom, transparent, rgba(91,155,213,0.18), transparent)",
          }}
        />
        <span className="font-mono text-sm text-ink-muted relative z-10">
          running rule engine + claude…
        </span>
      </div>
      <div className="px-5 sm:px-6 py-5 space-y-2.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-3 rounded bg-base-raised animate-pulse"
            style={{ width: `${85 - i * 18}%`, animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
