"use client";

import { useState } from "react";
import { AGENT_URL } from "@/lib/agent-url";

const PRESET_INTENTS = [
  "Maximize my BTC yield",
  "I'm MEZO-heavy, optimize voting returns",
  "Balanced: optimize across both",
  "Park me defensively",
] as const;

function explainActionFailure(action: string, raw: string): string {
  const e = raw.toLowerCase();
  if (action === "lock_btc") {
    if (
      e.includes("insufficient") ||
      e.includes("balance") ||
      e.includes("funds")
    ) {
      return "The lock did not go through. The operator wallet may not have enough Mezo testnet BTC for this amount plus gas.";
    }
    if (e.includes("revert") || e.includes("execution")) {
      return "The network rejected the lock. Amount, gas, or unlock timing may not satisfy the contract on testnet.";
    }
    return "We could not lock BTC on this step. Try a smaller amount or confirm the agent RPC and contract are reachable.";
  }
  if (action === "set_allowed_manager") {
    if (e.includes("insufficient") || e.includes("gas")) {
      return "Setting the allowed manager failed, usually because the wallet ran out of gas on testnet.";
    }
    return "The agent could not register as allowed manager. The transaction may have reverted—check gas and that the operator address is valid.";
  }
  return `Something went wrong on this step (${action.replace(/_/g, " ")}). Check that the agent wallet has testnet funds and try again.`;
}

interface ExecuteActionResult {
  action: string;
  success: boolean;
  tx_hash?: string;
  explorer_url?: string;
  rationale: string;
  details?: Record<string, unknown>;
  error?: string;
}

interface ExecuteResponse {
  intent_parsed: {
    raw: string;
    profile: string;
    priority: string;
  };
  actions_taken: ExecuteActionResult[];
  explanation: string;
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export function IntentPicker() {
  const [intent, setIntent] = useState<string>(PRESET_INTENTS[0]);
  const [amountBtc, setAmountBtc] = useState(0.001);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ExecuteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await fetch(`${AGENT_URL}/agent/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, amount_btc: amountBtc }),
      });
      let data: unknown;
      try {
        data = await res.json();
      } catch {
        throw new TypeError("Failed to fetch");
      }
      if (!res.ok) {
        const detail = (data as { detail?: unknown }).detail;
        throw new Error(
          typeof detail === "string"
            ? detail
            : JSON.stringify(detail ?? data),
        );
      }
      setResponse(data as ExecuteResponse);
    } catch (e) {
      const isNetwork =
        e instanceof TypeError ||
        (e instanceof Error &&
          (e.message === "Failed to fetch" ||
            e.message.includes("NetworkError") ||
            e.message.includes("Load failed") ||
            e.message.includes("fetch")));
      if (isNetwork) {
        setError(
          "Couldn't reach the agent. Is uvicorn running on port 8001?",
        );
      } else {
        setError(e instanceof Error ? e.message : "unknown error");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full max-w-lg flex-col gap-5 text-left">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="intent-select"
          className="text-sm font-medium text-slate-700"
        >
          Intent
        </label>
        <select
          id="intent-select"
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition-colors focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
        >
          {PRESET_INTENTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="amount-btc"
          className="text-sm font-medium text-slate-700"
        >
          Amount (BTC)
        </label>
        <input
          id="amount-btc"
          type="number"
          min={0.0001}
          step={0.0001}
          value={amountBtc}
          onChange={(e) => setAmountBtc(Number(e.target.value))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition-colors focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-medium text-white shadow-sm transition-colors hover:bg-orange-600 disabled:pointer-events-none disabled:opacity-60"
      >
        {loading ? (
          <>
            <Spinner className="h-5 w-5 animate-spin" />
            <span>Running...</span>
          </>
        ) : (
          "Run agent"
        )}
      </button>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {response && (
        <div className="mt-1 flex flex-col gap-6">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Parsed intent
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-800 shadow-sm ring-1 ring-slate-200">
                {response.intent_parsed.profile}
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-800 shadow-sm ring-1 ring-slate-200">
                {response.intent_parsed.priority}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {response.intent_parsed.raw}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {response.actions_taken.map((a) => (
              <div
                key={`${a.action}-${a.success}-${a.tx_hash ?? a.error ?? ""}`}
                className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={
                      a.success
                        ? "text-lg text-emerald-600"
                        : "text-lg text-red-600"
                    }
                    aria-hidden
                  >
                    {a.success ? "✓" : "✗"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-800">
                      {a.action}
                    </div>
                    {a.success && a.tx_hash && (
                      <a
                        href={a.explorer_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block truncate font-mono text-sm text-orange-600 underline transition-colors hover:text-orange-700"
                      >
                        {a.tx_hash}
                      </a>
                    )}
                    {!a.success && a.error && (
                      <p className="mt-2 text-sm leading-relaxed text-red-800">
                        {explainActionFailure(a.action, a.error)}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-start gap-2">
                      {a.rationale.length > 100 && (
                        <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-900">
                          AI reasoning
                        </span>
                      )}
                      <p className="min-w-0 flex-1 text-sm leading-relaxed text-slate-600">
                        {a.rationale}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 text-sm leading-relaxed text-slate-800 shadow-sm">
            {response.explanation}
          </div>
        </div>
      )}
    </div>
  );
}
