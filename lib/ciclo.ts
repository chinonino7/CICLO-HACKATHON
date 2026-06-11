import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseUnits,
  formatUnits,
} from "viem";
import { CHAIN } from "./chain";
import { FACTORY_ABI, FACTORY_ADDRESS, CICLO_ABI, ERC20_ABI } from "./contract-ciclo";
import { CURRENCIES, currencyByAddress, type CurrencyKey } from "./tokens";
import { USING_MOCK, MOCK_ME } from "./mock";
import * as store from "./mockstore";

export const MAX_MEMBERS = 12;

const MOCK_HASH = "0xmock" as `0x${string}`;

export type Cycle = {
  id: number;
  admin: `0x${string}`;
  name: string;
  currency: CurrencyKey;
  token: `0x${string}`;
  amount: number; // por turno
  frequency: number; // 0 Quincenal, 1 Mensual
  orderMode: number; // 0 Admin, 1 Sorteo
  size: number; // cupos del ciclo (2..12)
  round: number;
  roundStart: number; // timestamp en segundos (0 si no ha iniciado)
  started: boolean;
  members: `0x${string}`[];
  payoutOrder: number[];
};

export type CycleDetail = Cycle & {
  beneficiary: `0x${string}` | null;
  paidThisRound: Record<string, boolean>;
};

export const publicClient = createPublicClient({ chain: CHAIN, transport: http() });

function walletClient() {
  return createWalletClient({ chain: CHAIN, transport: custom((window as any).ethereum) });
}

/** feeCurrency (CIP-64) solo dentro de MiniPay; MetaMask paga gas en CELO. */
function feeOpts(currency: CurrencyKey) {
  const isMiniPay = typeof window !== "undefined" && (window as any).ethereum?.isMiniPay;
  return isMiniPay ? { feeCurrency: CURRENCIES[currency].feeCurrency } : {};
}

// Cada ciclo es su propio contrato; el factory mapea id (índice) → dirección.
// Las direcciones son inmutables: caché de módulo.
const addrCache = new Map<number, `0x${string}`>();

async function cycleAddress(id: number): Promise<`0x${string}`> {
  const cached = addrCache.get(id);
  if (cached) return cached;
  const addr = (await publicClient.readContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "cycles",
    args: [BigInt(id)],
  })) as `0x${string}`;
  addrCache.set(id, addr);
  return addr;
}

type Info = {
  admin: `0x${string}`;
  name: string;
  token: `0x${string}`;
  amount: bigint;
  frequency: number;
  orderMode: number;
  size: number;
  round: number;
  roundStart: bigint;
  started: boolean;
  members: readonly `0x${string}`[];
  payoutOrder: readonly number[];
};

function decode(id: number, g: Info): Cycle {
  const currency = currencyByAddress(g.token);
  return {
    id,
    admin: g.admin,
    name: g.name,
    currency,
    token: g.token,
    amount: Number(formatUnits(g.amount, CURRENCIES[currency].decimals)),
    frequency: Number(g.frequency),
    orderMode: Number(g.orderMode),
    size: Number(g.size),
    round: Number(g.round),
    roundStart: Number(g.roundStart),
    started: g.started,
    members: [...g.members],
    payoutOrder: g.payoutOrder.map(Number),
  };
}

export async function getCycles(): Promise<Cycle[]> {
  if (USING_MOCK) return store.mockListCycles();
  const count = (await publicClient.readContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "cyclesCount",
  })) as bigint;

  const ids = Array.from({ length: Number(count) }, (_, i) => i);
  const list = await Promise.all(ids.map((id) => getCycle(id)));
  return list.reverse();
}

export async function getCycle(id: number): Promise<Cycle> {
  if (USING_MOCK) {
    const c = store.mockGetCycle(id);
    if (!c) throw new Error("not found");
    return c;
  }
  const addr = await cycleAddress(id);
  const info = (await publicClient.readContract({
    address: addr,
    abi: CICLO_ABI,
    functionName: "getInfo",
  })) as Info;
  return decode(id, info);
}

export async function getCycleDetail(id: number): Promise<CycleDetail> {
  if (USING_MOCK) {
    const d = store.mockGetDetail(id);
    if (!d) throw new Error("not found");
    return d;
  }
  const addr = await cycleAddress(id);
  const c = await getCycle(id);
  const paidThisRound: Record<string, boolean> = {};
  await Promise.all(
    c.members.map(async (m) => {
      paidThisRound[m.toLowerCase()] = (await publicClient.readContract({
        address: addr,
        abi: CICLO_ABI,
        functionName: "hasPaid",
        args: [c.round, m],
      })) as boolean;
    })
  );
  const beneficiary =
    c.started && c.round < c.members.length ? c.members[c.payoutOrder[c.round]] : null;
  return { ...c, beneficiary, paidThisRound };
}

