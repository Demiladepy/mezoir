import { lazy, Suspense } from "react";

import { Dashboard } from "@/components/dashboard";
import { Header } from "@/components/header";
import { Web3Provider } from "@/components/providers/web3-provider";

const WalletHome = lazy(() =>
  import("@/components/wallet-home").then((m) => ({ default: m.WalletHome })),
);

export default function App() {
  return (
    <Web3Provider>
      <div className="min-h-screen bg-zinc-950 font-sans text-slate-100">
        <Header />
        <main className="mx-auto w-full max-w-5xl space-y-8 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          <Dashboard />
          <Suspense
            fallback={
              <div className="rounded-xl border border-white/10 bg-zinc-900/60 py-12 text-center text-sm text-slate-500">
                Loading wallet…
              </div>
            }
          >
            <WalletHome />
          </Suspense>
        </main>
      </div>
    </Web3Provider>
  );
}
