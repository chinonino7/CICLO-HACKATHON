// Compila los contratos con solc y despliega CicloFactory en Celo Sepolia testnet.
// Uso: npm run compile  (solo compila)
//      npm run deploy   (compila + despliega + actualiza .env.local)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import solc from "solc";
import { createPublicClient, createWalletClient, http, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoSepolia } from "viem/chains";

const ENV = ".env.local";
const COMPILE_ONLY = process.argv.includes("--compile-only");

// ---- Compilar ----
const input = {
  language: "Solidity",
  sources: {
    "Ciclo.sol": { content: readFileSync("contracts/Ciclo.sol", "utf8") },
    "CicloFactory.sol": { content: readFileSync("contracts/CicloFactory.sol", "utf8") },
  },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};

const out = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (out.errors ?? []).filter((e) => e.severity === "error");
for (const e of out.errors ?? []) console.log(e.formattedMessage);
if (errors.length) {
  console.error(`✖ Compilación falló con ${errors.length} error(es).`);
  process.exit(1);
}

const factory = out.contracts["CicloFactory.sol"].CicloFactory;
const ciclo = out.contracts["Ciclo.sol"].Ciclo;
console.log("✔ Contratos compilados sin errores");
console.log(`  CicloFactory: ${factory.evm.bytecode.object.length / 2} bytes`);
console.log(`  Ciclo:        ${ciclo.evm.bytecode.object.length / 2} bytes`);

if (COMPILE_ONLY) process.exit(0);

// ---- Desplegar ----
const env = existsSync(ENV) ? readFileSync(ENV, "utf8") : "";
const keyMatch = env.match(/^DEPLOYER_PRIVATE_KEY=(0x[0-9a-fA-F]{64})\s*$/m);
if (!keyMatch) {
  console.error("✖ No hay DEPLOYER_PRIVATE_KEY en .env.local. Ejecuta primero: npm run wallet");
  process.exit(1);
}

const account = privateKeyToAccount(keyMatch[1]);
const publicClient = createPublicClient({ chain: celoSepolia, transport: http() });
const walletClient = createWalletClient({ chain: celoSepolia, transport: http(), account });

const balance = await publicClient.getBalance({ address: account.address });
console.log(`Deployer: ${account.address} · saldo: ${formatEther(balance)} CELO (Celo Sepolia)`);
if (balance === 0n) {
  console.error("✖ Sin fondos para gas. Pide CELO de prueba en https://faucet.celo.org/celo-sepolia");
  console.error(`  para la dirección ${account.address} y vuelve a correr npm run deploy.`);
  process.exit(1);
}

console.log("Desplegando CicloFactory en Celo Sepolia…");
const hash = await walletClient.deployContract({
  abi: factory.abi,
  bytecode: `0x${factory.evm.bytecode.object}`,
});
const receipt = await publicClient.waitForTransactionReceipt({ hash });
const addr = receipt.contractAddress;
console.log(`✔ CicloFactory desplegado: ${addr}`);
console.log(`  Tx: https://sepolia.celoscan.io/tx/${hash}`);
console.log(`  Contrato: https://sepolia.celoscan.io/address/${addr}`);

// ---- Actualizar .env.local ----
function setVar(content, key, value) {
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(content)) return content.replace(re, `${key}=${value}`);
  return content + (content.endsWith("\n") || content === "" ? "" : "\n") + `${key}=${value}\n`;
}

let next = env;
next = setVar(next, "NEXT_PUBLIC_FACTORY_ADDRESS", addr);
next = setVar(next, "NEXT_PUBLIC_NETWORK", "sepolia");
writeFileSync(ENV, next);
console.log("✔ .env.local actualizado (NEXT_PUBLIC_FACTORY_ADDRESS, NEXT_PUBLIC_NETWORK).");
console.log("  Reinicia el servidor (npm run build / npm run dev) para aplicar.");
