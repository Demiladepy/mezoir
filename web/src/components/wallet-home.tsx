"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import { LockBtcButton } from "@/components/lock-btc-button";
import { Web3Provider } from "@/components/providers/web3-provider";

export function WalletHome() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Web3Provider>
      <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 dark:bg-black">
        <main className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Mezoir
          </h1>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Connect your wallet to Matsnet.
          </p>
          <div className="mt-8 flex justify-center">
            {mounted ? (
              <ConnectButton label="Connect Wallet" />
            ) : (
              <button className="rounded-md border border-zinc-300 px-4 py-2 text-sm">
                Connect Wallet
              </button>
            )}
          </div>
          <div className="mt-6 flex justify-center">
            <LockBtcButton />
          </div>
        </main>
      </div>
    </Web3Provider>
  );
}
