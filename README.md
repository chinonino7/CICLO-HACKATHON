# CICLO — ahorro comunitario rotativo en MiniPay

Digitaliza el ahorro rotativo comunitario (ROSCA / cadena / natillera). Cada ronda,
un miembro recibe el pozo completo en la fecha de corte. Vive dentro de MiniPay en
Celo. Soporta **cUSD** y **cCOP (COPm)**.

## Stack
- Next.js 14 + Tailwind, mobile-first (MiniPay 360×640), estilo "old money"
- viem + fee abstraction (network fee en stablecoin dentro de MiniPay)
- Tipografía: Poppins (display) + Inter (sans)
- **Un contrato inteligente por ciclo**: `contracts/CicloFactory.sol` despliega un
  `contracts/Ciclo.sol` propio por cada ciclo creado; ese contrato custodia los
  aportes y los distribuye por turnos.

## Correr en local
```bash
npm install
npm run dev          # http://localhost:3000
npx ngrok http 3000  # para probar en MiniPay (dispositivo físico)
```
> Sin factory desplegado (`NEXT_PUBLIC_FACTORY_ADDRESS` vacío), corre en modo demo
> con datos locales (`lib/mockstore.ts`) para recorrer todo el diseño.

## Desplegar contratos (Celo Sepolia testnet)
```bash
npm run wallet       # genera la wallet deployer en .env.local (una sola vez)
# fondéala en https://faucet.celo.org/celo-sepolia
npm run compile      # valida los contratos con solc
npm run deploy       # despliega CicloFactory y configura .env.local
npm run deploy:copm  # despliega COPm de prueba (el cCOP real solo existe en mainnet)
npm run build        # rebuild para aplicar las variables NEXT_PUBLIC_*
```
La red se controla con `NEXT_PUBLIC_NETWORK` (`sepolia` | `celo`) en `.env.local`.

## Vistas
- `/` — landing: cómo funciona, FAQ, conectar con MiniPay
- `/dashboard` — saldo + toggle cUSD/COPm + mis ciclos
- `/create` — crear ciclo (moneda, monto, frecuencia, orden, máx. 12 cupos)
- `/cycle/[id]` — sala: rueda de rotación, miembros, pagar aporte / retirar pozo
- `/join` y `/cycle/[id]/join` — unirse por link o código

## Reglas del ciclo
- Máximo **12** miembros; moneda fija por ciclo (cUSD o COPm).
- Frecuencia **Quincenal** (paga los días 15 y fin de mes) o **Mensual** (fin de mes).
  Las fechas son de calendario, no periodos corridos.
- El pozo solo se libera en la fecha de corte y con la ronda completamente fondeada;
  cualquier miembro puede disparar el pago (siempre va al beneficiario).
- Orden de turnos: **sorteo on-chain** o **definido por el admin**.

## Notas
- En mainnet, cCOP = COPm `0x8A567e2aE79CA692Bd748aB832081C45de4041eA` (18 dec).
- Aleatoriedad del sorteo usa `block.prevrandao`: OK para demo/testnet, no para
  producción con dinero real.
- Proyecto en fase experimental. Usa montos pequeños.
