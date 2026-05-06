"use client";

import { useCallback, useEffect, useState } from "react";
import { AGENT_URL } from "@/lib/agent-url";

const TOKEN_IDS = [1, 2, 3, 4, 5] as const;
const POLL_MS = 30_000;

interface LockInfo {
  token_id: number;
  owner: string | null;
  amount_wei: string | null;
  amount_btc: number | null;
  unlock_time: number | null;
  voting_power_wei: string | null;
}

function shortenOwner(addr: string | null) {
  if (!addr || addr.length < 12) return addr ?? "—";
  return `${addr.slice(0, 6)}…${addr.slice(-3)}`;
}

function isValidPosition(row: LockInfo | null): row is LockInfo {
  if (!row) return false;
  const hasOwner = Boolean(row.owner);
  const hasAmount =
    row.amount_btc != null ||
    (row.amount_wei != null && row.amount_wei !== "");
  const hasUnlock = row.unlock_time != null;
  return hasOwner || (hasAmount && hasUnlock);
}

function LiveActivitySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {TOKEN_IDS.map((id) => (
        <div
          key={id}
          className="animate-pulse rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
        >
          <div className="h-4 w-16 rounded bg-slate-200" />
          <div className="mt-3 h-3 w-full rounded bg-slate-100" />
          <div className="mt-2 h-3 w-2/3 rounded bg-slate-100" />
          <div className="mt-2 h-3 w-1/2 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export function LiveActivity() {
  const [rows, setRows] = useState<(LockInfo | null)[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
    }
    try {
      const results = await Promise.all(
        TOKEN_IDS.map(async (id) => {
          try {
            const res = await fetch(`${AGENT_URL}/agent/lock/${id}`, {
              cache: "no-store",
            });
            if (!res.ok) return null;
            return (await res.json()) as LockInfo;
          } catch {
            return null;
          }
        }),
      );
      setRows(results);
    } finally {
      if (!opts?.silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchAll();
    const t = setInterval(() => void fetchAll({ silent: true }), POLL_MS);
    return () => clearInterval(t);
  }, [fetchAll]);

  const valid = rows.filter(isValidPosition);

  return (
    <section className="py-12">
      <h2 className="text-lg font-semibold tracking-tight text-slate-700">
        Recent positions managed
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        On-chain reads for token IDs 1–5 (refreshes every 30s).
      </p>
      <div className="mt-6">
        {loading ? (
          <LiveActivitySkeleton />
        ) : valid.length === 0 ? (
          <p className="rounded-xl border border-slate-100 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            No position data yet. Run the agent to create locks on testnet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {valid.map((row) => (
              <article
                key={row.token_id}
                className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Token #{row.token_id}
                </div>
                <dl className="mt-3 space-y-2 text-sm">
                  <div>
                    <dt className="text-slate-500">Amount</dt>
                    <dd className="font-medium text-slate-800">
                      {row.amount_btc != null
                        ? `${row.amount_btc.toFixed(6)} BTC`
                        : row.amount_wei != null
                          ? `${row.amount_wei} wei`
                          : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Unlock</dt>
                    <dd className="text-slate-800">
                      {row.unlock_time != null
                        ? new Date(
                            row.unlock_time * 1000,
                          ).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Owner</dt>
                    <dd className="font-mono text-xs text-slate-700">
                      {shortenOwner(row.owner)}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
