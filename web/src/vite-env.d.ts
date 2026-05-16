/// <reference types="vite/client" />

declare global {
  interface Window {
    Buffer: typeof import("buffer").Buffer;
    process: typeof import("process").default;
  }
}

interface ImportMetaEnv {
  readonly VITE_AGENT_URL?: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string;
  readonly VITE_VEBTC_PROXY_ADDRESS?: string;
  readonly VITE_GITHUB_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
