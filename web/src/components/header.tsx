import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";

import { Logo } from "@/components/logo";

export function Header() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="relative border-b border-white/10 bg-zinc-950/90 backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-32 w-64 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute -right-16 top-0 h-28 w-56 rounded-full bg-cyan-500/15 blur-3xl" />
      </div>
      <div className="relative mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Logo size="md" />
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 sm:block">
            Agent for the ve-economy
          </span>
        </div>
        <div className="shrink-0">
          {mounted ? (
            <ConnectButton label="Connect Wallet" />
          ) : (
            <button
              type="button"
              className="rounded-lg border border-white/10 bg-zinc-900 px-4 py-2 text-sm text-slate-400"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
