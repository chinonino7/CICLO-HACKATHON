"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { ProgressBar } from "@/components/ProgressBar";
import { MemberRow } from "@/components/MemberRow";
import { CycleChat } from "@/components/CycleChat";
import { Avatar } from "@/components/Avatar";
import { useMiniPay } from "@/hooks/useMiniPay";
import {
  getCycleDetail,
  contribute,
  claimPot,
  setOrder,
  startCycle,
  getBalance,
  type CycleDetail,
} from "@/lib/ciclo";
import {
  money,
  shortAddr,
  FREQUENCY_LABEL,
  ORDER_LABEL,
  deadlineMs,
  countdown,
  turnRound,
} from "@/lib/format";
import { CELOSCAN_TX } from "@/lib/tokens";
import { displayName, seedDemoAliases } from "@/lib/identity";
import { USING_MOCK, mockDetails, MOCK_ME } from "@/lib/mock";

const CHAT_SEED = [
  { author: "0x0000000000000000000000000000000000a11cf", text: "Listo, ya consigné mi aporte 🙌", ts: Date.now() - 7200000 },
  { author: "0x0000000000000000000000000000000000a11d0", text: "Esta semana me toca a mí recibir", ts: Date.now() - 3600000 },
];

const DEPOSIT_LINK = "https://link.minipay.xyz/add_cash";

