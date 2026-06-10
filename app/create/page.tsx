"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { createCycle, MAX_MEMBERS } from "@/lib/ciclo";
import { CURRENCY_LIST, type CurrencyKey } from "@/lib/tokens";
import { USING_MOCK } from "@/lib/mock";

export default function CreatePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<CurrencyKey>("cUSD");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState(0); // 0 Semanal, 1 Mensual
  const [orderMode, setOrderMode] = useState(1); // 0 Admin, 1 Sorteo
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");

  const valid = name.trim().length > 2 && Number(amount) > 0;

  async function handleCreate() {
    if (!valid) return;
    setStatus("pending");
    try {
      if (!USING_MOCK) await createCycle(name.trim(), currency, amount, frequency, orderMode);
      router.push("/dashboard");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="px-6 pb-12 pt-6">
      <Link href="/dashboard" className="text-sm text-muted">← Volver</Link>
      <h1 className="mt-3 font-serif text-2xl text-ink">Crear un Ciclo</h1>
      <p className="mt-1 text-sm text-muted">Define las reglas. Todo queda registrado on-chain.</p>

      <div className="mt-7 space-y-6">
        <Field label="Nombre del ciclo">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Natillera de la cuadra"
            className="w-full border-b border-line bg-transparent py-2.5 outline-none focus:border-forest"
          />
        </Field>

        <Field label="Moneda">
          <Segmented
            options={CURRENCY_LIST.map((c) => ({ value: c.key, label: c.symbol }))}
            value={currency}
            onChange={(v) => setCurrency(v as CurrencyKey)}
          />
          <p className="mt-1.5 text-xs text-muted">
            Todo el ciclo usará esta moneda. No se puede cambiar después.
          </p>
        </Field>

        <Field label="Monto fijo por turno">
          <div className="flex items-center border-b border-line py-2.5 focus-within:border-forest">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              placeholder={currency === "cCOP" ? "50000" : "20"}
              className="w-full bg-transparent outline-none"
            />
            <span className="text-sm uppercase tracking-widest text-bronze">{currency}</span>
          </div>
        </Field>

        <Field label="Frecuencia de aportes">
          <Segmented
            options={[
              { value: 0, label: "Semanal" },
              { value: 1, label: "Mensual" },
            ]}
            value={frequency}
            onChange={(v) => setFrequency(v as number)}
          />
        </Field>

        <Field label="Orden de los turnos">
          <Segmented
            options={[
              { value: 1, label: "Sorteo" },
              { value: 0, label: "Lo defino yo" },
            ]}
            value={orderMode}
            onChange={(v) => setOrderMode(v as number)}
          />
          <p className="mt-1.5 text-xs text-muted">
            {orderMode === 1
              ? "El orden de cobro se decide al azar al iniciar el ciclo, visible para todos."
              : "Tú defines el orden de cobro antes de iniciar el ciclo."}
          </p>
        </Field>

        <div className="flex items-center justify-between border border-line rounded-lg px-4 py-3">
          <span className="text-sm text-muted">Cupos del ciclo</span>
          <span className="font-serif text-lg text-forest">Máx. {MAX_MEMBERS}</span>
        </div>
      </div>

      {status === "error" && (
        <p className="mt-4 text-sm text-red-600">No se pudo crear. Intenta de nuevo.</p>
      )}

      <div className="mt-8">
        <Button full onClick={handleCreate} disabled={!valid || status === "pending"}>
          {status === "pending" ? "Creando…" : "Crear ciclo"}
        </Button>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-2 block text-xs uppercase tracking-widest text-muted">{label}</span>
      {children}
    </div>
  );
}

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex w-full rounded-lg border border-line p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              active ? "bg-forest text-cream" : "text-muted"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
