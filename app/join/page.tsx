"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/Button";

export default function JoinByCode() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  function go() {
    const m = code.match(/cycle\/(\d+)/) ?? code.match(/(\d+)/);
    if (m) router.push(`/cycle/${m[1]}/join`);
    else setError(true);
  }

  return (
    <main className="flex min-h-[100dvh] flex-col px-6 py-10">
      <Link href="/dashboard" className="text-sm text-muted">← Volver</Link>

      <div className="flex flex-1 flex-col justify-center">
        <Wordmark size="sm" />
        <h1 className="mt-6 font-display text-2xl text-ink">Unirme a un ciclo</h1>
        <p className="mt-1 text-sm text-muted">
          Pega el link o el código que te compartieron.
        </p>

        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(false);
          }}
          placeholder="Link del ciclo o código"
          className="mt-6 w-full border-b border-line bg-transparent py-2.5 outline-none focus:border-forest"
        />
        {error ? (
          <p className="mt-2 text-sm text-claret">No reconocimos ese link o código.</p>
        ) : (
          <p className="mt-2 text-xs text-muted">
            Ejemplo: ciclo.app/cycle/4/join o el número 4.
          </p>
        )}

        <div className="mt-8">
          <Button full onClick={go} disabled={!code.trim()}>
            Continuar
          </Button>
        </div>
      </div>
    </main>
  );
}
