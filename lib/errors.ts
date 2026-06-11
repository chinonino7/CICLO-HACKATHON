/** Traduce errores de viem/MiniPay a mensajes cortos en español. */
export function errorMessage(e: unknown): string {
  const raw =
    e instanceof Error ? `${e.name} ${e.message}` : typeof e === "string" ? e : String(e);
  const m = raw.toLowerCase();
  if (m.includes("rejected") || m.includes("denied") || m.includes("cancel")) {
    return "Cancelaste la transacción.";
  }
  if (m.includes("insufficient") || m.includes("exceeds balance")) {
    return "Saldo insuficiente para completar el aporte.";
  }
  if (m.includes("timeout") || m.includes("network") || m.includes("fetch")) {
    return "Sin conexión con la red Celo. Revisa tu internet.";
  }
  return "Algo salió mal. Intenta de nuevo.";
}
