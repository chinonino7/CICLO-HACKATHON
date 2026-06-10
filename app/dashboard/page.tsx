"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { CurrencyToggle } from "@/components/CurrencyToggle";
import { CycleCard, type CardStatus } from "@/components/CycleCard";
import { useMiniPay } from "@/hooks/useMiniPay";
import { getCycles, getBalance, hasPaidRound, type Cycle } from "@/lib/ciclo";
import { money, turnRound } from "@/lib/format";
import type { CurrencyKey } from "@/lib/tokens";
import { USING_MOCK, mockCycles, mockDetails, MOCK_ME } from "@/lib/mock";

export default function Dashboard() {
  const router = useRouter();
  const { address } = useMiniPay();
  const [currency, setCurrency] = useState<CurrencyKey>("cUSD");
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [statuses, setStatuses] = useState<Record<number, CardStatus>>({});
  const me = (address ?? (USING_MOCK ? MOCK_ME : null))?.toLowerCase();

  function joinByLink() {
    const input = window.prompt("Pega el link o el código del ciclo:");
    if (!input) return;
    const match = input.match(/cycle\/(\d+)/) ?? input.match(/^\s*(\d+)\s*$/);
    if (match) router.push(`/cycle/${match[1]}/join`);
    else window.alert("No reconocí ese link o código.");
  }

  useEffect(() => {
    (async () => {
      try {
        setCycles(USING_MOCK ? mockCycles : await getCycles());
      } catch {
        setCycles(mockCycles);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (USING_MOCK) {
        setBalance(currency === "cUSD" ? 42.5 : 180000);
        return;
      }
      if (!address) return;
      try {
        setBalance(await getBalance(address, currency));
      } catch {
        setBalance(0);
      }
    })();
  }, [address, currency]);

  const mine = cycles.filter((c) => me && c.members.some((m) => m.toLowerCase() === me));

  // Estado de acción por ciclo
  useEffect(() => {
    if (!me) return;
    (async () => {
      const out: Record<number, CardStatus> = {};
      for (const c of mine) {
        if (!c.started) {
          out[c.id] = "start";
          continue;
        }
        const myIdx = c.members.findIndex((m) => m.toLowerCase() === me);
        if (turnRound(myIdx, c.payoutOrder) === c.round) {
          out[c.id] = "receive";
          continue;
        }
        const paid = USING_MOCK
          ? !!mockDetails[c.id]?.paidThisRound[me]
          : await hasPaidRound(c.id, c.round, me as `0x${string}`);
        out[c.id] = paid ? "ok" : "pay";
      }
      setStatuses(out);
    })();
  }, [cycles, me]);

  const pendingCount = Object.values(statuses).filter((s) => s === "pay").length;

  return (
    <main className="px-6 pb-28 pt-6">
      <header className="flex items-center justify-between">
        <Wordmark size="sm" />
        <CurrencyToggle value={currency} onChange={setCurrency} />
      </header>

      <section className="mt-8 border-b border-line pb-8">
        <p className="text-xs uppercase tracking-widest text-muted">Saldo disponible</p>
        <p className="mt-2 font-serif text-4xl text-forest">
          {balance === null ? "—" : money(balance, currency)}
        </p>
      </section>

      {pendingCount > 0 && (
        <div className="mt-5 rounded-lg border border-bronze/60 bg-bronze/10 px-4 py-3 text-sm text-ink">
          Tienes <span className="font-medium">{pendingCount}</span>{" "}
          {pendingCount === 1 ? "aporte pendiente" : "aportes pendientes"}.
        </div>
      )}

      <section className="mt-8">
        <h2 className="font-serif text-xl text-ink">Mis ciclos</h2>
        <div className="mt-1">
          {mine.length === 0 ? (
            <EmptyState />
          ) : (
            mine.map((c) => <CycleCard key={c.id} c={c} status={statuses[c.id]} />)
          )}
        </div>
      </section>

      <nav className="fixed bottom-0 left-1/2 z-10 w-full max-w-[420px] -translate-x-1/2 border-t border-line bg-cream px-6 py-3">
        <div className="flex gap-3">
          <Link href="/create" className="flex-1 rounded-lg bg-forest py-3 text-center text-sm font-medium text-cream active:opacity-80">
            Crear un Ciclo
          </Link>
          <button onClick={joinByLink} className="flex-1 rounded-lg border border-bronze py-3 text-center text-sm font-medium text-forest active:opacity-80">
            Unirse
          </button>
        </div>
      </nav>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="mt-4 rounded-lg border border-dashed border-line px-6 py-10 text-center">
      <div className="mx-auto mb-3 h-px w-10 bg-bronze" />
      <p className="font-serif text-lg text-ink">Aún no tienes ciclos</p>
      <p className="mx-auto mt-1.5 max-w-[15rem] text-sm text-muted">
        Crea tu primera natillera o únete a una con el link de un amigo.
      </p>
      <Link href="/create" className="mt-5 inline-block rounded-lg bg-forest px-5 py-2.5 text-sm font-medium text-cream">
        Crear tu primer ciclo
      </Link>
    </div>
  );
}
