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

  if (error) return null;
  if (!data) {
    return (
      <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-400">
        Loading positions...
      </div>
    );
  }

  const formatMezo = (wei: string) => (Number(wei) / 1e18).toFixed(4);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
          Live Positions
        </h2>
        <span className="font-mono text-xs text-slate-400">
          Block {data.block_number}
        </span>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">
            veBTC
          </div>
          <div className="text-3xl font-semibold text-slate-900">
            {data.btc_positions}
          </div>
          <div className="text-sm text-slate-600">
            {Number(data.btc_total_locked ?? 0).toFixed(4)} BTC locked
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">
            veMEZO
          </div>
          <div className="text-3xl font-semibold text-slate-900">
            {data.mezo_positions}
          </div>
          <div className="text-sm text-slate-600">
            {Number(data.mezo_total_locked ?? 0).toFixed(4)} MEZO locked
          </div>
        </div>
      </div>

      {data.active_votes.length > 0 && (
        <div className="border-t border-slate-100 pt-4">
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">
            Active Votes
          </div>
          {data.active_votes.map((v) => (
            <div
              key={v.token_id}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-slate-700">
                veMEZO #{v.token_id} {"->"}{" "}
                <span className="font-medium">{v.gauge_name}</span>
              </span>
              <span className="font-mono text-slate-500">
                {formatMezo(v.weight_wei)} weight
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 border-t border-slate-100 pt-4 font-mono text-xs text-slate-400">
        Operator: {data.operator_address?.slice(0, 6)}...
        {data.operator_address?.slice(-4)}
      </div>
    </div>
  );
}
