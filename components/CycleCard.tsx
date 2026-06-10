"use client";

import Link from "next/link";
import type { Cycle } from "@/lib/ciclo";
import { MAX_MEMBERS } from "@/lib/ciclo";
import { money, FREQUENCY_LABEL } from "@/lib/format";
import { ProgressBar } from "./ProgressBar";

export type CardStatus = "pay" | "receive" | "ok" | "start" | null;

const BADGE: Record<Exclude<CardStatus, null>, { text: string; cls: string }> = {
  pay: { text: "Te toca pagar", cls: "bg-bronze/15 text-bronze" },
  receive: { text: "Recibes", cls: "bg-forest text-cream" },
  ok: { text: "Al día", cls: "text-forest border border-line" },
  start: { text: "Por iniciar", cls: "text-muted border border-line" },
};

export function CycleCard({ c, status }: { c: Cycle; status?: CardStatus }) {
  const filled = c.members.length;
  const pct = (filled / MAX_MEMBERS) * 100;
  const badge = status ? BADGE[status] : null;

  return (
    <Link href={`/cycle/${c.id}`} className="block border-b border-line py-4 active:opacity-70">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-serif text-lg text-ink">{c.name}</h3>
        {badge ? (
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${badge.cls}`}>
            {badge.text}
          </span>
        ) : (
          <span className="text-xs uppercase tracking-widest text-bronze">{c.currency}</span>
        )}
      </div>

      <p className="mt-0.5 text-sm text-muted">
        {money(c.amount, c.currency)} · {FREQUENCY_LABEL[c.frequency]}
      </p>

      <div className="mt-3 flex items-center gap-3">
        <ProgressBar pct={pct} />
        <span className="shrink-0 text-xs tabular-nums text-muted">
          {filled}/{MAX_MEMBERS}
        </span>
      </div>

      <p className="mt-2 text-xs text-muted">
        {c.started ? `Ronda ${c.round + 1} de ${c.members.length}` : "Aún no inicia"}
      </p>
    </Link>
  );
}
