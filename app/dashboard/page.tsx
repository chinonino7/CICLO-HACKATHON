"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { CurrencyToggle } from "@/components/CurrencyToggle";
import { CycleCard, type CardStatus } from "@/components/CycleCard";
import { EmptyState } from "@/components/EmptyState";
import { useMiniPay } from "@/hooks/useMiniPay";
import { getCycles, getBalance, hasPaidRound, type Cycle } from "@/lib/ciclo";
import { errorMessage } from "@/lib/errors";
import { money, turnRound } from "@/lib/format";
import type { CurrencyKey } from "@/lib/tokens";
import { USING_MOCK, MOCK_ME, setMode } from "@/lib/mock";

export default function Dashboard() {
  const { address } = useMiniPay();
  const [currency, setCurrency] = useState<CurrencyKey>("cUSD");
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ok">("loading");
  const [errText, setErrText] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [statuses, setStatuses] = useState<Record<number, CardStatus>>({});
  // Gated por useEffect para no romper la hidratación (USING_MOCK lee localStorage).
  const [demoMode, setDemoMode] = useState(false);
  useEffect(() => setDemoMode(USING_MOCK), []);
  const me = (USING_MOCK ? MOCK_ME : address)?.toLowerCase();

  async function loadCycles() {
    setLoadState("loading");
    try {
      setCycles(await getCycles());
      setLoadState("ok");
    } catch (e) {
      console.error("getCycles:", e);
      setErrText(errorMessage(e));
      setCycles([]);
      setLoadState("error");
    }
  }

  useEffect(() => {
    loadCycles();
  }, []);

  useEffect(() => {
    (async () => {
      const who = USING_MOCK ? MOCK_ME : address;
      if (!who) return;
      try {
        setBalance(await getBalance(who, currency));
      } catch {
        setBalance(null); // "—": un fallo de red no es lo mismo que saldo 0
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
        if (c.cancelled) continue; // la card muestra "Cancelado" por sí misma
        if (!c.started) {
          out[c.id] = "start";
          continue;
        }
        const myIdx = c.members.findIndex((m) => m.toLowerCase() === me);
        if (turnRound(myIdx, c.payoutOrder) === c.round) {
          out[c.id] = "receive";
          continue;
        }
        const paid = await hasPaidRound(c.id, c.round, me as `0x${string}`);
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

      {demoMode && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-dashed border-bronze/60 bg-bronze/10 px-4 py-2.5">
          <span className="text-xs text-bronze">Modo demo · datos de ejemplo</span>
          <button
            onClick={() => {
              setMode("real");
              window.location.reload();
            }}
            className="shrink-0 text-xs font-medium text-forest underline underline-offset-2"
          >
            Usar la app real
          </button>
        </div>
      )}

      <section className="mt-6 animate-fade-up rounded-xl bg-forest px-5 py-6">
        <p className="text-xs uppercase tracking-widest text-cream/60">Saldo disponible</p>
        <p className="mt-2 font-display text-4xl text-cream">
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
        <h2 className="font-display text-xl text-ink">Mis ciclos</h2>
        <div className="mt-1">
          {loadState === "loading" ? (
            <div className="mt-4 space-y-3">
              <div className="h-24 animate-pulse rounded-lg bg-line/60" />
              <div className="h-24 animate-pulse rounded-lg bg-line/60" />
            </div>
          ) : loadState === "error" ? (
            <div className="mt-4 rounded-lg border border-claret/40 bg-claret/5 px-4 py-4">
              <p className="text-sm font-medium text-claret">No pudimos cargar tus ciclos</p>
              <p className="mt-1 text-sm text-muted">{errText || "Revisa tu conexión e intenta de nuevo."}</p>
              <button
                onClick={loadCycles}
                className="mt-3 rounded-lg border border-claret/40 px-4 py-2 text-sm font-medium text-claret"
              >
                Reintentar
              </button>
            </div>
          ) : mine.length === 0 ? (
            <EmptyState
              title="Aún no tienes ciclos"
              body="Crea tu primer ahorro rotativo comunitario o únete a uno con el link de un amigo."
              cta={{ label: "Crear tu primer ciclo", href: "/create" }}
            />
          ) : (
            mine.map((c, i) => (
              <div key={c.id} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                <CycleCard c={c} status={statuses[c.id]} />
              </div>
            ))
          )}
        </div>
      </section>

      <nav className="fixed bottom-0 left-1/2 z-10 w-full max-w-[420px] -translate-x-1/2 border-t border-line bg-cream px-6 py-3">
        <div className="flex gap-3">
          <Link href="/create" className="flex-1 rounded-lg bg-forest py-3 text-center text-sm font-medium text-cream transition active:scale-[0.98] active:opacity-80">
            Crear un Ciclo
          </Link>
          <Link href="/join" className="flex-1 rounded-lg border border-bronze py-3 text-center text-sm font-medium text-forest transition active:scale-[0.98] active:opacity-80">
            Unirse
          </Link>
        </div>
      </nav>
    </main>
  );
}
