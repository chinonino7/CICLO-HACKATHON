"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { useToast } from "@/components/Toast";
import { createCycle, getCycles, MAX_MEMBERS } from "@/lib/ciclo";
import { errorMessage } from "@/lib/errors";
import { CURRENCY_LIST, type CurrencyKey } from "@/lib/tokens";
import { USING_MOCK } from "@/lib/mock";

export default function CreatePage() {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [currency, setCurrency] = useState<CurrencyKey>("cUSD");
  const [amount, setAmount] = useState("");
  const [amountTouched, setAmountTouched] = useState(false);
  const [frequency, setFrequency] = useState(0); // 0 Quincenal, 1 Mensual
  const [orderMode, setOrderMode] = useState(1); // 0 Admin, 1 Sorteo
  const [size, setSize] = useState(6); // cupos (2..12)
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const [errText, setErrText] = useState("");

  const nameError = nameTouched && name.trim().length <= 2;
  const amountError = amountTouched && !(Number(amount) > 0);
  const valid = name.trim().length > 2 && Number(amount) > 0;

  async function handleCreate() {
    if (!valid) return;
    setStatus("pending");
    try {
      await createCycle(name.trim(), currency, amount, frequency, orderMode, size);
      toast("Ciclo creado ✓", "success");
      if (USING_MOCK) {
        // En demo el ciclo nuevo es el de mayor id: llevar directo a su room.
        const all = await getCycles();
        const newId = all.reduce((m, c) => Math.max(m, c.id), -1);
        router.push(newId >= 0 ? `/cycle/${newId}` : "/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (e) {
      setErrText(errorMessage(e));
      setStatus("error");
    }
  }

  return (
    <main className="px-6 pb-12 pt-6">
      <Link href="/dashboard" className="text-sm text-muted">← Volver</Link>
      <h1 className="mt-3 font-display text-2xl text-ink">Crear un Ciclo</h1>
      <p className="mt-1 text-sm text-muted">Define las reglas. Todo queda registrado on-chain.</p>

      <div className="mt-7 space-y-6">
        <Field label="Nombre del ciclo">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setNameTouched(true)}
            placeholder="Ej: Ahorro de la cuadra"
            className={`w-full border-b bg-transparent py-2.5 outline-none focus:border-forest ${nameError ? "border-claret" : "border-line"}`}
          />
          {nameError && (
            <p className="mt-1.5 text-xs text-claret">El nombre necesita al menos 3 letras.</p>
          )}
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
          <div className={`flex items-center border-b py-2.5 focus-within:border-forest ${amountError ? "border-claret" : "border-line"}`}>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              onBlur={() => setAmountTouched(true)}
              inputMode="decimal"
              placeholder={currency === "COPm" ? "50000" : "20"}
              className="w-full bg-transparent outline-none"
            />
            <span className="text-sm uppercase tracking-widest text-bronze">{currency}</span>
          </div>
          {amountError && (
            <p className="mt-1.5 text-xs text-claret">Ingresa un monto mayor a 0.</p>
          )}
        </Field>

        <Field label="Frecuencia de aportes">
          <Segmented
            options={[
              { value: 0, label: "Quincenal" },
              { value: 1, label: "Mensual" },
            ]}
            value={frequency}
            onChange={(v) => setFrequency(v as number)}
          />
          <p className="mt-1.5 text-xs text-muted">
            {frequency === 0
              ? "El pozo se entrega los días 15 y el último día de cada mes."
              : "El pozo se entrega el último día de cada mes (30 o 31)."}
          </p>
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

        <Field label="Cupos del ciclo">
          <div className="flex items-center justify-between rounded-lg border border-line px-4 py-2.5">
            <button
              type="button"
              onClick={() => setSize((s) => Math.max(2, s - 1))}
              disabled={size <= 2}
              className="grid h-8 w-8 place-items-center rounded-full border border-line text-lg text-forest disabled:opacity-30"
            >
              −
            </button>
            <span className="font-display text-xl text-forest">{size}</span>
            <button
              type="button"
              onClick={() => setSize((s) => Math.min(MAX_MEMBERS, s + 1))}
              disabled={size >= MAX_MEMBERS}
              className="grid h-8 w-8 place-items-center rounded-full border border-line text-lg text-forest disabled:opacity-30"
            >
              +
            </button>
          </div>
          <p className="mt-1.5 text-xs text-muted">Entre 2 y {MAX_MEMBERS} personas.</p>
        </Field>
      </div>

      {status === "error" && <p className="mt-4 text-sm text-claret">{errText}</p>}

      <div className="mt-8">
        <Button full onClick={handleCreate} disabled={!valid} loading={status === "pending"}>
          Crear ciclo
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
