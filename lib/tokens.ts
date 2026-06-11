// Catalogo de monedas soportadas, con direcciones según la red activa.
// cUSD (Celo Dollar) y COPm (Celo Peso Colombiano). Ambos Mento, 18 decimales.
// El cCOP real solo existe en mainnet; en Celo Sepolia usamos nuestro TestCOPm
// (se despliega con `npm run deploy:copm` y queda en NEXT_PUBLIC_COPM_ADDRESS).
import { NETWORK, EXPLORER } from "./chain";

export type CurrencyKey = "cUSD" | "COPm";

const USDM_MAINNET = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as const;
const USDM_SEPOLIA = "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b" as const;
const USDM = NETWORK === "celo" ? USDM_MAINNET : USDM_SEPOLIA;

const COPM_MAINNET = "0x8A567e2aE79CA692Bd748aB832081C45de4041eA" as const;
const COPM_SEPOLIA = (process.env.NEXT_PUBLIC_COPM_ADDRESS ?? "") as `0x${string}` | "";
const COPM = NETWORK === "celo" ? COPM_MAINNET : COPM_SEPOLIA;

export const CURRENCIES: Record<
  CurrencyKey,
  { key: CurrencyKey; label: string; symbol: string; address: `0x${string}`; decimals: number; feeCurrency: `0x${string}` }
> = {
  cUSD: {
    key: "cUSD",
    label: "Celo Dollar",
    symbol: "cUSD",
    address: USDM,
    decimals: 18,
    feeCurrency: USDM, // permitido (token == adapter)
  },
  COPm: {
    key: "COPm",
    label: "Celo Peso Colombiano",
    symbol: "COPm",
    address: (COPM || "0x0000000000000000000000000000000000000000") as `0x${string}`,
    decimals: 18,
    // Fallback a USDm hasta verificar COPm en FeeCurrencyDirectory.
    feeCurrency: USDM,
  },
};

// COPm solo se ofrece si su dirección existe en la red activa.
export const CURRENCY_LIST = COPM
  ? Object.values(CURRENCIES)
  : [CURRENCIES.cUSD];

/** Devuelve la moneda cuya dirección de token coincide. */
export function currencyByAddress(token: string): CurrencyKey {
  const a = token.toLowerCase();
  return (Object.values(CURRENCIES).find((c) => c.address.toLowerCase() === a)?.key) ?? "cUSD";
}

export const CELOSCAN_TX = (hash: string) => `${EXPLORER}/tx/${hash}`;
export const CELOSCAN_ADDR = (addr: string) => `${EXPLORER}/address/${addr}`;
