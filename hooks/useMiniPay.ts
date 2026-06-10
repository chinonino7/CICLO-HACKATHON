"use client";

import { useEffect, useState } from "react";
import { createWalletClient, custom } from "viem";
import { celo } from "viem/chains";

export function useMiniPay() {
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [isMiniPay, setIsMiniPay] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const eth = (window as any).ethereum;
      if (typeof window === "undefined" || !eth) {
        setIsLoading(false);
        return;
      }
      const mp = eth.isMiniPay === true;
      setIsMiniPay(mp);

      try {
        const client = createWalletClient({ chain: celo, transport: custom(eth) });
        // Dentro de MiniPay no hace falta boton: auto-connect.
        const [addr] = await client.getAddresses();
        if (addr) setAddress(addr);
        else if (!mp) {
          const [req] = await client.requestAddresses();
          setAddress(req);
        }
      } catch {
        /* sin wallet disponible */
      }
      setIsLoading(false);
    }
    init();
  }, []);

  return { address, isMiniPay, isLoading };
}
