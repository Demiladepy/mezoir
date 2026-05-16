import { useState } from "react";

const EXPLORER = "https://explorer.test.mezo.org";

const MOCK_VEBTC_ADDRESS =
  import.meta.env.VITE_VEBTC_PROXY_ADDRESS ??
  "0x1C77C4ABD2295c88A8C99647B25345879624ac57";

function shortenAddr(addr: string) {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function Footer() {
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(MOCK_VEBTC_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-500">
      <p className="text-slate-400">
        Mezoir · Mezo Hackathon 2026 · Testnet
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        <a
          href={EXPLORER}
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-400 transition-colors hover:text-orange-300"
        >
          Explorer
        </a>
        <span className="hidden text-white/10 sm:inline" aria-hidden>
          |
        </span>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">MockVeBTC</span>
          <code className="rounded border border-white/10 bg-zinc-900 px-2 py-0.5 font-mono text-[11px] text-slate-300">
            {shortenAddr(MOCK_VEBTC_ADDRESS)}
          </code>
          <button
            type="button"
            onClick={copyAddress}
            className="rounded-md border border-white/10 bg-zinc-900 px-2 py-1 text-xs text-slate-400 transition-colors hover:border-orange-500/40 hover:text-orange-400"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <span className="hidden text-white/10 sm:inline" aria-hidden>
          |
        </span>
        <a
          href="#"
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400/90 transition-colors hover:text-cyan-300"
        >
          GitHub
        </a>
      </div>
    </footer>
  );
}
