import type { CurrencyKey } from "./tokens";

export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** Formatea montos según la moneda: cUSD con decimales, cCOP como peso entero. */
export function money(n: number, currency: CurrencyKey): string {
  if (currency === "cCOP") {
    return `${n.toLocaleString("es-CO", { maximumFractionDigits: 0 })} cCOP`;
  }
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cUSD`;
}

export const FREQUENCY_LABEL = ["Semanal", "Mensual"] as const;
export const ORDER_LABEL = ["Definido por admin", "Sorteo"] as const;

const PERIOD_SECONDS = [7 * 86400, 30 * 86400]; // Semanal, Mensual

/** Deadline del aporte de la ronda actual (ms). */
export function deadlineMs(roundStart: number, frequency: number): number {
  return (roundStart + PERIOD_SECONDS[frequency]) * 1000;
}

/** Etiqueta de cuenta regresiva al deadline. */
export function countdown(deadline: number): { label: string; overdue: boolean } {
  const diff = deadline - Date.now();
  const overdue = diff <= 0;
  const a = Math.abs(diff);
  const d = Math.floor(a / 86400000);
  const h = Math.floor((a % 86400000) / 3600000);
  const m = Math.floor((a % 3600000) / 60000);
  const body = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
  return { label: overdue ? `Vencido hace ${body}` : `Faltan ${body}`, overdue };
}

/** En qué ronda recibe el miembro (índice en payoutOrder), o null si no definido. */
export function turnRound(memberIndex: number, payoutOrder: number[]): number | null {
  const r = payoutOrder.indexOf(memberIndex);
  return r === -1 ? null : r;
}
