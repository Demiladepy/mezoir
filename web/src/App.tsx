import { lazy, Suspense } from "react";

import { Dashboard } from "@/components/dashboard";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Reveal } from "@/components/motion";
import { Web3Provider } from "@/components/providers/web3-provider";

const WalletHome = lazy(() =>
  import("@/components/wallet-home").then((m) => ({ default: m.WalletHome })),
);

export default function App() {
  return (
    <Web3Provider>
      <div className="relative min-h-screen overflow-x-hidden bg-[#F9F6F0] font-sans text-black">
        <Header />

        <main className="relative mx-auto w-full max-w-7xl space-y-10 px-6 pb-16 pt-8 lg:space-y-14 lg:px-12 lg:pt-10">
          <Reveal delay={60}>
            <Dashboard />
          </Reveal>
          <Suspense
            fallback={
              <div className="mezo-card py-16 text-center text-sm text-[#737373]">
                Loading…
              </div>
            }
          >
            <WalletHome />
          </Suspense>
        </main>

        <Footer />
      </div>
    </Web3Provider>
  );
}
