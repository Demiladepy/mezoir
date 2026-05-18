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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {TOKEN_IDS.map((id) => (
        <div
          key={id}
          className="animate-pulse rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-5"
        >
          <div className="h-3 w-16 rounded bg-[#e5e5e5]" />
          <div className="mt-3 h-3 w-full rounded bg-[#e5e5e5]" />
          <div className="mt-2 h-3 w-2/3 rounded bg-[#e5e5e5]" />
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
    <section className="mezo-card p-8 lg:p-10">
      <div className="mb-6">
        <h2 className="text-sm font-medium uppercase tracking-[0.1em] text-black">
          Recent positions
        </h2>
        <p className="mt-2 text-sm text-[#525252]">
          On-chain reads · token IDs 1–5 · 30s refresh
        </p>
      </div>
      <div>
        {loading ? (
          <LiveActivitySkeleton />
        ) : valid.length === 0 ? (
          <p className="rounded-2xl bg-[#fafafa] px-6 py-10 text-center text-sm text-[#737373]">
            No position data yet. Run the agent to create locks on testnet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {valid.map((row) => (
              <article
                key={row.token_id}
                className="rounded-2xl border border-[#e5e5e5] bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.1em] text-[#737373]">
                    Token
                  </span>
                  <span className="font-mono text-sm font-medium text-black">
                    #{row.token_id}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div>
                    <dt className="text-[#737373]">Amount</dt>
                    <dd className="mt-0.5 font-medium tabular-nums text-black">
                      {row.amount_btc != null
                        ? `${row.amount_btc.toFixed(6)} BTC`
                        : row.amount_wei != null
                          ? `${row.amount_wei} wei`
                          : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#737373]">Owner</dt>
                    <dd className="mt-0.5 font-mono text-[11px] text-[#525252]">
                      {shortenOwner(row.owner)}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[#737373]">Unlock</dt>
                    <dd className="mt-0.5 text-[#525252]">
                      {row.unlock_time != null
                        ? new Date(row.unlock_time * 1000).toLocaleString(
                            undefined,
                            { dateStyle: "medium", timeStyle: "short" },
                          )
                        : "—"}
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
