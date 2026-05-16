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
    <footer className="border-t border-[#e3e8ee] py-8 text-center text-sm text-[#697386]">
      <p className="text-[#425466]">Mezoir · Mezo Hackathon 2026 · Testnet</p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        <a
          href={EXPLORER}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#f7931a] transition-colors hover:text-[#e08813]"
        >
          Explorer
        </a>
        <span className="hidden text-[#e3e8ee] sm:inline" aria-hidden>
          |
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[#697386]">MockVeBTC</span>
          <code className="rounded border border-[#e3e8ee] bg-white px-2 py-0.5 font-mono text-[11px] text-[#0a2540]">
            {shortenAddr(MOCK_VEBTC_ADDRESS)}
          </code>
          <button
            type="button"
            onClick={copyAddress}
            className="rounded-md border border-[#e3e8ee] bg-white px-2 py-1 text-xs text-[#425466] transition-colors hover:border-[#f7931a]/40 hover:text-[#f7931a]"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <span className="hidden text-[#e3e8ee] sm:inline" aria-hidden>
          |
        </span>
        <a
          href="#"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#425466] transition-colors hover:text-[#0a2540]"
        >
          GitHub
        </a>
      </div>
    </footer>
  );
}
