// Red activa: sepolia (Celo Sepolia testnet, default) o celo (mainnet).
// Se configura con NEXT_PUBLIC_NETWORK en .env.local (rebuild para aplicar).
// Nota: Alfajores fue descontinuada en sept 2025; el testnet actual es Celo Sepolia.
import { celo, celoSepolia } from "viem/chains";

export const NETWORK = (process.env.NEXT_PUBLIC_NETWORK ?? "sepolia").trim() as "sepolia" | "celo";
export const CHAIN = NETWORK === "celo" ? celo : celoSepolia;
export const EXPLORER = NETWORK === "celo" ? "https://celoscan.io" : "https://sepolia.celoscan.io";
