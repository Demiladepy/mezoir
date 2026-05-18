import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";

import { Logo } from "@/components/logo";
import { Reveal } from "@/components/motion";

export function Header() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-[#e3e8ee]/80 bg-white/75 shadow-[0_1px_0_rgba(10,37,64,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-5 lg:px-8 lg:py-6">
        <Reveal className="flex min-w-0 items-center gap-5" delay={0}>
          <a
            href="/"
            className="shrink-0 transition-transform duration-300 hover:scale-[1.02]"
            aria-label="Mezoir home"
          >
            <Logo size="md" />
          </a>
          <div className="hidden min-w-0 sm:block">
            <p className="mezoir-enter mezoir-enter-delay-2 text-sm font-medium text-[#0a2540]">
              Agent for the ve-economy
            </p>
            <p className="mezoir-enter mezoir-enter-delay-3 mt-0.5 text-xs text-[#697386]">
              Locks · votes · plain-English reasoning
            </p>
          </div>
        </Reveal>

        <Reveal className="shrink-0" delay={160}>
          {mounted ? (
            <ConnectButton label="Connect Wallet" />
          ) : (
            <button
              type="button"
              className="rounded-xl border border-[#e3e8ee] bg-white px-5 py-2.5 text-sm font-medium text-[#697386] shadow-sm"
            >
              Connect Wallet
            </button>
          )}
        </Reveal>
      </div>
      <div
        className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#f4007a]/35 to-transparent"
        aria-hidden
      />
    </header>
  );
}

