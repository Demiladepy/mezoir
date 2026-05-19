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

interface ActivityLock {
  id: string;
  contract: string;
  token_id: number;
  owner: string;
  amount: number;
  unlock_time: number;
  created_at: number;
}

interface ActivityVote {
  token_id: number;
  gauge: string;
  voter: string;
  weight: string;
  timestamp: number;
}

interface ActivityData {
  locks: ActivityLock[];
  votes: ActivityVote[];
}

type ActivityItem =
  | { kind: "lock"; ts: number; lock: ActivityLock }
  | { kind: "vote"; ts: number; vote: ActivityVote };

function StatSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl bg-[#fafafa] p-4">
      <div className="mb-2 h-3 w-16 rounded bg-[#e5e5e5]" />
      <div className="h-10 w-14 rounded bg-[#e5e5e5]" />
      <div className="mt-2 h-3 w-24 rounded bg-[#e5e5e5]" />
    </div>
  );
}

function shortAddress(addr: string) {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatRelativeTime(ts: number) {
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, now - ts);
  if (diff < 60) return `${diff || 1}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function mergeActivity(data: ActivityData | null, limit = 7): ActivityItem[] {
  if (!data) return [];
  const items: ActivityItem[] = [
    ...data.locks.map((lock) => ({ kind: "lock" as const, ts: lock.created_at, lock })),
    ...data.votes.map((vote) => ({ kind: "vote" as const, ts: vote.timestamp, vote })),
  ];
  return items.sort((a, b) => b.ts - a.ts).slice(0, limit);
}

function activitySummary(item: ActivityItem) {
  if (item.kind === "lock") {
    const asset = item.lock.contract === "veMEZO" ? "MEZO" : "BTC";
    return (
      <>
        <span aria-hidden>🔒</span>
        <span>
          {shortAddress(item.lock.owner)} locked {item.lock.amount.toFixed(4)} ve
          {asset} #{item.lock.token_id}
        </span>
      </>
    );
  }

  const weight = (Number(item.vote.weight) / 1e18).toFixed(4);
  return (
    <>
      <span aria-hidden>🗳️</span>
      <span>
        {shortAddress(item.vote.voter)} voted with veMEZO #{item.vote.token_id} (
        {weight} weight)
      </span>
    </>
  );
}

function RecentActivityPanel() {
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [fetching, setFetching] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchActivity = async () => {
      setFetching(true);
      try {
        const res = await fetch(`${AGENT_URL}/agent/activity`);
        if (!res.ok) throw new Error(`${res.status}`);
        const json = (await res.json()) as ActivityData;
        if (!cancelled) {
          setActivity(json);
          setLastUpdated(new Date());
        }
      } catch {
        if (!cancelled) {
          setActivity({ locks: [], votes: [] });
          setLastUpdated(new Date());
        }
      } finally {
        if (!cancelled) setFetching(false);
      }
    };

    fetchActivity();
    const interval = setInterval(fetchActivity, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!lastUpdated) return;
    const update = () =>
      setSecondsAgo(Math.max(0, Math.floor((Date.now() - lastUpdated.getTime()) / 1000)));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const items = mergeActivity(activity);
  const updatedLabel =
    lastUpdated != null ? `Updated ${secondsAgo}s ago` : "Updating…";

  return (
    <section className="mezo-card mt-6 p-8 transition-shadow duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] lg:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-sm font-medium uppercase tracking-[0.1em] text-black">
          Recent activity across Mezo Earn
        </h2>
        <div className="flex items-center gap-2 text-xs text-[#737373]">
          <span
            className={`h-1.5 w-1.5 rounded-full bg-emerald-500 ${fetching ? "animate-pulse" : ""}`}
            aria-hidden
          />
          <span>{updatedLabel}</span>
        </div>
      </div>

      <div className="mt-6 max-h-72 overflow-y-auto">
        {items.length === 0 ? (
          <p className="animate-pulse py-6 text-center text-sm text-[#737373]">
            Waiting for activity…
          </p>
        ) : (
          <ul>
            {items.map((item, i) => (
              <li
                key={
                  item.kind === "lock"
                    ? `lock-${item.lock.id}`
                    : `vote-${item.vote.token_id}-${item.vote.timestamp}-${i}`
                }
                className="flex items-center justify-between gap-4 border-b border-[#e5e5e5] py-2 last:border-0"
              >
                <div className="flex min-w-0 items-center gap-2 text-sm text-[#525252]">
                  {activitySummary(item)}
                </div>
                <span className="shrink-0 text-xs text-[#737373]">
                  {formatRelativeTime(item.ts)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function PositionsPanel({
  data,
  error,
}: {
  data: DashboardData | null;
  error: string | null;
}) {
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

  return (
    <>
      <PositionsPanel data={data} error={error} />
      <RecentActivityPanel />
    </>
  );
}
