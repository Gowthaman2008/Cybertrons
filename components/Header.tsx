export default function Header() {
  return (
    <header className="border-b border-base-border">
      <div className="mx-auto max-w-5xl px-5 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-base-raised border border-base-border flex items-center justify-center">
            <span className="font-mono text-brand-bright text-sm">SC</span>
          </div>
          <div>
            <h1 className="font-display font-600 text-lg tracking-tight text-ink-primary">
              ScamCheck
            </h1>
            <p className="text-xs text-ink-faint font-mono -mt-0.5">
              opportunity verification
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-ink-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-risk-low inline-block" />
          rule engine + gemini
        </div>
      </div>
    </header>
  );
}
