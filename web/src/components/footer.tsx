"use client";

import { useState } from "react";

const EXPLORER = "https://explorer.test.mezo.org";

/** Demo MockVeBTC on Mezo testnet; override via env for your deployment. */
const MOCK_VEBTC_ADDRESS =
  process.env.NEXT_PUBLIC_VEBTC_PROXY_ADDRESS ??
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
    <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-500 shadow-sm">
      <p className="text-slate-700">
        Mezoir · Built for the Mezo Hackathon 2026 · Testnet
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        <a
          href={EXPLORER}
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-600 transition-colors hover:text-orange-700"
        >
          Mezo testnet explorer
        </a>
        <span className="hidden sm:inline text-slate-300" aria-hidden>
          |
        </span>
        <div className="flex items-center gap-2">
          <span className="text-slate-600">MockVeBTC</span>
          <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-800">
            {shortenAddr(MOCK_VEBTC_ADDRESS)}
          </code>
          <button
            type="button"
            onClick={copyAddress}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-orange-300 hover:text-orange-700"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <span className="hidden sm:inline text-slate-300" aria-hidden>
          |
        </span>
        <a
          href="#"
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-600 transition-colors hover:text-orange-700"
        >
          GitHub
        </a>
      </div>
    </footer>
  );
}
