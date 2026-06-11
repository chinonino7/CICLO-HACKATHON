import { countdown, urgency } from "@/lib/format";

const STYLE = {
  ok: "border-line text-muted",
  soon: "border-bronze/50 bg-bronze/10 text-bronze",
  overdue: "border-claret/40 bg-claret/5 text-claret",
} as const;

export function DeadlineChip({ deadline }: { deadline: number }) {
  const { label } = countdown(deadline);
  const u = urgency(deadline);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${STYLE[u]}`}
    >
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M8 4.5V8l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
      {label}
    </span>
  );
}
