import Link from "next/link";

export function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="mt-4 rounded-lg border border-dashed border-line px-6 py-10 text-center">
      {/* Tres círculos en arco: alusión a la rotación del ciclo */}
      <svg className="mx-auto mb-4" width="72" height="36" viewBox="0 0 72 36" fill="none" aria-hidden>
        <path d="M10 30a26 26 0 0 1 52 0" stroke="#E7E4DD" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="10" cy="30" r="6" fill="#B8977E" fillOpacity="0.25" stroke="#B8977E" />
        <circle cx="36" cy="6" r="6" fill="#B8977E" fillOpacity="0.5" stroke="#B8977E" />
        <circle cx="62" cy="30" r="6" fill="#0A4D3C" stroke="#0A4D3C" />
      </svg>
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mx-auto mt-1.5 max-w-[15rem] text-sm text-muted">{body}</p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-5 inline-block rounded-lg bg-forest px-5 py-2.5 text-sm font-medium text-cream transition active:scale-[0.98]"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
