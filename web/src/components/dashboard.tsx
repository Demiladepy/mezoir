import { useEffect, useState } from "react";
import { AGENT_URL } from "@/lib/agent-url";

const EXPLORER = "https://explorer.test.mezo.org";

interface DashboardData {
  btc_positions: number;
  btc_total_locked: number;
  mezo_positions: number;
  mezo_total_locked: number;
  active_votes: Array<{ token_id: number; weight_wei: string; gauge_name: string }>;
  gauge_total_votes_wei: string;
  operator_address: string;
  block_number: number;
  data_source?: "goldsky" | "rpc";
}

function StatSkeleton() {
  return (
    <div className="rounded-lg bg-[#f1f5f9] p-4 animate-pulse">
      <div className="mb-2 h-3 w-16 rounded bg-[#e3e8ee]" />
      <div className="h-8 w-12 rounded bg-[#e3e8ee]" />
      <div className="mt-2 h-3 w-24 rounded bg-[#e3e8ee]" />
    </div>
  );
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
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <section className="mezoir-card p-7 lg:p-9">
        <div className="mb-6 h-3 w-28 animate-pulse rounded bg-[#f1f5f9]" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <StatSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  const formatMezo = (wei: string) => (Number(wei) / 1e18).toFixed(4);
  const gaugeLabel =
    data.active_votes.length > 0
      ? data.active_votes[0].gauge_name
      : "—";

  const indexLabel =
    data.data_source === "goldsky"
      ? "indexed via Goldsky"
      : data.data_source === "rpc"
        ? "via RPC"
        : "refreshed every 15s";

  const indexDot =
    data.data_source === "goldsky"
      ? "bg-emerald-500"
      : data.data_source === "rpc"
        ? "bg-amber-500"
        : "bg-[#697386]/40";

  return (
    <section className="mezoir-card p-7 lg:p-9">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="mezoir-label">Live positions</h2>
        <p className="flex items-center gap-2 font-mono text-xs text-[#697386]">
          {data.data_source != null && (
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${indexDot}`}
              aria-hidden
            />
          )}
          Block {data.block_number}
          <span className="text-[#e3e8ee]">·</span>
          {indexLabel}
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-8 lg:grid-cols-4 lg:gap-10">
        <div className="group">
          <p className="mezoir-label mb-3">veBTC</p>
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-[#0a2540] transition-transform duration-300 group-hover:scale-[1.02] lg:text-4xl">
            {data.btc_positions}
          </p>
          <p className="mt-1 text-sm text-[#425466]">
            {Number(data.btc_total_locked ?? 0).toFixed(4)} BTC locked
          </p>
        </div>
        <div className="group">
          <p className="mezoir-label mb-3">veMEZO</p>
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-[#0a2540] transition-transform duration-300 group-hover:scale-[1.02] lg:text-4xl">
            {data.mezo_positions}
          </p>
          <p className="mt-1 text-sm text-[#425466]">
            {Number(data.mezo_total_locked ?? 0).toFixed(4)} MEZO locked
          </p>
        </div>
        <div>
          <p className="mezoir-label mb-3">Active votes</p>
          <p className="text-3xl font-semibold tracking-tight text-[#0a2540] lg:text-4xl">
            {data.active_votes.length}
          </p>
          <p className="mt-1 truncate text-sm text-[#425466]">{gaugeLabel}</p>
        </div>
        <div>
          <p className="mezoir-label mb-3">Operator</p>
          <p className="font-mono text-xl font-semibold tracking-tight text-[#0a2540] lg:text-2xl">
            {data.operator_address?.slice(0, 6)}…{data.operator_address?.slice(-4)}
          </p>
          <p className="mt-1 text-sm text-[#425466]">Agent wallet</p>
        </div>
      </div>

      {data.active_votes.length > 0 && (
        <div className="mt-6 border-t border-[#e3e8ee] pt-6">
          <p className="mezoir-label">Vote allocations</p>
          <ul className="mt-3 divide-y divide-[#e3e8ee]">
            {data.active_votes.map((v) => (
              <li
                key={v.token_id}
                className="flex items-center justify-between gap-4 py-2"
              >
                <div>
                  <p className="font-medium text-[#0a2540]">{v.gauge_name}</p>
                  <p className="text-sm text-[#697386]">veMEZO #{v.token_id}</p>
                </div>
                <a
                  href={EXPLORER}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-sm text-[#0a2540] transition-colors hover:text-[#f4007a]"
                >
                  {formatMezo(v.weight_wei)} wt
                  <span className="text-[#f4007a]" aria-hidden>
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

