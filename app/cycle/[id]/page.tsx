"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { ProgressBar } from "@/components/ProgressBar";
import { MemberRow } from "@/components/MemberRow";
import { CycleChat } from "@/components/CycleChat";
import { Avatar } from "@/components/Avatar";
import { RotationWheel, type WheelMember } from "@/components/RotationWheel";
import { DeadlineChip } from "@/components/DeadlineChip";
import { useToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import { useMiniPay } from "@/hooks/useMiniPay";
import {
  getCycleDetail,
  contribute,
  claimPot,
  cancelCycle,
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
  nthDeadline,
  turnRound,
} from "@/lib/format";
import { CELOSCAN_TX } from "@/lib/tokens";
import { displayName, seedDemoAliases } from "@/lib/identity";
import { USING_MOCK, MOCK_ME } from "@/lib/mock";
import { mockAddDemoMember, mockSimulateOthersPaid, mockTimeTravelToDeadline } from "@/lib/mockstore";

const DEPOSIT_LINK = "https://link.minipay.xyz/add_cash";

export default function CycleRoom() {
  const id = Number(useParams().id);
  const { address } = useMiniPay();
  const [c, setC] = useState<CycleDetail | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ok">("loading");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [receipt, setReceipt] = useState<{ hash: string; kind: string } | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [order, setLocalOrder] = useState<number[]>([]);
  const [flashIdx, setFlashIdx] = useState<number | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const toast = useToast();
  const me = (USING_MOCK ? MOCK_ME : address)?.toLowerCase() ?? "";

  async function load() {
    const detail = await getCycleDetail(id);
    setC(detail);
    setLoadState(detail ? "ok" : "error");
  }

  useEffect(() => {
    setLoadState("loading");
    load().catch(() => {
      setC(null);
      setLoadState("error");
    });
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

  if (!c) {
    if (loadState === "error") {
      return (
        <main className="px-6 pt-6">
          <Link href="/dashboard" className="text-sm text-muted">← Ciclos</Link>
          <div className="mt-6 rounded-lg border border-claret/40 bg-claret/5 px-4 py-4">
            <p className="text-sm font-medium text-claret">No pudimos cargar el ciclo</p>
            <p className="mt-1 text-sm text-muted">Revisa tu conexión o que el link sea correcto.</p>
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => {
                setLoadState("loading");
                load().catch(() => setLoadState("error"));
              }}
            >
              Reintentar
            </Button>
          </div>
        </main>
      );
    }
    return (
      <main className="space-y-4 px-6 pt-6">
        <div className="h-7 w-40 animate-pulse rounded bg-line/60" />
        <div className="h-64 animate-pulse rounded-xl bg-line/60" />
        <div className="h-24 animate-pulse rounded-lg bg-line/60" />
      </main>
    );
  }

  const n = c.members.length;
  const fundedCount = c.members.filter((m) => c.paidThisRound[m.toLowerCase()]).length;
  const pot = c.amount * n;
  const fullyFunded = fundedCount === n;
  const iPaid = !!c.paidThisRound[me];
  const isBeneficiary = c.beneficiary?.toLowerCase() === me;
  const isAdmin = c.admin.toLowerCase() === me;
  const pendientes = c.members.filter((m) => !c.paidThisRound[m.toLowerCase()]);
  const lowBalance = !USING_MOCK && balance !== null && balance < c.amount;
  // El pozo solo se libera en el corte de calendario (día 15 / fin de mes).
  const payoutAt = c.started ? deadlineMs(c.roundStart, c.frequency) : 0;
  const payoutDue = c.started && Date.now() >= payoutAt;

  // Proyección personal
  const myIndex = c.members.findIndex((m) => m.toLowerCase() === me);
  const effOrder = c.payoutOrder.length === n ? c.payoutOrder : c.orderMode === 0 ? order : [];
  const myTurn = myIndex >= 0 ? turnRound(myIndex, effOrder) : null;
  // Recibes en el corte de calendario de tu ronda (día 15 o fin de mes).
  const projBase = c.started ? c.roundStart : Math.floor(Date.now() / 1000);
  const myReceiveDate =
    myTurn !== null && myTurn >= c.round
      ? new Date(nthDeadline(projBase, c.frequency, myTurn - c.round))
      : null;
  const dateFmt = (d: Date) => d.toLocaleDateString("es-CO", { day: "numeric", month: "long" });

  const nameOf = (addr: string) => names[addr.toLowerCase()] ?? shortAddr(addr);

  // Nodos de la rueda en orden de cobro; "?" si el sorteo aún no se hace.
  const orderUnknown = !c.started && c.orderMode === 1 && c.payoutOrder.length !== n;
  const wheelMembers: WheelMember[] = (effOrder.length === n
    ? effOrder
    : c.members.map((_, i) => i)
  ).map((memberIndex, pos) => {
    const addr = c.members[memberIndex];
    return {
      name: nameOf(addr),
      isYou: addr.toLowerCase() === me,
      state: orderUnknown
        ? "unknown"
        : !c.started
          ? "upcoming"
          : pos < c.round
            ? "paid-out"
            : pos === c.round
              ? "current"
              : "upcoming",
    };
  });

  // Chat demo autorado por miembros reales del ciclo (así muestran su nombre)
  const chatSeed =
    USING_MOCK && n > 2
      ? [
          { author: c.members[1], text: "Listo, ya consigné mi aporte 🙌", ts: Date.now() - 7200000 },
          { author: c.members[2], text: "Esta semana me toca a mí recibir", ts: Date.now() - 3600000 },
        ]
      : undefined;

  async function handlePay() {
    setBusy(true);
    try {
      // Re-verificar saldo justo antes de enviar (puede estar desactualizado).
      if (!USING_MOCK && address) {
        const b = await getBalance(address, c!.currency).catch(() => null);
        if (b !== null && b < c!.amount) {
          setBalance(b);
          toast("Saldo insuficiente para tu aporte.", "error");
          return;
        }
      }
      const h = await contribute(id, c!.currency, c!.amount);
      setReceipt({ hash: h, kind: "Aporte" });
      toast("Aporte registrado ✓", "success");
      await load();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleClaim() {
    setBusy(true);
    try {
      const h = await claimPot(id, c!.currency);
      setReceipt({ hash: h, kind: "Retiro" });
      toast("Pozo retirado ✓", "success");
      await load();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleStart() {
    setBusy(true);
    try {
      if (c!.orderMode === 0) await setOrder(id, order, c!.currency);
      await startCycle(id, c!.currency);
      toast("Ciclo iniciado ✓", "success");
      await load();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    const msg = c!.started
      ? "¿Cancelar este ciclo? Los aportes de la ronda en curso se devolverán a quienes ya pagaron."
      : "¿Cancelar este ciclo? Aún no hay depósitos; solo se cerrará.";
    if (!window.confirm(msg)) return;
    setBusy(true);
    try {
      await cancelCycle(id, c!.currency);
      toast("Ciclo cancelado ✓", "success");
      await load();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  async function demo(fn: (id: number) => void) {
    fn(id);
    await load();
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
    setFlashIdx(next[j]);
    setTimeout(() => setFlashIdx(null), 600);
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
        <h1 className="font-display text-2xl text-ink">{c.name}</h1>
        <span className="text-xs uppercase tracking-widest text-bronze">{c.currency}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {[money(c.amount, c.currency), FREQUENCY_LABEL[c.frequency], ORDER_LABEL[c.orderMode]].map(
          (t) => (
            <span
              key={t}
              className="rounded-full border border-line bg-white px-2.5 py-1 text-xs text-muted"
            >
              {t}
            </span>
          )
        )}
      </div>

      {/* Rueda de rotación + aportes de la ronda + deadline */}
      <section className="mt-5 animate-fade-up border-y border-line py-5">
        <RotationWheel
          members={wheelMembers}
          potLabel={money(pot, c.currency)}
          subLabel={c.cancelled ? "Cancelado" : c.started ? `Ronda ${c.round + 1} de ${n}` : "Por iniciar"}
          progress={c.started ? c.round / n : 0}
          legend={orderUnknown && !c.cancelled ? "El orden se sortea al iniciar" : undefined}
        />
        {c.started && (
          <div className="mt-3 flex items-center justify-center gap-1.5">
            {Array.from({ length: n }, (_, r) => (
              <span
                key={r}
                className={
                  r < c.round
                    ? "h-1.5 w-1.5 rounded-full bg-forest"
                    : r === c.round
                      ? "h-2 w-2 rounded-full bg-bronze"
                      : "h-1.5 w-1.5 rounded-full bg-line"
                }
              />
            ))}
          </div>
        )}
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="shrink-0 text-sm tabular-nums text-muted">{fundedCount}/{n} aportes</p>
          {c.started && !c.cancelled && <DeadlineChip deadline={deadlineMs(c.roundStart, c.frequency)} />}
        </div>
        <div className="mt-3">
          <ProgressBar pct={(fundedCount / n) * 100} />
        </div>
      </section>

      {/* Proyección personal */}
      {myIndex >= 0 && (
        <section className="mt-5 rounded-lg border border-line p-4">
          <p className="text-xs uppercase tracking-widest text-muted">Tu proyección</p>
          <div className="mt-2">
            {myTurn === null ? (
              <>
                <ProjRow label="Tu turno" value="Se define al iniciar el ciclo" />
                <ProjRow label="Tu aporte" value={`${money(c.amount, c.currency)} · ${FREQUENCY_LABEL[c.frequency]}`} />
              </>
            ) : myTurn < c.round ? (
              <>
                <ProjRow label="Ya recibiste" value={money(pot, c.currency)} strong />
                <ProjRow label="Tu aporte" value={`${money(c.amount, c.currency)} · ${FREQUENCY_LABEL[c.frequency]}`} />
              </>
            ) : (
              <>
                <ProjRow label="Recibes" value={money(pot, c.currency)} strong />
                <ProjRow label="Tu turno" value={`Ronda ${myTurn + 1}`} />
                {myReceiveDate && <ProjRow label="Fecha estimada" value={dateFmt(myReceiveDate)} />}
                <ProjRow label="Tu aporte" value={`${money(c.amount, c.currency)} · ${FREQUENCY_LABEL[c.frequency]}`} />
                <ProjRow label="Total a aportar" value={`${money(c.amount * n, c.currency)} (${n} cuotas)`} />
              </>
            )}
          </div>
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

      {/* Ciclo cancelado */}
      {c.cancelled && (
        <div className="mt-5 rounded-lg border border-claret/40 bg-claret/5 px-4 py-3">
          <p className="text-sm font-medium text-claret">Ciclo cancelado</p>
          <p className="mt-1 text-sm text-muted">
            El organizador canceló este ciclo.
            {c.started ? " Los aportes de la ronda en curso fueron devueltos." : ""}
          </p>
        </div>
      )}

      {/* Bloqueo por impago */}
      {c.started && !c.cancelled && !fullyFunded && (
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

      {/* Miembros + cola de turnos (desplegable) */}
      <details className="group mt-6" open>
        <summary className="flex cursor-pointer list-none items-center justify-between py-1 [&::-webkit-details-marker]:hidden">
          <h2 className="font-display text-lg text-ink">
            Miembros <span className="text-sm text-muted">({n}/{c.size})</span>
          </h2>
          <svg
            className="h-4 w-4 shrink-0 text-bronze transition-transform group-open:rotate-180"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </summary>
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
      </details>

      {/* Acción contextual */}
      {!c.cancelled && (
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
              flash={flashIdx}
            />
          ) : (
            <Button full disabled>El organizador aún no inicia el ciclo</Button>
          )
        ) : isBeneficiary && fullyFunded && payoutDue ? (
          <div>
            <p className="mb-2 text-center text-sm text-forest">Es tu turno de recibir el pozo 🎉</p>
            <Button full onClick={handleClaim} loading={busy}>
              {`Retirar Capital · ${money(pot, c.currency)}`}
            </Button>
          </div>
        ) : isBeneficiary && fullyFunded && !payoutDue ? (
          <div>
            <p className="mb-2 text-center text-sm text-forest">
              Ronda completa: todos consignaron ✓
            </p>
            <Button full variant="outline" disabled>
              {`Recibes ${money(pot, c.currency)} el ${dateFmt(new Date(payoutAt))}`}
            </Button>
          </div>
        ) : isBeneficiary && !fullyFunded ? (
          <div>
            <p className="mb-2 text-center text-sm text-muted">
              Es tu turno de recibir · {iPaid ? "" : "te falta tu aporte y "}
              {pendientes.length === 1 ? "falta 1 aporte" : `faltan ${pendientes.length} aportes`}
            </p>
            <Button full variant="outline" disabled>Esperando que todos consignen</Button>
          </div>
        ) : iPaid ? (
          <div>
            <p className="mb-2 text-center text-sm text-muted">
              {pendientes.length === 1
                ? "Falta 1 aporte para completar la ronda"
                : `Faltan ${pendientes.length} aportes para completar la ronda`}
            </p>
            <Button full variant="outline" disabled>Aporte registrado ✓</Button>
          </div>
        ) : lowBalance ? (
          <div>
            <a href={DEPOSIT_LINK} className="block rounded-lg bg-forest py-3.5 text-center text-sm font-medium text-cream active:scale-[0.98] transition">
              Saldo insuficiente · Depositar en MiniPay
            </a>
            <p className="mt-2 text-center text-xs text-muted">
              Necesitas {money(c.amount, c.currency)} para tu aporte.
            </p>
          </div>
        ) : (
          <div>
            <p className="mb-2 text-center text-sm text-muted">Te falta tu aporte de esta ronda</p>
            <Button full onClick={handlePay} loading={busy}>
              {`Pagar Aporte · ${money(c.amount, c.currency)}`}
            </Button>
            <p className="mt-2 text-center text-xs text-muted">
              Incluye la comisión de red (~0.001) en {c.currency}.
            </p>
          </div>
        )}
      </div>
      )}

      {/* Cancelar (solo admin): antes de iniciar, o con la ronda incompleta */}
      {isAdmin && !c.cancelled && (!c.started || !fullyFunded) && (
        <button
          onClick={handleCancel}
          disabled={busy}
          className="mt-4 w-full text-center text-xs font-medium text-claret underline underline-offset-2 disabled:opacity-40"
        >
          {c.started ? "Cancelar ciclo y devolver los aportes de esta ronda" : "Cancelar ciclo"}
        </button>
      )}

      {/* Controles de demo (solo modo demo) */}
      {USING_MOCK && !c.cancelled && (
        <section className="mt-6 rounded-lg border border-dashed border-line p-3">
          <p className="mb-2 text-[11px] uppercase tracking-widest text-bronze">Modo demo</p>
          <div className="flex flex-wrap gap-2">
            {!c.started && isAdmin && n < c.size && (
              <button
                onClick={() => demo(mockAddDemoMember)}
                className="rounded-lg border border-line px-3 py-2 text-xs font-medium text-forest"
              >
                + Agregar miembro de prueba
              </button>
            )}
            {c.started && !fullyFunded && (
              <button
                onClick={() => demo(mockSimulateOthersPaid)}
                className="rounded-lg border border-line px-3 py-2 text-xs font-medium text-forest"
              >
                Simular aportes de los demás
              </button>
            )}
            {c.started && !payoutDue && (
              <button
                onClick={() => demo(mockTimeTravelToDeadline)}
                className="rounded-lg border border-line px-3 py-2 text-xs font-medium text-forest"
              >
                Adelantar a la fecha de pago
              </button>
            )}
            {!c.started && n < 2 && (
              <span className="text-xs text-muted">Agrega un miembro para poder iniciar.</span>
            )}
          </div>
        </section>
      )}

      {/* Chat */}
      <section className="mt-8">
        <CycleChat cycleId={id} me={me} seed={chatSeed} nameOf={nameOf} />
      </section>
    </main>
  );
}

function ProjRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-2 last:border-0">
      <span className="text-sm font-bold text-ink">{label}</span>
      <span className={`text-sm ${strong ? "font-semibold text-forest" : "text-ink"}`}>{value}</span>
    </div>
  );
}

function ArrowBtn({
  dir,
  onClick,
  disabled,
}: {
  dir: -1 | 1;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === -1 ? "Subir" : "Bajar"}
      className="grid h-10 w-10 place-items-center rounded-lg border border-line text-muted transition active:scale-[0.95] disabled:opacity-30"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d={dir === -1 ? "M3 10l5-5 5 5" : "M3 6l5 5 5-5"}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
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
  flash,
}: {
  orderMode: number;
  order: number[];
  nameOf: (memberIndex: number) => string;
  onMove: (i: number, dir: -1 | 1) => void;
  onStart: () => void;
  busy: boolean;
  canStart: boolean;
  flash: number | null;
}) {
  return (
    <div>
      {orderMode === 0 ? (
        <div className="mb-4">
          <p className="mb-2 text-xs uppercase tracking-widest text-muted">Orden de cobro</p>
          <div className="rounded-lg border border-line">
            {order.map((memberIndex, pos) => (
              <div
                key={memberIndex}
                className={`flex items-center justify-between border-b border-line px-3 py-3 transition-colors last:border-0 ${
                  flash === memberIndex ? "bg-bronze/10" : ""
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-4 text-xs tabular-nums text-bronze">{pos + 1}</span>
                  <Avatar name={nameOf(memberIndex)} size={28} />
                  <span className="text-sm text-ink">{nameOf(memberIndex)}</span>
                </div>
                <div className="flex gap-1.5">
                  <ArrowBtn dir={-1} onClick={() => onMove(pos, -1)} disabled={pos === 0} />
                  <ArrowBtn dir={1} onClick={() => onMove(pos, 1)} disabled={pos === order.length - 1} />
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
      <Button full onClick={onStart} loading={busy} disabled={!canStart}>
        {canStart ? "Iniciar ciclo" : "Faltan miembros (mín. 2)"}
      </Button>
    </div>
  );
}
