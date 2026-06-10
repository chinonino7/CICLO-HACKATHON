"use client";

import { CURRENCY_LIST, type CurrencyKey } from "@/lib/tokens";

export function CurrencyToggle({
  value,
  onChange,
}: {
  value: CurrencyKey;
  onChange: (c: CurrencyKey) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-line p-0.5">
      {CURRENCY_LIST.map((c) => {
        const active = c.key === value;
        return (
          <button
            key={c.key}
            onClick={() => onChange(c.key)}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium tracking-wide transition ${
              active ? "bg-forest text-cream" : "text-muted"
            }`}
          >
            {c.symbol}
          </button>
        );
      })}
    </div>
  );
}
