import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";

import { Logo } from "@/components/logo";

export function Header() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="border-b border-[#e3e8ee] bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <Logo size="md" />
          <p className="hidden text-sm text-[#697386] sm:block">
            Agent for the ve-economy
          </p>
        </div>
        <div className="shrink-0">
          {mounted ? (
            <ConnectButton label="Connect Wallet" />
          ) : (
            <button
              type="button"
              className="rounded-lg border border-[#e3e8ee] bg-white px-4 py-2 text-sm text-[#697386] shadow-sm"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
      <div
        className="h-px w-full bg-gradient-to-r from-transparent via-[#f7931a]/30 to-transparent"
        aria-hidden
      />
    </header>
  );
}
