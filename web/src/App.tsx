import { lazy, Suspense } from "react";

import { Dashboard } from "@/components/dashboard";

/** Same pattern as Next `dynamic(..., { ssr: false })`: wallet stack loads in its own chunk. */
const WalletHome = lazy(() =>
  import("@/components/wallet-home").then((m) => ({ default: m.WalletHome })),
);

export default function App() {
  return (
    <div className="space-y-6">
      <div className="mx-auto w-full max-w-5xl px-4 pt-8 sm:px-6 lg:px-8">
        <Dashboard />
      </div>
      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-5xl px-4 py-8 text-center text-sm text-slate-500">
            Loading wallet…
          </div>
        }
      >
        <WalletHome />
      </Suspense>
    </div>
  );
}
