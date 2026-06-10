"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/Button";
import { useMiniPay } from "@/hooks/useMiniPay";
import { getCycle, joinCycle, MAX_MEMBERS, type Cycle } from "@/lib/ciclo";
import { money, FREQUENCY_LABEL } from "@/lib/format";
import { setAlias } from "@/lib/identity";
import { USING_MOCK, mockCycles, MOCK_ME } from "@/lib/mock";

export default function JoinPage() {
  const id = Number(useParams().id);
  const router = useRouter();
  const { address } = useMiniPay();
  const [c, setC] = useState<Cycle | null>(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");

  useEffect(() => {
    (async () => {
      try {
        setC(USING_MOCK ? mockCycles.find((m) => m.id === id) ?? null : await getCycle(id));
      } catch {
        setC(mockCycles.find((m) => m.id === id) ?? null);
      }
    })();
  }, [id]);

  const full = !!c && c.members.length >= MAX_MEMBERS;
  const closed = !!c && c.started;

  async function handleJoin() {
    if (!c) return;
    setStatus("pending");
    try {
      const me = address ?? (USING_MOCK ? MOCK_ME : null);
      if (me && name.trim()) setAlias(me, name.trim());
      if (!USING_MOCK) await joinCycle(id, c.currency);
      router.push(`/cycle/${id}`);
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="flex min-h-[100dvh] flex-col px-6 py-10">
      <Wordmark size="sm" />

      <div className="flex flex-1 flex-col justify-center">
        <p className="text-xs uppercase tracking-widest text-muted">Te invitaron a un ciclo</p>

        {!c ? (
          <p className="mt-4 text-muted">Cargando ciclo…</p>
        ) : (
          <>
            <h1 className="mt-2 font-serif text-3xl text-ink">{c.name}</h1>
            <div className="mt-6 space-y-3 border-y border-line py-5 text-sm">
              <Row k="Aporte por turno" v={money(c.amount, c.currency)} />
              <Row k="Moneda" v={c.currency} />
              <Row k="Frecuencia" v={FREQUENCY_LABEL[c.frequency]} />
              <Row k="Cupos" v={`${c.members.length}/${MAX_MEMBERS}`} />
            </div>

            <div className="mt-6">
              <span className="mb-2 block text-xs uppercase tracking-widest text-muted">Tu nombre</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="¿Cómo te ven en el grupo?"
                className="w-full border-b border-line bg-transparent py-2.5 outline-none focus:border-forest"
              />
            </div>

            <div className="mt-8">
              {closed ? (
                <Button full disabled>El ciclo ya inició</Button>
              ) : full ? (
                <Button full disabled>Ciclo lleno</Button>
              ) : (
                <Button full onClick={handleJoin} disabled={status === "pending"}>
                  {status === "pending" ? "Uniéndote…" : "Unirme a este ciclo"}
                </Button>
              )}
              {status === "error" && (
                <p className="mt-3 text-sm text-red-600">No se pudo unir. Intenta de nuevo.</p>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{k}</span>
      <span className="text-ink">{v}</span>
    </div>
  );
}
