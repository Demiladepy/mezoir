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
          className="animate-pulse rounded-xl border border-[#e3e8ee] bg-[#f1f5f9] p-4"
        >
          <div className="h-3 w-16 rounded bg-[#e3e8ee]" />
          <div className="mt-3 h-3 w-full rounded bg-[#e3e8ee]" />
          <div className="mt-2 h-3 w-2/3 rounded bg-[#e3e8ee]" />
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
    <section className="rounded-2xl border border-[#e3e8ee] bg-white p-6 shadow-sm lg:p-8">
      <div className="mb-4">
        <h2 className="text-xs font-medium uppercase tracking-[0.08em] text-[#697386]">
          Recent positions
        </h2>
        <p className="mt-1 text-sm text-[#425466]">
          On-chain reads · token IDs 1–5 · 30s refresh
        </p>
      </div>
      <div>
        {loading ? (
          <LiveActivitySkeleton />
        ) : valid.length === 0 ? (
          <p className="rounded-lg bg-[#fafbff] px-6 py-8 text-center text-sm text-[#697386]">
            No position data yet. Run the agent to create locks on testnet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {valid.map((row) => (
              <article
                key={row.token_id}
                className="rounded-xl border border-[#e3e8ee] p-4 transition-all duration-200 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.08em] text-[#697386]">
                    Token
                  </span>
                  <span className="font-mono text-sm font-medium text-[#0a2540]">
                    #{row.token_id}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div>
                    <dt className="text-[#697386]">Amount</dt>
                    <dd className="mt-0.5 font-medium tabular-nums text-[#0a2540]">
                      {row.amount_btc != null
                        ? `${row.amount_btc.toFixed(6)} BTC`
                        : row.amount_wei != null
                          ? `${row.amount_wei} wei`
                          : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#697386]">Owner</dt>
                    <dd className="mt-0.5 font-mono text-[11px] text-[#425466]">
                      {shortenOwner(row.owner)}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[#697386]">Unlock</dt>
                    <dd className="mt-0.5 text-[#425466]">
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
