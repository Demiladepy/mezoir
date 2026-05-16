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
      <div className="min-h-screen bg-[#fafbff] font-sans text-[#0a2540]">
        <Header />
        <main className="mx-auto w-full max-w-6xl space-y-8 px-4 pb-16 pt-8 lg:space-y-12 lg:px-8">
          <Dashboard />
          <Suspense
            fallback={
              <div className="rounded-2xl border border-[#e3e8ee] bg-white py-12 text-center text-sm text-[#697386] shadow-sm">
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
