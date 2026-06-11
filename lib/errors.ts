import { CHAIN } from "./chain";

/** Traduce errores de viem/MiniPay a mensajes cortos en español. */
export function errorMessage(e: unknown): string {
  const raw =
    e instanceof Error ? `${e.name} ${e.message}` : typeof e === "string" ? e : String(e);
  const m = raw.toLowerCase();
  if (m.includes("rejected") || m.includes("denied") || m.includes("cancel")) {
    return "Cancelaste la transacción.";
  }
  if (m.includes("chain") && (m.includes("mismatch") || m.includes("does not match") || m.includes("unrecognized") || m.includes("4902"))) {
    return `Tu wallet está en otra red. Cámbiala a ${CHAIN.name}.`;
  }
  if (m.includes("insufficient") || m.includes("exceeds balance")) {
    return "Saldo insuficiente para completar el aporte.";
  }
  if (m.includes("timeout") || m.includes("network") || m.includes("fetch") || m.includes("http request")) {
    return "Sin conexión con la red Celo. Revisa tu internet.";
  }
  return "Algo salió mal. Intenta de nuevo.";
}
