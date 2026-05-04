"use client";

import { useState } from "react";

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:8000";

interface LockResult {
  tx_hash: string;
  token_id: number | null;
  block_number: number;
  explorer_url: string;
}

export function LockBtcButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LockResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleLock() {
    setLoading(true);
    setError(null);
    setResult(null);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
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
      )}
    </div>
  );
}