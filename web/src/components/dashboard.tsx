import { useEffect, useState } from "react";
import { AGENT_URL } from "@/lib/agent-url";

interface DashboardData {
  btc_positions: number;
  btc_total_locked: number;
  mezo_positions: number;
  mezo_total_locked: number;
  active_votes: Array<{ token_id: number; weight_wei: string; gauge_name: string }>;
  gauge_total_votes_wei: string;
  operator_address: string;
  block_number: number;
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${AGENT_URL}/agent/dashboard`);
        if (!res.ok) throw new Error(`${res.status}`);
        const json = (await res.json()) as DashboardData;
        setData(json);
        setError(null);
      } catch {
        setError("Couldn't reach agent");
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-950/30 px-4 py-3 text-center text-sm text-red-300">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="animate-pulse rounded-xl border border-white/5 bg-zinc-900/40 px-6 py-8 text-center text-sm text-slate-500">
        Loading positions…
      </div>
    );
  }

  const formatMezo = (wei: string) => (Number(wei) / 1e18).toFixed(4);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-orange-500/50 via-cyan-500/30 to-transparent" />
      <div className="border-b border-white/5 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-slate-500">
              Live positions
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Operator agent wallet · polled every 15s
            </p>
          </div>
          <span className="font-mono text-[11px] text-cyan-400/80">
            block {data.block_number}
          </span>
        </div>
      </div>

      <div className="grid gap-px bg-white/5 sm:grid-cols-2">
        <div className="bg-zinc-950/40 px-5 py-4 sm:px-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-orange-400/90">
            veBTC
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-white">
            {data.btc_positions}
          </p>
          <p className="mt-0.5 text-sm text-slate-400">
            {Number(data.btc_total_locked ?? 0).toFixed(4)}{" "}
            <span className="text-slate-500">BTC locked</span>
          </p>
        </div>
        <div className="border-t border-white/5 bg-zinc-950/40 px-5 py-4 sm:border-t-0 sm:border-l sm:px-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-400/90">
            veMEZO
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-white">
            {data.mezo_positions}
          </p>
          <p className="mt-0.5 text-sm text-slate-400">
            {Number(data.mezo_total_locked ?? 0).toFixed(4)}{" "}
            <span className="text-slate-500">MEZO locked</span>
          </p>
        </div>
      </div>

      {data.active_votes.length > 0 && (
        <div className="border-t border-white/5 px-5 py-4 sm:px-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
            Active votes
          </p>
          <ul className="mt-3 space-y-2">
            {data.active_votes.map((v) => (
              <li
                key={v.token_id}
                className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-zinc-950/50 px-3 py-2 text-sm"
              >
                <span className="text-slate-300">
                  veMEZO #{v.token_id}{" "}
                  <span className="text-slate-500">→</span>{" "}
                  <span className="font-medium text-white">{v.gauge_name}</span>
                </span>
                <span className="shrink-0 font-mono text-xs text-cyan-400/90">
                  {formatMezo(v.weight_wei)} wt
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-white/5 px-5 py-3 sm:px-6">
        <p className="font-mono text-[11px] text-slate-500">
          operator{" "}
          <span className="text-slate-400">
            {data.operator_address?.slice(0, 6)}…{data.operator_address?.slice(-4)}
          </span>
        </p>
      </div>
    </section>
  );
}
