// Direcciones y ABIs. El factory se configura con NEXT_PUBLIC_FACTORY_ADDRESS
// en .env.local (lo escribe `npm run deploy`); sin él la app corre en modo demo.
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS ??
  ZERO_ADDRESS) as `0x${string}`;

export const FACTORY_ABI = [
  {
    type: "function",
    name: "createCycle",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "frequency", type: "uint8" },
      { name: "orderMode", type: "uint8" },
      { name: "size", type: "uint8" },
    ],
    outputs: [
      { name: "id", type: "uint256" },
      { name: "addr", type: "address" },
    ],
  },
  {
    type: "function",
    name: "cyclesCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "cycles",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
] as const;

// ABI del contrato individual de cada ciclo.
export const CICLO_ABI = [
  {
    type: "function",
    name: "getInfo",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "admin", type: "address" },
          { name: "name", type: "string" },
          { name: "token", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "frequency", type: "uint8" },
          { name: "orderMode", type: "uint8" },
          { name: "size", type: "uint8" },
          { name: "round", type: "uint8" },
          { name: "roundStart", type: "uint64" },
          { name: "started", type: "bool" },
          { name: "members", type: "address[]" },
          { name: "payoutOrder", type: "uint8[]" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "hasPaid",
    stateMutability: "view",
    inputs: [
      { name: "round_", type: "uint8" },
      { name: "member", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "roundDeadline",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "currentBeneficiary",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "join",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "setOrder",
    stateMutability: "nonpayable",
    inputs: [{ name: "order", type: "uint8[]" }],
    outputs: [],
  },
  {
    type: "function",
    name: "start",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "contribute",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "claimPot",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;
