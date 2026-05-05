"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import { Footer } from "@/components/footer";
import { IntentPicker } from "@/components/intent-picker";
import { LiveActivity } from "@/components/live-activity";
import { Web3Provider } from "@/components/providers/web3-provider";

export function WalletHome() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Web3Provider>
      <div className="flex min-h-full flex-1 flex-col bg-slate-50">
        <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
          <header className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Mezoir
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-700 sm:text-xl">
              An intent-based agent for Mezo&apos;s ve-economy. Tell it your goal
              — it picks the venue and acts.
            </p>
            <div className="mt-5 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
                <span
                  className="h-2 w-2 rounded-full bg-emerald-500"
                  aria-hidden
                />
                Mezo Testnet
              </span>
            </div>
          </header>

          <div className="mt-10 flex justify-center">
            {mounted ? (
              <ConnectButton label="Connect Wallet" />
            ) : (
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm"
              >
                Connect Wallet
              </button>
            )}
          </div>

          <div className="mt-10">
            <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex justify-center">
                <IntentPicker />
              </div>
            </div>
          </div>

          <LiveActivity />
        </div>

        <Footer />
      </div>
    </Web3Provider>
  );
}
