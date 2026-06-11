type Item = { q: string; a: string };

export function FAQ({ items }: { items: Item[] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((it, i) => (
        <details key={i} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 text-left text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
            {it.q}
            <svg
              className="h-4 w-4 shrink-0 text-bronze transition-transform group-open:rotate-180"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </summary>
          <p className="pb-4 text-left text-sm leading-relaxed text-muted">{it.a}</p>
        </details>
      ))}
    </div>
  );
}
