// Datos demo para ver el diseño antes de desplegar Ciclo.sol.
import { CICLO_ADDRESS } from "./contract-ciclo";
import type { Cycle, CycleDetail } from "./ciclo";

export const USING_MOCK = CICLO_ADDRESS === "0x0000000000000000000000000000000000000000";

// Dirección demo que representa "tú" (para el botón adaptativo Pagar/Retirar).
export const MOCK_ME = "0xA11ce00000000000000000000000000000000001" as `0x${string}`;

const m = (n: number) =>
  `0x${(n + 0xa11ce).toString(16).padStart(40, "0")}` as `0x${string}`;

export const mockCycles: Cycle[] = [
  {
    id: 1,
    admin: MOCK_ME,
    name: "Natillera de la cuadra",
    currency: "cCOP",
    token: "0x8A567e2aE79CA692Bd748aB832081C45de4041eA",
    amount: 50000,
    frequency: 1, // Mensual
    orderMode: 1, // Sorteo
    round: 0,
    roundStart: Math.floor(Date.now() / 1000) - 2 * 86400, // hace 2 días
    started: true,
    members: [MOCK_ME, m(2), m(3), m(4), m(5)],
    payoutOrder: [2, 0, 4, 1, 3],
  },
  {
    id: 0,
    admin: m(9),
    name: "Ahorro viaje fin de año",
    currency: "cUSD",
    token: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    amount: 20,
    frequency: 0, // Semanal
    orderMode: 0, // Admin
    round: 0,
    roundStart: 0,
    started: false,
    members: [m(9), MOCK_ME, m(7)],
    payoutOrder: [],
  },
];

export const mockDetails: Record<number, CycleDetail> = {
  1: {
    ...mockCycles[0],
    beneficiary: mockCycles[0].members[mockCycles[0].payoutOrder[0]],
    paidThisRound: {
      [MOCK_ME.toLowerCase()]: true,
      [m(2).toLowerCase()]: true,
      [m(3).toLowerCase()]: false,
      [m(4).toLowerCase()]: true,
      [m(5).toLowerCase()]: false,
    },
  },
  0: {
    ...mockCycles[1],
    beneficiary: null,
    paidThisRound: {},
  },
};
