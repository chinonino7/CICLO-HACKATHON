// Catalogo de monedas soportadas (Celo Mainnet).
// cUSD = USDm, cCOP = COPm. Ambos Mento, 18 decimales.
export type CurrencyKey = "cUSD" | "cCOP";

const USDM = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as const;

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
  cCOP: {
    key: "cCOP",
    label: "Celo Peso Colombiano",
    symbol: "cCOP",
    address: "0x8A567e2aE79CA692Bd748aB832081C45de4041eA",
    decimals: 18,
    // Fallback a USDm hasta verificar COPm en FeeCurrencyDirectory.
    feeCurrency: USDM,
  },
};

export const CURRENCY_LIST = Object.values(CURRENCIES);

/** Devuelve la moneda cuya dirección de token coincide. */
export function currencyByAddress(token: string): CurrencyKey {
  const a = token.toLowerCase();
  return (Object.values(CURRENCIES).find((c) => c.address.toLowerCase() === a)?.key) ?? "cUSD";
}

export const CELOSCAN_TX = (hash: string) => `https://celoscan.io/tx/${hash}`;
export const CELOSCAN_ADDR = (addr: string) => `https://celoscan.io/address/${addr}`;
