type Step = { title: string; body: string };

export function Stepper({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-0">
      {steps.map((s, i) => (
        <li key={i} className="relative flex gap-4 pb-7 last:pb-0">
          {i < steps.length - 1 && (
            <span className="absolute left-[13px] top-7 h-[calc(100%-28px)] w-px bg-bronze/40" />
          )}
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-bronze text-xs font-medium text-bronze">
            {i + 1}
          </span>
          <div className="pt-0.5 text-left">
            <p className="font-display text-sm font-semibold text-ink">{s.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
