"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";

type Kind = "success" | "error" | "info";
type ToastItem = { id: number; msg: string; kind: Kind };

const ToastContext = createContext<(msg: string, kind?: Kind) => void>(() => {});

export const useToast = () => useContext(ToastContext);

const KIND_STYLE: Record<Kind, string> = {
  success: "bg-forest text-cream",
  error: "bg-claret text-cream",
  info: "bg-ink text-cream",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const toast = useCallback((msg: string, kind: Kind = "info") => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed bottom-20 left-1/2 z-50 flex w-[calc(100%-3rem)] max-w-[372px] -translate-x-1/2 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-toast-in rounded-lg px-4 py-3 text-sm shadow-lg ${KIND_STYLE[t.kind]}`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