export default function CycleRoom() {
  const id = Number(useParams().id);
  const { address } = useMiniPay();
  const [c, setC] = useState<CycleDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [receipt, setReceipt] = useState<{ hash: string; kind: string } | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [order, setLocalOrder] = useState<number[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const me = (address ?? (USING_MOCK ? MOCK_ME : null))?.toLowerCase() ?? "";

  async function load() {
    setC(USING_MOCK ? mockDetails[id] ?? mockDetails[1] : await getCycleDetail(id));
  }

  useEffect(() => {
    load().catch(() => setC(mockDetails[1]));
  }, [id]);

  // Resolver nombres (alias) y orden local del admin
  useEffect(() => {
    if (!c) return;
    if (USING_MOCK) seedDemoAliases(c.members, me);
    const map: Record<string, string> = {};
    c.members.forEach((mm) => (map[mm.toLowerCase()] = displayName(mm)));
    setNames(map);
    if (!c.started) {
      setLocalOrder(c.payoutOrder.length === c.members.length ? c.payoutOrder : c.members.map((_, i) => i));
    }
  }, [c?.id, c?.started, c?.members.length]);

  // Saldo (solo modo real) para detectar saldo insuficiente
  useEffect(() => {
    if (USING_MOCK || !address || !c) return;
    getBalance(address, c.currency).then(setBalance).catch(() => setBalance(null));
  }, [address, c?.currency]);

  if (!c) return <div className="p-6 text-muted">Cargando…</div>;

  const n = c.members.length;
  const fundedCount = c.members.filter((m) => c.paidThisRound[m.toLowerCase()]).length;
  const pot = c.amount * n;
  const fullyFunded = fundedCount === n;
  const iPaid = !!c.paidThisRound[me];
  const isBeneficiary = c.beneficiary?.toLowerCase() === me;
  const isAdmin = c.admin.toLowerCase() === me;
  const pendientes = c.members.filter((m) => !c.paidThisRound[m.toLowerCase()]);
  const { label: dl, overdue } = countdown(deadlineMs(c.roundStart, c.frequency));
  const lowBalance = !USING_MOCK && balance !== null && balance < c.amount;

  // Proyección personal
  const myIndex = c.members.findIndex((m) => m.toLowerCase() === me);
  const effOrder = c.payoutOrder.length === n ? c.payoutOrder : c.orderMode === 0 ? order : [];
  const myTurn = myIndex >= 0 ? turnRound(myIndex, effOrder) : null;
  const periodMs = (c.frequency === 1 ? 30 : 7) * 86400000;
  const myReceiveDate =
    myTurn !== null ? new Date(Date.now() + Math.max(0, myTurn - c.round + 1) * periodMs) : null;
  const dateFmt = (d: Date) => d.toLocaleDateString("es-CO", { day: "numeric", month: "long" });

  const nameOf = (addr: string) => names[addr.toLowerCase()] ?? shortAddr(addr);

  async function handlePay() {
    setBusy(true);
    try {
      if (USING_MOCK) {
        await new Promise((r) => setTimeout(r, 900));
        setReceipt({ hash: "0xdemo", kind: "Aporte" });
      } else {
        const h = await contribute(id, c!.currency, c!.amount);
        setReceipt({ hash: h, kind: "Aporte" });
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handleClaim() {
    setBusy(true);
    try {
      if (USING_MOCK) {
        await new Promise((r) => setTimeout(r, 900));
        setReceipt({ hash: "0xdemo", kind: "Retiro" });
      } else {
        const h = await claimPot(id, c!.currency);
        setReceipt({ hash: h, kind: "Retiro" });
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handleStart() {
    setBusy(true);
    try {
      if (USING_MOCK) {
        await new Promise((r) => setTimeout(r, 900));
        const po = c!.orderMode === 0 ? order : [...order].sort(() => Math.random() - 0.5);
        setC({ ...c!, started: true, payoutOrder: po, roundStart: Math.floor(Date.now() / 1000) });
      } else {
        if (c!.orderMode === 0) await setOrder(id, order, c!.currency);
        await startCycle(id, c!.currency);
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function invite() {
    const url = `${window.location.origin}/cycle/${id}/join`;
    try {
      if (navigator.share) await navigator.share({ title: c!.name, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {}
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setLocalOrder(next);
  }

  return (
    <main className="px-6 pb-12 pt-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-muted">← Ciclos</Link>
        <button onClick={invite} className="text-sm font-medium text-forest">
          {copied ? "Link copiado ✓" : "Invitar"}
        </button>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <h1 className="font-serif text-2xl text-ink">{c.name}</h1>
        <span className="text-xs uppercase tracking-widest text-bronze">{c.currency}</span>
      </div>
      <p className="mt-1 text-sm text-muted">
        {money(c.amount, c.currency)} · {FREQUENCY_LABEL[c.frequency]} · {ORDER_LABEL[c.orderMode]}
      </p>

      {/* Recaudación + ronda macro + deadline */}
      <section className="mt-7 border-y border-line py-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted">Pozo de la ronda</p>
            <p className="mt-1 font-serif text-3xl text-forest">{money(pot, c.currency)}</p>
            {c.started && (
              <p className="mt-1 text-xs text-muted">Ronda {c.round + 1} de {n}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm tabular-nums text-muted">{fundedCount}/{n} aportes</p>
            {c.started && (
              <p className={`mt-0.5 text-xs ${overdue ? "text-red-600" : "text-muted"}`}>{dl}</p>
            )}
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar pct={(fundedCount / n) * 100} />
        </div>
      </section>

      {/* Proyección personal */}
      {myIndex >= 0 && (
        <section className="mt-5 rounded-lg border border-line p-4">
          <p className="text-xs uppercase tracking-widest text-muted">Tu proyección</p>
          {myTurn === null ? (
            <p className="mt-1.5 text-sm text-ink">Tu turno se define al iniciar el ciclo.</p>
          ) : myTurn < c.round ? (
            <p className="mt-1.5 text-sm text-ink">Ya recibiste tu pozo de {money(pot, c.currency)}.</p>
          ) : (
            <p className="mt-1.5 text-sm leading-relaxed text-ink">
              Recibes <span className="font-medium text-forest">{money(pot, c.currency)}</span> en la
              ronda {myTurn + 1}
              {myReceiveDate ? ` · aprox. ${dateFmt(myReceiveDate)}` : ""}. Aportarás{" "}
              {money(c.amount * n, c.currency)} en {n} cuotas de {money(c.amount, c.currency)}.
            </p>
          )}
        </section>
      )}

      {/* Recibo on-chain */}
      {receipt && (
        <div className="mt-5 rounded-lg border border-forest/30 bg-forest/5 px-4 py-3">
          <p className="text-sm font-medium text-forest">{receipt.kind} registrado on-chain ✓</p>
          {USING_MOCK ? (
            <p className="mt-0.5 text-xs text-muted">Confirmado en la blockchain (demo).</p>
          ) : (
            <a href={CELOSCAN_TX(receipt.hash)} target="_blank" rel="noreferrer" className="mt-0.5 inline-block text-xs text-bronze underline">
              Ver en Celoscan ↗
            </a>
          )}
        </div>
      )}

      {/* Bloqueo por impago */}
      {c.started && !fullyFunded && (
        <div className="mt-5 rounded-lg border border-bronze/60 bg-bronze/10 px-4 py-3">
          <p className="text-sm font-medium text-ink">El ciclo no puede continuar</p>
          <p className="mt-1 text-sm text-muted">
            Falta consignar:{" "}
            <span className="text-forest">
              {pendientes.map((m) => (m.toLowerCase() === me ? "Tú" : nameOf(m))).join(", ")}
            </span>
            .
          </p>
        </div>
      )}

      {/* Miembros + cola de turnos */}
      <section className="mt-6">
        <h2 className="mb-1 font-serif text-lg text-ink">
          Miembros <span className="text-sm text-muted">({n}/12)</span>
        </h2>
        <div>
          {c.members.map((m, i) => (
            <MemberRow
              key={m}
              name={nameOf(m)}
              index={i}
              paid={!!c.paidThisRound[m.toLowerCase()]}
              turn={turnRound(i, effOrder)}
              currentRound={c.round}
              started={c.started}
              isYou={m.toLowerCase() === me}
            />
          ))}
        </div>
      </section>

      {/* Acción contextual */}
      <div className="mt-8">
        {!c.started ? (
          isAdmin ? (
            <AdminStart
              orderMode={c.orderMode}
              order={order}
              nameOf={(i) => (c.members[i].toLowerCase() === me ? "Tú" : nameOf(c.members[i]))}
              onMove={move}
              onStart={handleStart}
              busy={busy}
              canStart={n >= 2}
            />
          ) : (
            <Button full disabled>El organizador aún no inicia el ciclo</Button>
          )
        ) : isBeneficiary && fullyFunded ? (
          <Button full onClick={handleClaim} disabled={busy}>
            {busy ? "Procesando…" : `Retirar Capital · ${money(pot, c.currency)}`}
          </Button>
        ) : isBeneficiary && !fullyFunded ? (
          <Button full variant="outline" disabled>Esperando que todos consignen</Button>
        ) : iPaid ? (
          <Button full variant="outline" disabled>Aporte registrado ✓</Button>
        ) : lowBalance ? (
          <div>
            <a href={DEPOSIT_LINK} className="block rounded-lg bg-forest py-3.5 text-center text-sm font-medium text-cream">
              Saldo insuficiente · Depositar en MiniPay
            </a>
            <p className="mt-2 text-center text-xs text-muted">
              Necesitas {money(c.amount, c.currency)} para tu aporte.
            </p>
          </div>
        ) : (
          <div>
            <Button full onClick={handlePay} disabled={busy}>
              {busy ? "Procesando…" : `Pagar Aporte · ${money(c.amount, c.currency)}`}
            </Button>
            <p className="mt-2 text-center text-xs text-muted">
              Incluye la comisión de red (~0.001) en {c.currency}.
            </p>
          </div>
        )}
      </div>

      {/* Chat */}
      <section className="mt-8">
        <CycleChat cycleId={id} me={me} seed={USING_MOCK ? CHAT_SEED : undefined} />
      </section>
    </main>
  );
}

function AdminStart({
  orderMode,
  order,
  nameOf,
  onMove,
  onStart,
  busy,
  canStart,
}: {
  orderMode: number;
  order: number[];
  nameOf: (memberIndex: number) => string;
  onMove: (i: number, dir: -1 | 1) => void;
  onStart: () => void;
  busy: boolean;
  canStart: boolean;
}) {
  return (
    <div>
      {orderMode === 0 ? (
        <div className="mb-4">
          <p className="mb-2 text-xs uppercase tracking-widest text-muted">Orden de cobro</p>
          <div className="rounded-lg border border-line">
            {order.map((memberIndex, pos) => (
              <div key={memberIndex} className="flex items-center justify-between border-b border-line px-3 py-2.5 last:border-0">
                <div className="flex items-center gap-2.5">
                  <span className="w-4 text-xs tabular-nums text-bronze">{pos + 1}</span>
                  <Avatar name={nameOf(memberIndex)} size={28} />
                  <span className="text-sm text-ink">{nameOf(memberIndex)}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => onMove(pos, -1)} className="px-2 py-1 text-muted disabled:opacity-30" disabled={pos === 0}>↑</button>
                  <button onClick={() => onMove(pos, 1)} className="px-2 py-1 text-muted disabled:opacity-30" disabled={pos === order.length - 1}>↓</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mb-4 rounded-lg border border-line px-4 py-3 text-sm text-muted">
          El orden de cobro se decidirá por sorteo al iniciar, visible para todos.
        </p>
      )}
      <Button full onClick={onStart} disabled={busy || !canStart}>
        {busy ? "Iniciando…" : canStart ? "Iniciar ciclo" : "Faltan miembros (mín. 2)"}
      </Button>
    </div>
  );
}
