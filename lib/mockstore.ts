// Store local (localStorage) para el MODO DEMO: permite crear ciclos, unirse,
// iniciar, aportar y retirar de verdad sin desplegar el contrato.
import type { Cycle, CycleDetail } from "./ciclo";
import type { CurrencyKey } from "./tokens";
import { MOCK_ME } from "./mock";

// Subir la versión de las claves descarta los datos demo anteriores del navegador.
const CKEY = "ciclo-mock-cycles-v4";
const PKEY = "ciclo-mock-paid-v4";

const addr = (n: number) =>
  `0x${(n + 0xa11ce).toString(16).padStart(40, "0")}` as `0x${string}`;

// Ciclos de ejemplo para que el demo muestre todo el funcionamiento:
// uno en curso (con aportes) y uno por iniciar.
function seedCycles(): Cycle[] {
  return [
    {
      id: 0,
      admin: addr(9),
      name: "Ahorro viaje fin de año",
      currency: "cUSD",
      token: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
      amount: 20,
      frequency: 0,
      orderMode: 0,
      size: 4,
      round: 0,
      roundStart: 0,
      started: false,
      members: [addr(9), MOCK_ME, addr(7)],
      payoutOrder: [],
    },
    {
      id: 1,
      admin: MOCK_ME,
      name: "Ahorro de la cuadra",
      currency: "COPm",
      token: "0x8A567e2aE79CA692Bd748aB832081C45de4041eA",
      amount: 50000,
      frequency: 1,
      orderMode: 1,
      size: 6,
      round: 0,
      roundStart: Math.floor(Date.now() / 1000) - 2 * 86400,
      started: true,
      members: [MOCK_ME, addr(2), addr(3), addr(4), addr(5)],
      payoutOrder: [2, 0, 4, 1, 3],
    },
  ];
}

function seedPaid(): Record<string, boolean> {
  const c = seedCycles()[1];
  const paidIdx = [0, 1, 3]; // algunos ya consignaron
  const p: Record<string, boolean> = {};
  c.members.forEach((m, i) => {
    p[`1:0:${m.toLowerCase()}`] = paidIdx.includes(i);
  });
  return p;
}

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, val: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

function ensure() {
  if (typeof window === "undefined") return;
  if (!localStorage.getItem(CKEY)) write(CKEY, seedCycles());
  if (!localStorage.getItem(PKEY)) write(PKEY, seedPaid());
}

function cycles(): Cycle[] {
  ensure();
  return read<Cycle[]>(CKEY, []);
}
function paid(): Record<string, boolean> {
  ensure();
  return read<Record<string, boolean>>(PKEY, {});
}

function mutate(id: number, fn: (c: Cycle) => void) {
  const cs = cycles();
  const c = cs.find((x) => x.id === id);
  if (c) {
    fn(c);
    write(CKEY, cs);
  }
}

export function mockListCycles(): Cycle[] {
  return [...cycles()].sort((a, b) => b.id - a.id);
}

export function mockGetCycle(id: number): Cycle | null {
  return cycles().find((c) => c.id === id) ?? null;
}

export function mockGetDetail(id: number): CycleDetail | null {
  const c = mockGetCycle(id);
  if (!c) return null;
  const p = paid();
  const paidThisRound: Record<string, boolean> = {};
  c.members.forEach((m) => {
    paidThisRound[m.toLowerCase()] = !!p[`${id}:${c.round}:${m.toLowerCase()}`];
  });
  const beneficiary =
    c.started && c.round < c.members.length ? c.members[c.payoutOrder[c.round]] : null;
  return { ...c, beneficiary, paidThisRound };
}

export function mockHasPaid(id: number, round: number, who: string): boolean {
  return !!paid()[`${id}:${round}:${who.toLowerCase()}`];
}

export function mockCreate(f: {
  name: string;
  currency: CurrencyKey;
  token: `0x${string}`;
  amount: number;
  frequency: number;
  orderMode: number;
  size: number;
}): number {
  const cs = cycles();
  const id = cs.reduce((m, c) => Math.max(m, c.id), -1) + 1;
  cs.push({
    id,
    admin: MOCK_ME,
    name: f.name,
    currency: f.currency,
    token: f.token,
    amount: f.amount,
    frequency: f.frequency,
    orderMode: f.orderMode,
    size: f.size,
    round: 0,
    roundStart: 0,
    started: false,
    members: [MOCK_ME],
    payoutOrder: [],
  });
  write(CKEY, cs);
  return id;
}

export function mockJoin(id: number, who: `0x${string}`) {
  mutate(id, (c) => {
    if (c.members.length < c.size && !c.members.some((m) => m.toLowerCase() === who.toLowerCase()))
      c.members.push(who);
  });
}

export function mockAddDemoMember(id: number) {
  mutate(id, (c) => {
    if (c.members.length < c.size) c.members.push(addr(200 + c.members.length));
  });
}

export function mockSetOrder(id: number, order: number[]) {
  mutate(id, (c) => {
    c.payoutOrder = order;
  });
}

export function mockStart(id: number) {
  mutate(id, (c) => {
    if (c.orderMode === 1 || c.payoutOrder.length !== c.members.length) {
      const o = c.members.map((_, i) => i);
      for (let i = o.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [o[i], o[j]] = [o[j], o[i]];
      }
      c.payoutOrder = o;
    }
    c.started = true;
    c.roundStart = Math.floor(Date.now() / 1000);
  });
}

export function mockContribute(id: number, who: string) {
  const c = mockGetCycle(id);
  if (!c) return;
  const p = paid();
  p[`${id}:${c.round}:${who.toLowerCase()}`] = true;
  write(PKEY, p);
}

export function mockSimulateOthersPaid(id: number) {
  const c = mockGetCycle(id);
  if (!c) return;
  const p = paid();
  c.members.forEach((m) => {
    p[`${id}:${c.round}:${m.toLowerCase()}`] = true;
  });
  write(PKEY, p);
}

/** Demo: retrocede el inicio de la ronda para que la fecha de pago ya haya llegado. */
export function mockTimeTravelToDeadline(id: number) {
  mutate(id, (c) => {
    c.roundStart = Math.floor(Date.now() / 1000) - 35 * 86400;
  });
}

export function mockClaim(id: number) {
  mutate(id, (c) => {
    c.round = c.round + 1;
    c.roundStart = Math.floor(Date.now() / 1000);
  });
}
