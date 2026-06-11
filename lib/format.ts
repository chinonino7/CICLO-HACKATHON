import type { CurrencyKey } from "./tokens";

export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** Formatea montos según la moneda: cUSD con decimales, COPm como peso entero. */
export function money(n: number, currency: CurrencyKey): string {
  if (currency === "COPm") {
    return `${n.toLocaleString("es-CO", { maximumFractionDigits: 0 })} COPm`;
  }
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cUSD`;
}

export const FREQUENCY_LABEL = ["Quincenal", "Mensual"] as const;
export const ORDER_LABEL = ["Definido por admin", "Sorteo"] as const;

/**
 * Fechas de pago ancladas al calendario, no a periodos corridos:
 * quincenal paga los días 15 y fin de mes; mensual paga a fin de mes.
 * Devuelve el próximo corte (fin del día) estrictamente después de `after`.
 */
function nextBoundary(after: Date, frequency: number): Date {
  const y = after.getFullYear();
  const m = after.getMonth();
  const d = after.getDate();
  const lastDay = new Date(y, m + 1, 0).getDate();
  if (frequency === 0) {
    // Quincenal: día 15 y último día del mes
    if (d < 15) return new Date(y, m, 15, 23, 59, 59);
    if (d < lastDay) return new Date(y, m, lastDay, 23, 59, 59);
    return new Date(y, m + 1, 15, 23, 59, 59);
  }
  // Mensual: último día del mes
  if (d < lastDay) return new Date(y, m, lastDay, 23, 59, 59);
  return new Date(y, m + 2, 0, 23, 59, 59);
}

/** Deadline del aporte de la ronda actual (ms): el próximo corte de calendario. */
export function deadlineMs(roundStart: number, frequency: number): number {
  return nextBoundary(new Date(roundStart * 1000), frequency).getTime();
}

/** Fecha de pago `stepsAhead` cortes después del de la ronda actual (ms). */
export function nthDeadline(roundStart: number, frequency: number, stepsAhead: number): number {
  let b = nextBoundary(new Date(roundStart * 1000), frequency);
  for (let i = 0; i < stepsAhead; i++) b = nextBoundary(b, frequency);
  return b.getTime();
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

/** Urgencia del deadline: ok, próximo (<48h) o vencido. */
export function urgency(deadline: number): "ok" | "soon" | "overdue" {
  const diff = deadline - Date.now();
  if (diff <= 0) return "overdue";
  if (diff < 48 * 3600000) return "soon";
  return "ok";
}

/** En qué ronda recibe el miembro (índice en payoutOrder), o null si no definido. */
export function turnRound(memberIndex: number, payoutOrder: number[]): number | null {
  const r = payoutOrder.indexOf(memberIndex);
  return r === -1 ? null : r;
}