// ---- Escrituras ----
// createCycle va al factory (despliega el contrato del ciclo);
// el resto va directo al contrato del ciclo.

export async function createCycle(
  name: string,
  currency: CurrencyKey,
  amountPerTurn: string,
  frequency: number,
  orderMode: number,
  size: number
): Promise<`0x${string}`> {
  const cfg = CURRENCIES[currency];
  if (USING_MOCK) {
    store.mockCreate({
      name,
      currency,
      token: cfg.address,
      amount: Number(amountPerTurn),
      frequency,
      orderMode,
      size,
    });
    return MOCK_HASH;
  }
  const client = walletClient();
  const [account] = await client.getAddresses();
  const hash = await client.writeContract({
    account,
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "createCycle",
    args: [name, cfg.address, parseUnits(amountPerTurn, cfg.decimals), frequency, orderMode, size],
    ...feeOpts(currency),
  } as any);
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function joinCycle(id: number, currency: CurrencyKey): Promise<`0x${string}`> {
  if (USING_MOCK) {
    store.mockJoin(id, MOCK_ME);
    return MOCK_HASH;
  }
  const addr = await cycleAddress(id);
  const client = walletClient();
  const [account] = await client.getAddresses();
  const hash = await client.writeContract({
    account,
    address: addr,
    abi: CICLO_ABI,
    functionName: "join",
    ...feeOpts(currency),
  } as any);
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/** Pagar aporte = approve (al contrato del ciclo) + contribute. */
export async function contribute(id: number, currency: CurrencyKey, amount: number): Promise<`0x${string}`> {
  if (USING_MOCK) {
    store.mockContribute(id, MOCK_ME);
    return MOCK_HASH;
  }
  const cfg = CURRENCIES[currency];
  const addr = await cycleAddress(id);
  const client = walletClient();
  const [account] = await client.getAddresses();
  const value = parseUnits(String(amount), cfg.decimals);

  const allowance = (await publicClient.readContract({
    address: cfg.address,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [account, addr],
  })) as bigint;

  if (allowance < value) {
    const approveHash = await client.writeContract({
      account,
      address: cfg.address,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [addr, value],
      ...feeOpts(currency),
    } as any);
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
  }

  const hash = await client.writeContract({
    account,
    address: addr,
    abi: CICLO_ABI,
    functionName: "contribute",
    ...feeOpts(currency),
  } as any);
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function setOrder(
  id: number,
  order: number[],
  currency: CurrencyKey
): Promise<`0x${string}`> {
  if (USING_MOCK) {
    store.mockSetOrder(id, order);
    return MOCK_HASH;
  }
  const addr = await cycleAddress(id);
  const client = walletClient();
  const [account] = await client.getAddresses();
  const hash = await client.writeContract({
    account,
    address: addr,
    abi: CICLO_ABI,
    functionName: "setOrder",
    args: [order],
    ...feeOpts(currency),
  } as any);
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function startCycle(id: number, currency: CurrencyKey): Promise<`0x${string}`> {
  if (USING_MOCK) {
    store.mockStart(id);
    return MOCK_HASH;
  }
  const addr = await cycleAddress(id);
  const client = walletClient();
  const [account] = await client.getAddresses();
  const hash = await client.writeContract({
    account,
    address: addr,
    abi: CICLO_ABI,
    functionName: "start",
    ...feeOpts(currency),
  } as any);
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function hasPaidRound(
  id: number,
  round: number,
  who: `0x${string}`
): Promise<boolean> {
  if (USING_MOCK) return store.mockHasPaid(id, round, who);
  const addr = await cycleAddress(id);
  return (await publicClient.readContract({
    address: addr,
    abi: CICLO_ABI,
    functionName: "hasPaid",
    args: [round, who],
  })) as boolean;
}

export async function claimPot(id: number, currency: CurrencyKey): Promise<`0x${string}`> {
  if (USING_MOCK) {
    store.mockClaim(id);
    return MOCK_HASH;
  }
  const addr = await cycleAddress(id);
  const client = walletClient();
  const [account] = await client.getAddresses();
  const hash = await client.writeContract({
    account,
    address: addr,
    abi: CICLO_ABI,
    functionName: "claimPot",
    ...feeOpts(currency),
  } as any);
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/** Saldo del usuario en una moneda. */
export async function getBalance(address: `0x${string}`, currency: CurrencyKey): Promise<number> {
  if (USING_MOCK) return currency === "cUSD" ? 42.5 : 180000;
  const cfg = CURRENCIES[currency];
  const raw = (await publicClient.readContract({
    address: cfg.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address],
  })) as bigint;
  return Number(formatUnits(raw, cfg.decimals));
}
