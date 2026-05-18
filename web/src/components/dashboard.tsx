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
    <div className="animate-pulse rounded-2xl bg-[#fafafa] p-4">
      <div className="mb-2 h-3 w-16 rounded bg-[#e5e5e5]" />
      <div className="h-10 w-14 rounded bg-[#e5e5e5]" />
      <div className="mt-2 h-3 w-24 rounded bg-[#e5e5e5]" />
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
      <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-4 text-center text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <section className="mezo-card p-8 lg:p-10">
        <div className="mb-8 h-3 w-32 animate-pulse rounded bg-[#fafafa]" />
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4 lg:gap-8">
          {[0, 1, 2, 3].map((i) => (
            <StatSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  const formatMezo = (wei: string) => (Number(wei) / 1e18).toFixed(4);

  const indexLabel =
    data.data_source === "goldsky"
      ? "via Goldsky"
      : data.data_source === "rpc"
        ? "via RPC"
        : null;

  const indexDot =
    data.data_source === "goldsky"
      ? "bg-emerald-500"
      : data.data_source === "rpc"
        ? "bg-amber-500"
        : null;

  return (
    <section className="mezo-card p-8 transition-shadow duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] lg:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-sm font-medium uppercase tracking-[0.1em] text-black">
          Live positions
        </h2>
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-[#737373]">
          <span>block {data.block_number}</span>
          {indexLabel != null && indexDot != null && (
            <>
              <span className="text-[#e5e5e5]">·</span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${indexDot}`}
                  aria-hidden
                />
                {indexLabel}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-6 lg:grid-cols-4 lg:gap-8">
        <div className="group transition-transform duration-300 hover:scale-[1.01]">
          <p className="mb-2 text-xs uppercase tracking-[0.1em] text-[#737373]">
            veBTC
          </p>
          <p className="text-4xl font-semibold tracking-tight text-black lg:text-5xl">
            {data.btc_positions}
          </p>
          <p className="mt-1 text-sm text-[#525252]">
            {Number(data.btc_total_locked ?? 0).toFixed(4)} BTC locked
          </p>
        </div>
        <div className="group transition-transform duration-300 hover:scale-[1.01]">
          <p className="mb-2 text-xs uppercase tracking-[0.1em] text-[#737373]">
            veMEZO
          </p>
          <p className="text-4xl font-semibold tracking-tight text-black lg:text-5xl">
            {data.mezo_positions}
          </p>
          <p className="mt-1 text-sm text-[#525252]">
            {Number(data.mezo_total_locked ?? 0).toFixed(4)} MEZO locked
          </p>
        </div>
        <div className="group transition-transform duration-300 hover:scale-[1.01]">
          <p className="mb-2 text-xs uppercase tracking-[0.1em] text-[#737373]">
            Active votes
          </p>
          <p className="text-4xl font-semibold tracking-tight text-black lg:text-5xl">
            {data.active_votes.length}
          </p>
          <p className="mt-1 text-sm text-[#525252]">
            {data.active_votes.length > 0 ? "gauge allocations" : "none yet"}
          </p>
        </div>
        <div className="group transition-transform duration-300 hover:scale-[1.01]">
          <p className="mb-2 text-xs uppercase tracking-[0.1em] text-[#737373]">
            Operator
          </p>
          <p className="font-mono text-2xl font-semibold tracking-tight text-black lg:text-3xl">
            {data.operator_address?.slice(0, 6)}…{data.operator_address?.slice(-4)}
          </p>
          <p className="mt-1 text-sm text-[#525252]">Agent wallet</p>
        </div>
      </div>

      {data.active_votes.length > 0 && (
        <div className="mt-8 border-t border-[#e5e5e5] pt-8">
          <p className="mb-4 text-xs uppercase tracking-[0.1em] text-[#737373]">
            Active gauge votes
          </p>
          <ul className="divide-y divide-[#e5e5e5]">
            {data.active_votes.map((v) => (
              <li
                key={v.token_id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div>
                  <p className="font-medium text-black">{v.gauge_name}</p>
                  <p className="text-sm text-[#737373]">veMEZO #{v.token_id}</p>
                </div>
                <a
                  href={EXPLORER}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-sm text-black transition-colors hover:text-[#e91e63]"
                >
                  {formatMezo(v.weight_wei)} wt
                  <span className="text-[#e91e63]" aria-hidden>
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
