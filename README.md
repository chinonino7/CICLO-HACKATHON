# CICLO — ahorro comunitario rotativo en MiniPay

Digitaliza la natillera / tanda / cadena de ahorro (ROSCA). Cada ronda, un miembro
recibe el pozo completo. Vive dentro de MiniPay (Opera Mini) en Celo. Soporta **cUSD** y **cCOP**.

## Stack
- Next.js 14 + Tailwind, mobile-first (MiniPay 360×640), estilo "old money"
- viem + fee abstraction (network fee en stablecoin, sin CELO)
- Tipografía: Playfair Display (serif) + Inter (sans)
- Contrato `contracts/Ciclo.sol` (registro único de ciclos)

## Correr en local
```bash
npm install
npm run dev          # http://localhost:3000
npx ngrok http 3000  # para probar en MiniPay (dispositivo físico Android/iOS)
```
> Sin contrato desplegado, usa datos demo (`lib/mock.ts`) para recorrer todo el diseño.

## Vistas
- `/` — Onboarding (conectar con MiniPay)
- `/dashboard` — saldo + toggle cUSD/cCOP + mis ciclos
- `/create` — crear ciclo (moneda, monto, frecuencia, orden, máx. 12)
- `/cycle/[id]` — sala: pozo, miembros (Pagado/Pendiente), botón Pagar/Retirar

## Reglas del contrato
- Máximo **12** miembros por ciclo.
- Moneda fija por ciclo (cUSD o cCOP), elegida por el creador.
- Frecuencia: **Semanal** o **Mensual**.
- Orden de turnos: **sorteo on-chain** o **definido por el admin**.

## Conectar el contrato real (paso siguiente)
1. Desplegar `contracts/Ciclo.sol` a Celo Mainnet.
2. Verificar en Celoscan, poner la dirección en `lib/contract-ciclo.ts` → `CICLO_ADDRESS`.
3. Verificar si **COPm** (cCOP) está en `FeeCurrencyDirectory`
   (`0x15F344b9E6c3Cb6F0376A36A64928b13F62C6276`); si sí, cambiar el `feeCurrency`
   de cCOP de USDm → COPm en `lib/tokens.ts`.

## Notas
- Moneda cCOP = COPm `0x8A567e2aE79CA692Bd748aB832081C45de4041eA` (18 dec).
- Aleatoriedad del sorteo usa `block.prevrandao`: OK para demo, no para producción.
