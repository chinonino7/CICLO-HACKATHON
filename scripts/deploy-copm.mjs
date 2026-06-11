// Despliega el token COPm de PRUEBA en Celo Sepolia y lo registra en .env.local.
// Uso: npm run deploy:copm [direccion-a-fondear]
//      Si pasas una dirección, le emite 1.000.000 COPm de prueba.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import solc from "solc";
import { createPublicClient, createWalletClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoSepolia } from "viem/chains";

const ENV = ".env.local";

const input = {
  language: "Solidity",
  sources: {
    "TestCOPm.sol": { content: readFileSync("contracts/TestCOPm.sol", "utf8") },
  },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};

const out = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (out.errors ?? []).filter((e) => e.severity === "error");
for (const e of out.errors ?? []) console.log(e.formattedMessage);
if (errors.length) process.exit(1);

const token = out.contracts["TestCOPm.sol"].TestCOPm;
console.log("✔ TestCOPm compilado");

const env = existsSync(ENV) ? readFileSync(ENV, "utf8") : "";
const keyMatch = env.match(/^DEPLOYER_PRIVATE_KEY=(0x[0-9a-fA-F]{64})\s*$/m);
if (!keyMatch) {
  console.error("✖ No hay DEPLOYER_PRIVATE_KEY en .env.local. Ejecuta primero: npm run wallet");
  process.exit(1);
}

const account = privateKeyToAccount(keyMatch[1]);
const publicClient = createPublicClient({ chain: celoSepolia, transport: http() });
const walletClient = createWalletClient({ chain: celoSepolia, transport: http(), account });

// Reutilizar el token ya desplegado si existe; solo se despliega la primera vez.
const addrMatch = env.match(/^NEXT_PUBLIC_COPM_ADDRESS=(0x[0-9a-fA-F]{40})\s*$/m);
let addr;
if (addrMatch) {
  addr = addrMatch[1];
  console.log(`COPm de prueba ya desplegado: ${addr} (reutilizando)`);
} else {
  console.log("Desplegando TestCOPm en Celo Sepolia…");
  const hash = await walletClient.deployContract({
    abi: token.abi,
    bytecode: `0x${token.evm.bytecode.object}`,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  addr = receipt.contractAddress;
  console.log(`✔ COPm de prueba desplegado: ${addr}`);
  console.log(`  Contrato: https://sepolia.celoscan.io/address/${addr}`);
}

// Fondear una dirección si se pasó como argumento
const fundTo = process.argv.find((a) => /^0x[0-9a-fA-F]{40}$/.test(a));
if (fundTo) {
  const mintHash = await walletClient.writeContract({
    address: addr,
    abi: token.abi,
    functionName: "mint",
    args: [fundTo, parseUnits("1000000", 18)],
  });
  await publicClient.waitForTransactionReceipt({ hash: mintHash });
  console.log(`✔ 1.000.000 COPm de prueba emitidos a ${fundTo}`);
}

function setVar(content, key, value) {
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(content)) return content.replace(re, `${key}=${value}`);
  return content + (content.endsWith("\n") || content === "" ? "" : "\n") + `${key}=${value}\n`;
}

writeFileSync(ENV, setVar(env, "NEXT_PUBLIC_COPM_ADDRESS", addr));
console.log("✔ .env.local actualizado (NEXT_PUBLIC_COPM_ADDRESS). Rebuild para aplicar.");
console.log("Tip: cualquier wallet puede emitirse saldo llamando faucet() en el contrato,");
console.log(`o corre: npm run deploy:copm -- <direccion>  (emite a esa dirección).`);
