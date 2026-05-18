import { lazy, Suspense } from "react";

import { Dashboard } from "@/components/dashboard";
import { Header } from "@/components/header";
import { Reveal } from "@/components/motion";
import { Web3Provider } from "@/components/providers/web3-provider";

const WalletHome = lazy(() =>
  import("@/components/wallet-home").then((m) => ({ default: m.WalletHome })),
);

export default function App() {
  return (
    <Web3Provider>
      <div className="mezoir-page-bg relative min-h-screen overflow-x-hidden font-sans text-[#0a2540]">
        <div
          aria-hidden
          className="mezoir-glow-orb pointer-events-none fixed -left-32 top-24 h-72 w-72 rounded-full bg-[#f4007a]/10 blur-3xl"
        />
        <div
          aria-hidden
          className="mezoir-glow-orb pointer-events-none fixed -right-24 top-1/3 h-80 w-80 rounded-full bg-blue-400/10 blur-3xl"
          style={{ animationDelay: "-4s" }}
        />

        <Header />

        <main className="relative mx-auto w-full max-w-6xl space-y-10 px-4 pb-20 pt-10 lg:space-y-14 lg:px-8 lg:pt-12">
          <Reveal delay={80}>
            <Dashboard />
          </Reveal>
          <Suspense
            fallback={
              <Reveal delay={120}>
                <div className="mezoir-card py-16 text-center text-sm text-[#697386]">
                  Loading wallet…
                </div>
              </Reveal>
            }
          >
            <WalletHome />
          </Suspense>
        </main>
      </div>
    </Web3Provider>
  );
}

