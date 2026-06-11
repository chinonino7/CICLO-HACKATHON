// Modo demo: activo cuando el factory no está desplegado (sin NEXT_PUBLIC_FACTORY_ADDRESS).
// Los datos viven en lib/mockstore.ts (localStorage), así crear/unirse/iniciar persiste.
import { FACTORY_ADDRESS, ZERO_ADDRESS } from "./contract-ciclo";

export const USING_MOCK = FACTORY_ADDRESS === ZERO_ADDRESS;

// Dirección que representa "tú" en el demo (sin wallet conectada).
export const MOCK_ME = "0xA11ce00000000000000000000000000000000001" as `0x${string}`;
