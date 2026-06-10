"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/Button";
import { useMiniPay } from "@/hooks/useMiniPay";
import { USING_MOCK } from "@/lib/mock";

export default function Onboarding() {
  const router = useRouter();
  const { address, isMiniPay, isLoading } = useMiniPay();

  // Auto-redirect dentro de MiniPay (wallet inyectada, sin botón).
  useEffect(() => {
    if (address) router.replace("/dashboard");
  }, [address, router]);

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-between px-6 py-16 text-center">
      <div className="flex flex-1 flex-col items-center justify-center">
        <Wordmark size="lg" />
        <p className="mt-5 max-w-[16rem] font-serif text-lg leading-relaxed text-muted">
          Ahorro comunitario, en confianza.
        </p>
        <div className="mt-6 h-px w-12 bg-bronze" />
        <p className="mt-6 max-w-[18rem] text-sm leading-relaxed text-muted">
          Digitaliza tu natillera o cadena de ahorro. Aportes y turnos claros, sin
          intermediarios.
        </p>

        <ol className="mt-8 w-full max-w-[18rem] space-y-3 text-left">
          {[
            "Todos aportan el mismo monto cada periodo.",
            "Cada ronda, un miembro recibe el pozo completo.",
            "El ciclo termina cuando todos han recibido.",
          ].map((t, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-bronze text-xs text-bronze">
                {i + 1}
              </span>
              <span className="text-sm leading-relaxed text-ink">{t}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="w-full">
        <Button
          full
          onClick={() => router.push("/dashboard")}
          disabled={isLoading && isMiniPay}
        >
          Conectar con MiniPay
        </Button>
        {USING_MOCK && (
          <p className="mt-3 text-xs text-bronze">modo demo · datos de ejemplo</p>
        )}
      </div>
    </main>
  );
}
