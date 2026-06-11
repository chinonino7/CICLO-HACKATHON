"use client";

import { useEffect, useRef, useState } from "react";
import { shortAddr } from "@/lib/format";

type Msg = { author: string; text: string; ts: number };

// MVP: chat local (localStorage) por ciclo. En producción usar XMTP o un backend
// para mensajería real multi-dispositivo.
export function CycleChat({
  cycleId,
  me,
  seed,
  nameOf,
}: {
  cycleId: number;
  me: string;
  seed?: Msg[];
  nameOf?: (addr: string) => string;
}) {
  const key = `ciclo-chat-${cycleId}`;
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      setMsgs(saved ? JSON.parse(saved) : seed ?? []);
    } catch {
      setMsgs(seed ?? []);
    }
  }, [key]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [msgs]);

  function send() {
    const t = text.trim();
    if (!t) return;
    const next = [...msgs, { author: me, text: t, ts: Date.now() }];
    setMsgs(next);
    setText("");
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
  }

  return (
    <div className="rounded-lg border border-line">
      <p className="border-b border-line px-4 py-2.5 text-xs uppercase tracking-widest text-muted">
        Chat del ciclo
      </p>

      <div className="max-h-56 space-y-3 overflow-y-auto px-4 py-3">
        {msgs.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted">
            Coordina aquí los aportes y turnos del grupo.
          </p>
        ) : (
          msgs.map((m, i) => {
            const mine = m.author.toLowerCase() === me.toLowerCase();
            return (
              <div key={i} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                <span className="text-[10px] text-muted">
                  {mine ? "Tú" : nameOf ? nameOf(m.author) : shortAddr(m.author)}
                </span>
                <span
                  className={`mt-0.5 max-w-[75%] rounded-lg px-3 py-1.5 text-sm ${
                    mine ? "bg-forest text-cream" : "bg-line text-ink"
                  }`}
                >
                  {m.text}
                </span>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-line p-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Escribe un mensaje…"
          className="flex-1 bg-transparent px-2 py-1.5 text-sm outline-none"
        />
        <button
          onClick={send}
          className="rounded-md bg-forest px-3 py-1.5 text-xs font-medium text-cream active:opacity-80"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
