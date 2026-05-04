"use client";

import dynamic from "next/dynamic";

const WalletHome = dynamic(
  () => import("@/components/wallet-home").then((mod) => mod.WalletHome),
  { ssr: false },
);

export default function Home() {
  return <WalletHome />;
}
