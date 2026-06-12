// Modo demo vs real. Los datos demo viven en lib/mockstore.ts (localStorage).
import { CICLO_ADDRESS, ZERO_ADDRESS } from "./contract-ciclo";

/** Hay contrato configurado (registro Ciclo desplegado). */
export const HAS_CONTRACT = CICLO_ADDRESS !== ZERO_ADDRESS;

const MODE_KEY = "ciclo-mode";

// Demo si el usuario lo eligió en la landing, o forzado si no hay contrato.
// Se evalúa al cargar la página: los cambios de modo navegan con recarga
// completa (window.location) para re-evaluar esta constante.
export const USING_MOCK =
  !HAS_CONTRACT ||
  (typeof window !== "undefined" && window.localStorage.getItem(MODE_KEY) === "demo");

export function setMode(mode: "demo" | "real") {
  try {
    window.localStorage.setItem(MODE_KEY, mode);
  } catch {}
}

// Dirección que representa "tú" en el demo (sin wallet conectada).
export const MOCK_ME = "0xA11ce00000000000000000000000000000000001" as `0x${string}`;
