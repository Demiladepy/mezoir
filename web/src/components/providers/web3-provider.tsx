import "@rainbow-me/rainbowkit/styles.css";

import { getConfig, mezoTestnet } from "@mezo-org/passport";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useMemo, useState } from "react";
import type { Config } from "wagmi";
import { WagmiProvider } from "wagmi";

type Web3ProviderProps = {
  children: ReactNode;
};

function isPlaceholderWalletConnectId(id: string | undefined): boolean {
  if (!id) return true;
  const t = id.trim();
  return t.length === 0 || t === "replace-me";
}

export function Web3Provider({ children }: Web3ProviderProps) {
  const [queryClient] = useState(() => new QueryClient());

  const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim() ?? "";
  const projectIdInvalid = isPlaceholderWalletConnectId(projectId);

  const configResult = useMemo((): { ok: true; config: Config } | { ok: false; message: string } => {
    if (projectIdInvalid) {
      return {
        ok: false,
        message:
          "Missing or placeholder WalletConnect project id. Set VITE_WALLETCONNECT_PROJECT_ID in web/.env (create from .env.example). Get a free id at https://cloud.reown.com",
      };
    }
    try {
      const config = getConfig({
        appName: import.meta.env.VITE_APP_NAME ?? "Mezoir",
        walletConnectProjectId: projectId,
        mezoNetwork: "testnet",
        ssr: false,
      });
      return { ok: true, config };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : String(e),
      };
    }
  }, [projectId, projectIdInvalid]);

  if (!configResult.ok) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm">
        <h2 className="text-lg font-semibold">Wallet / Passport setup</h2>
        <p className="mt-2 text-sm leading-relaxed">{configResult.message}</p>
        <p className="mt-4 text-xs text-amber-900/80">
          The rest of the page (dashboard, etc.) can work once the agent URL is
          set; connect UI needs a valid Reown (WalletConnect) project id.
        </p>
      </div>
    );
  }

  return (
    <WagmiProvider config={configResult.config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider initialChain={mezoTestnet}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
