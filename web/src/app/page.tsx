"use client";

import dynamic from "next/dynamic";
import { Dashboard } from "@/components/dashboard";

const WalletHome = dynamic(
  () => import("@/components/wallet-home").then((mod) => mod.WalletHome),
  { ssr: false },
);

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="mx-auto w-full max-w-5xl px-4 pt-8 sm:px-6 lg:px-8">
        <Dashboard />
      </div>
      <WalletHome />
    </div>
  );
}
