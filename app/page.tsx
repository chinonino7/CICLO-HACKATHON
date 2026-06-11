"use client";

import { useEffect } from "react";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/Button";
import { Avatar } from "@/components/Avatar";
import { ProgressBar } from "@/components/ProgressBar";
import { Stepper } from "@/components/Stepper";
import { FAQ } from "@/components/FAQ";
import { useMiniPay } from "@/hooks/useMiniPay";
import { setMode } from "@/lib/mock";

const STEPS = [
  {
    title: "Crea o únete a un ciclo",
    body: "Arma el grupo con tu gente de confianza y comparte el link de invitación.",
  },
  {
    title: "Todos aportan lo mismo",
    body: "Un monto fijo cada quincena o cada mes, directo desde MiniPay.",
  },
  {
    title: "Cada ronda alguien recibe el pozo",
    body: "El turno rota: una persona recibe el total acumulado de los aportes.",
  },
  {
    title: "El ciclo se completa",
    body: "Termina cuando todos recibieron. Pueden empezar uno nuevo cuando quieran.",
  },
];

const FAQS = [
  {
    q: "¿Qué es un ciclo?",
    a: "Es un ahorro rotativo (cadena, tanda, natillera): un grupo aporta un monto fijo cada periodo y, por turnos, cada miembro recibe el pozo completo.",
  },
  {
    q: "¿Dónde está mi dinero?",
    a: "En un contrato inteligente en la red Celo. Nadie —ni siquiera el administrador del ciclo— puede tocarlo fuera de las reglas del ciclo.",
  },
  {
    q: "¿Qué necesito para usar CICLO?",
    a: "Solo MiniPay. Sin frase semilla complicada ni comisiones de gas en CELO.",
  },
  {
    q: "¿Qué pasa si alguien no paga?",
    a: "El ciclo se pausa hasta completar los aportes y todos los miembros lo ven en tiempo real. La transparencia es la garantía.",
  },
  {
    q: "¿Cuánto cuesta?",
    a: "CICLO no cobra comisión. Cada transacción en Celo cuesta una fracción de centavo (~$0.001).",
  },
];

/** Tarjeta estática que simula un ciclo en progreso (solo visual, datos fijos). */
function HeroCycleMock() {
  const members = ["María", "Carlos", "Luisa", "Andrés", "Paola"];
  return (
    <div className="mt-8 w-full rounded-xl border border-line bg-white p-5 text-left shadow-sm">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-semibold text-ink">Ahorro de la cuadra</p>
        <span className="rounded-full bg-bronze/15 px-2.5 py-0.5 text-xs text-bronze">
          Ronda 3 de 5
        </span>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold text-forest">250.000 COPm</p>
      <p className="text-xs text-muted">en el pozo · recibe María</p>
      <div className="mt-4">
        <ProgressBar pct={60} />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex -space-x-2">
          {members.map((m) => (
            <span key={m} className="rounded-full ring-2 ring-white">
              <Avatar name={m} size={28} />
            </span>
          ))}
        </div>
        <span className="text-xs text-muted">5 miembros</span>
      </div>
    </div>
  );
}

export default function Onboarding() {
  const { address, isMiniPay, isLoading } = useMiniPay();

  // Auto-redirect solo dentro de MiniPay; con otras wallets (Rabby, MetaMask)
  // se muestra la landing y el usuario entra con el botón.
  useEffect(() => {
    if (address && isMiniPay) {
      setMode("real");
      window.location.replace("/dashboard");
    }
  }, [address, isMiniPay]);

  function enter(mode: "demo" | "real") {
    setMode(mode);
    // Recarga completa para que toda la app re-evalúe el modo.
    window.location.href = "/dashboard";
  }

  return (
    <main className="px-6 py-12 text-center">
      {/* Hero */}
      <section className="flex flex-col items-center">
        <Wordmark size="lg" />
        <p className="mt-5 max-w-[18rem] font-display text-lg leading-relaxed text-muted">
          Ahorro comunitario, en confianza.
        </p>
        <p className="mt-3 max-w-[19rem] text-sm leading-relaxed text-muted">
          Digitaliza tu ahorro rotativo. Aportes y turnos claros, sin intermediarios.
        </p>
        <HeroCycleMock />

        <div className="mt-8 w-full space-y-3">
          <Button full onClick={() => enter("real")} disabled={isLoading && isMiniPay}>
            Conectar con MiniPay
          </Button>
          <Button full variant="outline" onClick={() => enter("demo")}>
            Ver demo de la app
          </Button>
          <p className="text-xs text-muted">
            El demo simula todo el flujo con datos de ejemplo, sin wallet ni dinero.
          </p>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="mt-14">
        <h2 className="font-display text-base font-semibold text-ink">¿Cómo funciona?</h2>
        <div className="mx-auto mt-2 h-px w-12 bg-bronze" />
        <div className="mt-7">
          <Stepper steps={STEPS} />
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-14">
        <h2 className="font-display text-base font-semibold text-ink">Preguntas frecuentes</h2>
        <div className="mx-auto mt-2 h-px w-12 bg-bronze" />
        <div className="mt-7">
          <FAQ items={FAQS} />
        </div>
      </section>

      {/* MiniPay */}
      <section className="mt-14 rounded-xl border border-line bg-white p-5">
        <p className="font-display text-sm font-semibold text-ink">Corre dentro de MiniPay</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          CICLO vive en MiniPay: te registras con tu número de teléfono, sin frase semilla.
        </p>
        <a
          href="https://www.minipay.to"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-sm font-medium text-forest underline underline-offset-4"
        >
          Conseguir MiniPay →
        </a>
      </section>

      {/* Footer */}
      <footer className="mt-12 pb-4">
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Proyecto en fase experimental. Usa montos pequeños.
        </p>
      </footer>
    </main>
  );
}
