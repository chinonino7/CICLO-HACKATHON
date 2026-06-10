import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseUnits,
  formatUnits,
} from "viem";
import { celo } from "viem/chains";
import { CICLO_ABI, CICLO_ADDRESS, ERC20_ABI } from "./contract-ciclo";
import { CURRENCIES, currencyByAddress, type CurrencyKey } from "./tokens";

export const MAX_MEMBERS = 12;

export type Cycle = {
  id: number;
  admin: `0x${string}`;
  name: string;
  currency: CurrencyKey;
  token: `0x${string}`;
  amount: number; // por turno
  frequency: number; // 0 Semanal, 1 Mensual
  orderMode: number; // 0 Admin, 1 Sorteo
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

export const publicClient = createPublicClient({ chain: celo, transport: http() });

function walletClient() {
  return createWalletClient({ chain: celo, transport: custom((window as any).ethereum) });
}

function decode(id: number, g: any, members: `0x${string}`[], order: number[]): Cycle {
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
    round: Number(g.round),
    roundStart: Number(g.roundStart),
    started: g.started,
    members,
    payoutOrder: order.map(Number),
  };
}

export async function getCycles(): Promise<Cycle[]> {
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
  const [g, members, order] = await Promise.all([
    publicClient.readContract({ address: CICLO_ADDRESS, abi: CICLO_ABI, functionName: "getGroup", args: [BigInt(id)] }),
    publicClient.readContract({ address: CICLO_ADDRESS, abi: CICLO_ABI, functionName: "getMembers", args: [BigInt(id)] }),
    publicClient.readContract({ address: CICLO_ADDRESS, abi: CICLO_ABI, functionName: "getPayoutOrder", args: [BigInt(id)] }),
  ]);
  return decode(id, g, members as `0x${string}`[], (order as readonly number[]).map(Number));
}

export async function getCycleDetail(id: number): Promise<CycleDetail> {
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
    c.started && c.round < c.members.length ? c.members[c.payoutOrder[c.round]] : null;
  return { ...c, beneficiary, paidThisRound };
}

// ---- Escrituras (todas con fee abstraction en la moneda del grupo) ----

export async function createCycle(
  name: string,
  currency: CurrencyKey,
  amountPerTurn: string,
  frequency: number,
  orderMode: number
): Promise<`0x${string}`> {
  const cfg = CURRENCIES[currency];
  const client = walletClient();
  const [account] = await client.getAddresses();
  return client.writeContract({
    account,
    address: CICLO_ADDRESS,
    abi: CICLO_ABI,
    functionName: "createGroup",
    args: [name, cfg.address, parseUnits(amountPerTurn, cfg.decimals), frequency, orderMode],
    feeCurrency: cfg.feeCurrency,
  } as any);
}

export async function joinCycle(id: number, currency: CurrencyKey): Promise<`0x${string}`> {
  const client = walletClient();
  const [account] = await client.getAddresses();
  return client.writeContract({
    account,
    address: CICLO_ADDRESS,
    abi: CICLO_ABI,
    functionName: "join",
    args: [BigInt(id)],
    feeCurrency: CURRENCIES[currency].feeCurrency,
  } as any);
}

/** Pagar aporte = approve + contribute. */
export async function contribute(id: number, currency: CurrencyKey, amount: number): Promise<`0x${string}`> {
  const cfg = CURRENCIES[currency];
  const client = walletClient();
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
      feeCurrency: cfg.feeCurrency,
    } as any);
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
  }

  const hash = await client.writeContract({
    account,
    address: CICLO_ADDRESS,
    abi: CICLO_ABI,
    functionName: "contribute",
    args: [BigInt(id)],
    feeCurrency: cfg.feeCurrency,
  } as any);
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function setOrder(
  id: number,
  order: number[],
  currency: CurrencyKey
): Promise<`0x${string}`> {
  const client = walletClient();
  const [account] = await client.getAddresses();
  const hash = await client.writeContract({
    account,
    address: CICLO_ADDRESS,
    abi: CICLO_ABI,
    functionName: "setOrder",
    args: [BigInt(id), order],
    feeCurrency: CURRENCIES[currency].feeCurrency,
  } as any);
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function startCycle(id: number, currency: CurrencyKey): Promise<`0x${string}`> {
  const client = walletClient();
  const [account] = await client.getAddresses();
  const hash = await client.writeContract({
    account,
    address: CICLO_ADDRESS,
    abi: CICLO_ABI,
    functionName: "start",
    args: [BigInt(id)],
    feeCurrency: CURRENCIES[currency].feeCurrency,
  } as any);
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function hasPaidRound(
  id: number,
  round: number,
  who: `0x${string}`
): Promise<boolean> {
  return (await publicClient.readContract({
    address: CICLO_ADDRESS,
    abi: CICLO_ABI,
    functionName: "hasPaid",
    args: [BigInt(id), round, who],
  })) as boolean;
}

export async function claimPot(id: number, currency: CurrencyKey): Promise<`0x${string}`> {
  const client = walletClient();
  const [account] = await client.getAddresses();
  const hash = await client.writeContract({
    account,
    address: CICLO_ADDRESS,
    abi: CICLO_ABI,
    functionName: "claimPot",
    args: [BigInt(id)],
    feeCurrency: CURRENCIES[currency].feeCurrency,
  } as any);
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/** Saldo del usuario en una moneda. */
export async function getBalance(address: `0x${string}`, currency: CurrencyKey): Promise<number> {
  const cfg = CURRENCIES[currency];
  const raw = (await publicClient.readContract({
    address: cfg.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address],
  })) as bigint;
  return Number(formatUnits(raw, cfg.decimals));
}
