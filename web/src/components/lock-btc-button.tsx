import { useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";

import { AGENT_URL } from "@/lib/agent-url";

interface LockResult {
  tx_hash: string;
  token_id: number | null;
  block_number: number;
  explorer_url: string;
}

interface LockInfo {
  token_id: number;
  owner: string | null;
  amount_wei: string | null;
  amount_btc: number | null;
  unlock_time: number | null;
  voting_power_wei: string | null;
}

export function LockBtcButton() {
  const { chain } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  const isWrongChain = chain && chain.id !== 31611;

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LockResult | null>(null);
  const [lockInfo, setLockInfo] = useState<LockInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleLock() {
    setLoading(true);
    setError(null);
    setResult(null);
    setLockInfo(null);
    try {
      const res = await fetch(`${AGENT_URL}/agent/lock_btc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_btc: 0.001, duration_days: 30 }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "lock failed");
      }
      const data = (await res.json()) as LockResult;
      setResult(data);
      if (data.token_id != null) {
        const lr = await fetch(`${AGENT_URL}/agent/lock/${data.token_id}`);
        if (lr.ok) {
          setLockInfo((await lr.json()) as LockInfo);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {isWrongChain && (
        <button
          onClick={() => switchChain({ chainId: 31611 })}
          disabled={isPending}
          className="rounded-lg bg-orange-500 px-6 py-3 text-white"
        >
          {isPending ? "Switching..." : "Switch to Mezo Testnet"}
        </button>
      )}
      <button
        onClick={handleLock}
        disabled={loading}
        className="rounded-lg bg-orange-500 px-6 py-3 font-medium text-white hover:bg-orange-600 disabled:opacity-50"
      >
        {loading ? "Locking..." : "Lock 0.001 BTC for 30 days"}
      </button>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <>
          <div className="rounded border border-green-300 bg-green-50 px-4 py-3 text-sm">
            <div className="font-medium text-green-800">Locked.</div>
            <div className="mt-1 text-green-700">
              Token ID:{" "}
              <span className="font-mono">
                {result.token_id ?? "(parse fallback failed)"}
              </span>
            </div>
            <a
              href={result.explorer_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-green-700 underline"
            >
              View on Mezo explorer →
            </a>
          </div>
          {lockInfo != null &&
            lockInfo.amount_btc != null &&
            lockInfo.unlock_time != null && (
              <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                <div className="font-medium">Position</div>
                <div className="mt-1">
                  Amount: {lockInfo.amount_btc.toFixed(6)} BTC
                </div>
                <div className="mt-1">
                  Unlocks:{" "}
                  {new Date(lockInfo.unlock_time * 1000).toLocaleString()}
                </div>
              </div>
            )}
        </>
      )}
    </div>
  );
}