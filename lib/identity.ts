import { shortAddr } from "./format";

// Identidad amable (regla MiniPay: no mostrar 0x… como identificador principal).
// MVP: alias local por dispositivo (localStorage). En producción: SocialConnect/teléfono.

const key = (addr: string) => `ciclo-alias-${addr.toLowerCase()}`;

export function getAlias(addr: string): string | null {
  try {
    return localStorage.getItem(key(addr));
  } catch {
    return null;
  }
}

export function setAlias(addr: string, name: string) {
  try {
    localStorage.setItem(key(addr), name.trim());
  } catch {}
}

export function displayName(addr: string): string {
  return getAlias(addr) ?? shortAddr(addr);
}

export function initials(name: string): string {
  const clean = name.replace(/^0x/, "").trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

// Nombres demo para que el mock se vea humano (no se aplican a usuarios reales).
const DEMO = ["Lucía", "Andrés", "María", "Camilo", "Sofía", "Julián", "Valentina", "Diego"];
export function seedDemoAliases(addresses: string[], skip: string) {
  addresses.forEach((a, i) => {
    if (a.toLowerCase() === skip.toLowerCase()) return;
    if (!getAlias(a)) setAlias(a, DEMO[i % DEMO.length]);
  });
}
