import {
  createPublicClient,
  createWalletClient,
  custom,
  fallback,
  http,
  parseUnits,
  formatUnits,
} from "viem";
import { CHAIN, NETWORK } from "./chain";
import { CICLO_ABI, CICLO_ADDRESS, ERC20_ABI } from "./contract-ciclo";
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
  cancelled: boolean;
  members: `0x${string}`[];
  payoutOrder: number[];
};

export type CycleDetail = Cycle & {
  beneficiary: `0x${string}` | null;
  paidThisRound: Record<string, boolean>;
};

// Lecturas con RPCs de respaldo: si forno falla (bloqueos de red, caídas),
// viem pasa automáticamente al siguiente.
const transports =
  NETWORK === "celo"
    ? [http()]
    : [http(), http("https://celo-sepolia.drpc.org"), http("https://rpc.ankr.com/celo_sepolia")];

export const publicClient = createPublicClient({ chain: CHAIN, transport: fallback(transports) });

function walletClient() {
  return createWalletClient({ chain: CHAIN, transport: custom((window as any).ethereum) });
}

/** feeCurrency (CIP-64) solo dentro de MiniPay; MetaMask/Rabby pagan gas en CELO. */
function feeOpts(currency: CurrencyKey) {
  const isMiniPay = typeof window !== "undefined" && (window as any).ethereum?.isMiniPay;
  return isMiniPay ? { feeCurrency: CURRENCIES[currency].feeCurrency } : {};
}

/** Asegura que la wallet esté en la red correcta antes de firmar (Rabby/MetaMask). */
async function ensureChain(client: ReturnType<typeof walletClient>) {
  const current = await client.getChainId();
  if (current === CHAIN.id) return;
  try {
    await client.switchChain({ id: CHAIN.id });
  } catch {
    // La wallet no tiene la red: agregarla y volver a intentar el cambio.
    await client.addChain({ chain: CHAIN });
    await client.switchChain({ id: CHAIN.id });
  }
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
  cancelled: boolean;
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
    cancelled: g.cancelled,
    members: [...g.members],
    payoutOrder: g.payoutOrder.map(Number),
  };
}

export async function getCycles(): Promise<Cycle[]> {
  if (USING_MOCK) return store.mockListCycles();
  const count = (await publicClient.readContract({
    address: CICLO_ADDRESS,
    abi: CICLO_ABI,
    functionName: "groupsCount",
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
  const info = (await publicClient.readContract({
    address: CICLO_ADDRESS,
    abi: CICLO_ABI,
    functionName: "getInfo",
    args: [BigInt(id)],
  })) as Info;
  return decode(id, info);
}

export async function getCycleDetail(id: number): Promise<CycleDetail> {
  if (USING_MOCK) {
    const d = store.mockGetDetail(id);
    if (!d) throw new Error("not found");
    return d;
  }
  const c = await getCycle(id);
  const paidThisRound: Record<string, boolean> = {};
  await Promise.all(
    c.members.map(async (m) => {
      paidThisRound[m.toLowerCase()] = (await publicClient.readContract({
        address: CICLO_ADDRESS,
        abi: CICLO_ABI,
        functionName: "hasPaid",
        args: [BigInt(id), c.round, m],
      })) as boolean;
    })
  );
  const beneficiary =
    c.started && !c.cancelled && c.round < c.members.length
      ? c.members[c.payoutOrder[c.round]]
      : null;
  return { ...c, beneficiary, paidThisRound };
}

// ---- Escrituras (todas contra el registro único) ----

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
  await ensureChain(client);
  const [account] = await client.getAddresses();
  const hash = await client.writeContract({
    account,
    address: CICLO_ADDRESS,
    abi: CICLO_ABI,
    functionName: "createGroup",
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
  const client = walletClient();
  await ensureChain(client);
  const [account] = await client.getAddresses();
  const hash = await client.writeContract({
    account,
    address: CICLO_ADDRESS,
    abi: CICLO_ABI,
    functionName: "join",
    args: [BigInt(id)],
    ...feeOpts(currency),
  } as any);
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/** Pagar aporte = approve (al registro) + contribute. */
export async function contribute(id: number, currency: CurrencyKey, amount: number): Promise<`0x${string}`> {
  if (USING_MOCK) {
    store.mockContribute(id, MOCK_ME);
    return MOCK_HASH;
  }
  const cfg = CURRENCIES[currency];
  const client = walletClient();
  await ensureChain(client);
  const [account] = await client.getAddresses();
  const value = parseUnits(String(amount), cfg.decimals);

  const allowance = (await publicClient.readContract({
    address: cfg.address,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [account, CICLO_ADDRESS],
  })) as bigint;

  if (allowance < value) {
    const approveHash = await client.writeContract({
      account,
      address: cfg.address,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CICLO_ADDRESS, value],
      ...feeOpts(currency),
    } as any);
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
  }

  const hash = await client.writeContract({
    account,
    address: CICLO_ADDRESS,
    abi: CICLO_ABI,
    functionName: "contribute",
    args: [BigInt(id)],
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
  const client = walletClient();
  await ensureChain(client);
  const [account] = await client.getAddresses();
  const hash = await client.writeContract({
    account,
    address: CICLO_ADDRESS,
    abi: CICLO_ABI,
    functionName: "setOrder",
    args: [BigInt(id), order],
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
  const client = walletClient();
  await ensureChain(client);
  const [account] = await client.getAddresses();
  const hash = await client.writeContract({
    account,
    address: CICLO_ADDRESS,
    abi: CICLO_ABI,
    functionName: "start",
    args: [BigInt(id)],
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
  return (await publicClient.readContract({
    address: CICLO_ADDRESS,
    abi: CICLO_ABI,
    functionName: "hasPaid",
    args: [BigInt(id), round, who],
  })) as boolean;
}

export async function claimPot(id: number, currency: CurrencyKey): Promise<`0x${string}`> {
  if (USING_MOCK) {
    store.mockClaim(id);
    return MOCK_HASH;
  }
  const client = walletClient();
  await ensureChain(client);
  const [account] = await client.getAddresses();
  const hash = await client.writeContract({
    account,
    address: CICLO_ADDRESS,
    abi: CICLO_ABI,
    functionName: "claimPot",
    args: [BigInt(id)],
    ...feeOpts(currency),
  } as any);
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/** Cancela el ciclo (solo admin): devuelve los aportes de la ronda en curso. */
export async function cancelCycle(id: number, currency: CurrencyKey): Promise<`0x${string}`> {
  if (USING_MOCK) {
    store.mockCancel(id);
    return MOCK_HASH;
  }
  const client = walletClient();
  await ensureChain(client);
  const [account] = await client.getAddresses();
  const hash = await client.writeContract({
    account,
    address: CICLO_ADDRESS,
    abi: CICLO_ABI,
    functionName: "cancel",
    args: [BigInt(id)],
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
