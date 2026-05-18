import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";

import { Logo } from "@/components/logo";
import { Reveal } from "@/components/motion";

export function Header() {
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 bg-[#F9F6F0]/90 backdrop-blur-md transition-shadow duration-200 ${
        scrolled ? "shadow-sm" : ""
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-6 lg:px-12">
        <Reveal className="flex min-w-0 items-center gap-4" delay={0}>
          <a href="/" className="group shrink-0" aria-label="Mezoir home">
            <Logo size="md" />
          </a>
          <p className="hidden font-mono text-sm text-[#737373] lg:inline">
            agent for the ve-economy
          </p>
        </Reveal>

        <Reveal className="shrink-0" delay={120}>
          <div className="overflow-hidden rounded-full">
            {mounted ? (
              <ConnectButton label="Connect Wallet" />
            ) : (
              <button
                type="button"
                className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </Reveal>
      </div>
    </header>
  );
}
