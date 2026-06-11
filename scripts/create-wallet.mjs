// Crea (una sola vez) la wallet deployer y la guarda en .env.local.
// Uso: npm run wallet
import { readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const ENV = ".env.local";
const KEY_RE = /^DEPLOYER_PRIVATE_KEY=(0x[0-9a-fA-F]{64})\s*$/m;

// Defensa: .gitignore debe cubrir .env*
const gitignore = existsSync(".gitignore") ? readFileSync(".gitignore", "utf8") : "";
if (!/^\.env\*?/m.test(gitignore)) {
  console.warn("⚠ .gitignore no cubre .env* — agrégalo antes de hacer commit.");
}

const env = existsSync(ENV) ? readFileSync(ENV, "utf8") : "";
const existing = env.match(KEY_RE);

if (existing) {
  const account = privateKeyToAccount(existing[1]);
  console.log("Ya existe una wallet deployer en .env.local");
  console.log(`Dirección: ${account.address}`);
  process.exit(0);
}

const pk = generatePrivateKey();
const account = privateKeyToAccount(pk);

const line = `DEPLOYER_PRIVATE_KEY=${pk}\n`;
if (env && !env.endsWith("\n")) appendFileSync(ENV, "\n");
appendFileSync(ENV, line);

console.log("✔ Wallet deployer creada y guardada en .env.local");
console.log(`Dirección: ${account.address}`);
console.log("");
console.log("Siguientes pasos:");
console.log(`1. Fondea esta dirección con CELO de prueba: https://faucet.celo.org/celo-sepolia`);
console.log("2. Corre: npm run deploy");
console.log("");
console.log("⚠ Respalda .env.local: contiene la clave privada (no se vuelve a mostrar).");
console.log("⚠ Este proyecto vive en OneDrive: la clave se sincroniza a la nube.");
console.log("  Aceptable solo porque es una clave de TESTNET. No la uses en mainnet.");
