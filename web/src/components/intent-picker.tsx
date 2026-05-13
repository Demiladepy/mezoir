import { useEffect, useRef, useState } from "react";
import { AGENT_URL } from "@/lib/agent-url";

const PRESET_INTENTS = [
  "Maximize my BTC yield",
  "I'm MEZO-heavy, optimize voting returns",
  "Balanced: optimize across both",
  "Park me defensively",
] as const;

interface ParsedIntent {
  raw: string;
  profile: "btc_heavy" | "mezo_heavy" | "balanced" | "defensive";
  priority: "yield" | "safety" | "voting_returns";
}

interface ActionState {
  action: string;
  rationale: string;
  started: boolean;
  finished: boolean;
  success: boolean | null;
  tx_hash?: string;
  explorer_url?: string;
  error?: string;
  vote_token_id?: number;
  vote_weight?: number;
  vote_gauge_name?: string;
}

interface LogEntry {
  timestamp: string;
  message: string;
}

interface ChainSnapshot {
  block_number: number | null;
  block_timestamp: number | null;
  operator_address: string | null;
  operator_position_count: number | null;
  operator_total_locked_btc: number | null;
  operator_oldest_unlock_time: number | null;
  operator_newest_unlock_time: number | null;
}

interface DecisionOption {
  id: string;
  label: string;
  pros: string[];
  cons: string[];
  score: number;
}

interface DecisionState {
  step: string;
  options: DecisionOption[];
  chosen_id: string | null;
  rationale: string | null;
  scores: Record<string, number>;
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
  const [status, setStatus] = useState<"idle" | "streaming" | "done" | "error">(
    "idle",
  );
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [parsedIntent, setParsedIntent] = useState<ParsedIntent | null>(null);
  const [chainSnapshot, setChainSnapshot] = useState<ChainSnapshot | null>(null);
  const [decisions, setDecisions] = useState<DecisionState[]>([]);
  const [actions, setActions] = useState<ActionState[]>([]);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!logContainerRef.current) return;
    logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
  }, [logs.length]);

  function handleSubmit() {
    sourceRef.current?.close();
    sourceRef.current = null;

    setStatus("streaming");
    setErrorMessage(null);
    setLogs([]);
    setParsedIntent(null);
    setChainSnapshot(null);
    setDecisions([]);
    setActions([]);
    setExplanation(null);

    const url = `${AGENT_URL}/agent/execute_stream?intent=${encodeURIComponent(intent)}&amount_btc=${amountBtc}`;

    const source = new EventSource(url);
    sourceRef.current = source;

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as Record<string, unknown> & {
          type?: string;
        };
        const type = payload.type ?? "";

        if (type === "log") {
          setLogs((prev) => [
            ...prev,
            {
              timestamp: String(payload.timestamp ?? ""),
              message: String(payload.message ?? ""),
            },
          ]);
          return;
        }

        if (type === "parsed_intent") {
          const data = payload.intent_parsed as ParsedIntent | undefined;
          if (data) setParsedIntent(data);
          return;
        }

        if (type === "chain_snapshot") {
          const snap = payload.snapshot as ChainSnapshot | undefined;
          if (snap) setChainSnapshot(snap);
          return;
        }

        if (type === "decision_options") {
          const step = String(payload.step ?? "");
          const options = (payload.options as DecisionOption[] | undefined) ?? [];
          setDecisions((prev) => [
            ...prev.filter((d) => d.step !== step),
            { step, options, chosen_id: null, rationale: null, scores: {} },
          ]);
          return;
        }

        if (type === "decision_made") {
          const step = String(payload.step ?? "");
          const chosen_id = String(payload.chosen_id ?? "");
          const rationale = String(payload.rationale ?? "");
          const scores =
            (payload.scores as Record<string, number> | undefined) ?? {};
          setDecisions((prev) =>
            prev.map((d) =>
              d.step === step ? { ...d, chosen_id, rationale, scores } : d,
            ),
          );
          return;
        }

        if (type === "action_start") {
          const action = String(payload.action ?? "");
          const rationale = String(payload.rationale ?? "");
          setActions((prev) => [
            ...prev,
            {
              action,
              rationale,
              started: true,
              finished: false,
              success: null,
            },
          ]);
          return;
        }

        if (type === "action_result") {
          const actionName = String(payload.action ?? "");
          const success = Boolean(payload.success ?? false);
          setActions((prev) => {
            const next = [...prev];
            for (let i = next.length - 1; i >= 0; i -= 1) {
              if (next[i].action === actionName && !next[i].finished) {
                next[i] = {
                  ...next[i],
                  finished: true,
                  success,
                  rationale:
                    payload.rationale != null
                      ? String(payload.rationale)
                      : next[i].rationale,
                  tx_hash:
                    payload.tx_hash != null
                      ? String(payload.tx_hash)
                      : undefined,
                  explorer_url:
                    payload.explorer_url != null
                      ? String(payload.explorer_url)
                      : undefined,
                  error:
                    payload.error != null ? String(payload.error) : undefined,
                };
                return next;
              }
            }
            next.push({
              action: actionName,
              started: true,
              finished: true,
              success,
              rationale:
                payload.rationale != null ? String(payload.rationale) : "",
              tx_hash:
                payload.tx_hash != null ? String(payload.tx_hash) : undefined,
              explorer_url:
                payload.explorer_url != null
                  ? String(payload.explorer_url)
                  : undefined,
              error: payload.error != null ? String(payload.error) : undefined,
            });
            return next;
          });
          return;
        }

        if (type === "vote_cast") {
          const tokenId = Number(payload.token_id ?? 0);
          const weight = Number(payload.weight ?? 0);
          const gaugeName = String(payload.gauge_name ?? "MUSD/BTC LP");
          const txHash =
            payload.tx_hash != null ? String(payload.tx_hash) : undefined;
          const explorerUrl =
            payload.explorer_url != null
              ? String(payload.explorer_url)
              : undefined;
          setActions((prev) => {
            const next = [...prev];
            for (let i = next.length - 1; i >= 0; i -= 1) {
              if (next[i].action === "vote_gauge" && !next[i].finished) {
                next[i] = {
                  ...next[i],
                  vote_token_id: tokenId,
                  vote_weight: weight,
                  vote_gauge_name: gaugeName,
                  tx_hash: txHash ?? next[i].tx_hash,
                  explorer_url: explorerUrl ?? next[i].explorer_url,
                };
                return next;
              }
            }
            return [
              ...next,
              {
                action: "vote_gauge",
                rationale: "",
                started: true,
                finished: false,
                success: null,
                tx_hash: txHash,
                explorer_url: explorerUrl,
                vote_token_id: tokenId,
                vote_weight: weight,
                vote_gauge_name: gaugeName,
              },
            ];
          });
          return;
        }

        if (type === "explanation") {
          setExplanation(String(payload.text ?? ""));
          return;
        }

        if (type === "done") {
          setStatus("done");
          source.close();
          sourceRef.current = null;
        }
      } catch {
        setStatus("error");
        setErrorMessage("Couldn't parse stream output from the agent.");
        source.close();
        sourceRef.current = null;
      }
    };

    source.onerror = () => {
      if (sourceRef.current) {
        source.close();
        sourceRef.current = null;
        setStatus("error");
        setErrorMessage("Couldn't reach the agent. Is uvicorn running on port 8001?");
      }
    };
  }

  function shortHash(hash: string) {
    if (hash.length <= 16) return hash;
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
  }

  function friendlyActionError(action: string, error: string) {
    if (action === "lock_btc") {
      return `The BTC lock step failed: ${error}`;
    }
    if (action === "set_allowed_manager") {
      return `Granting manager permissions failed: ${error}`;
    }
    return `Action failed: ${error}`;
  }

  function actionLabel(action: string) {
    const map: Record<string, string> = {
      lock_btc: "Lock veBTC",
      lock_mezo: "Lock veMEZO",
      set_allowed_manager: "Authorize agent (veBTC)",
      set_allowed_manager_mezo: "Authorize agent (veMEZO)",
      extend_unlock: "Extend veBTC lock",
      extend_unlock_mezo: "Extend veMEZO lock",
      vote_gauge: "Vote on gauge",
    };
    return map[action] ?? action;
  }

  function shortAddress(addr: string | null | undefined) {
    if (!addr) return "not set";
    if (addr.length < 12) return addr;
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  }

  return (
    <div className="flex w-full max-w-lg flex-col gap-5 text-left transition-all duration-300">
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
        disabled={status === "streaming"}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-medium text-white shadow-sm transition-colors hover:bg-orange-600 disabled:pointer-events-none disabled:opacity-60"
      >
        {status === "streaming" ? (
          <>
            <Spinner className="h-5 w-5 animate-spin" />
            <span>Running...</span>
          </>
        ) : (
          "Run agent"
        )}
      </button>

      {(status === "streaming" || status === "done" || status === "error") && (
        <div className="mt-1 flex flex-col gap-6">
          {chainSnapshot && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Chain state at execution
              </div>
              <div className="mt-2 font-mono text-xs text-slate-500">
                Block {chainSnapshot.block_number ?? "unknown"}
              </div>
              <div className="mt-1 font-mono text-xs">
                Operator: {shortAddress(chainSnapshot.operator_address)}
              </div>
              <div className="mt-1">
                Holdings: {chainSnapshot.operator_position_count ?? 0} positions •{" "}
                {(chainSnapshot.operator_total_locked_btc ?? 0).toFixed(6)} BTC locked
              </div>
            </div>
          )}

          {decisions.length > 0 && (
            <div className="space-y-4">
              {decisions.map((decision) => (
                <div
                  key={decision.step}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Decision: {decision.step.replace("_", " ")}
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {decision.options.map((opt) => {
                      const chosen = decision.chosen_id === opt.id;
                      const decided = decision.chosen_id !== null;
                      return (
                        <div
                          key={opt.id}
                          className={`relative rounded-lg border p-3 transition-all duration-300 ${
                            chosen
                              ? "border-orange-500 shadow-sm ring-1 ring-orange-200"
                              : decided
                                ? "border-slate-200 opacity-60"
                                : "border-slate-200"
                          }`}
                        >
                          {chosen && (
                            <span className="absolute right-2 top-2 rounded-full bg-orange-500 px-2 py-0.5 text-xs text-white">
                              Selected
                            </span>
                          )}
                          <div className="pr-16 text-sm font-medium text-slate-800">
                            {opt.label}
                          </div>
                          <div className="mt-2 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-700">
                            {opt.score.toFixed(2)}
                          </div>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-green-700">
                            {opt.pros.map((p, i) => (
                              <li key={`${opt.id}-pro-${i}`}>{p}</li>
                            ))}
                          </ul>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
                            {opt.cons.map((c, i) => (
                              <li key={`${opt.id}-con-${i}`}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                  {decision.rationale && (
                    <p className="mt-3 italic text-slate-700">
                      Why: {decision.rationale}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {parsedIntent && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Parsed intent
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-800 shadow-sm ring-1 ring-slate-200">
                  {parsedIntent.profile}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-800 shadow-sm ring-1 ring-slate-200">
                  {parsedIntent.priority}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">{parsedIntent.raw}</p>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Agent activity
            </div>
            <div
              ref={logContainerRef}
              aria-live="polite"
              className="mt-3 max-h-64 overflow-y-auto rounded-xl bg-slate-50 p-4 font-mono text-sm text-slate-700 sm:max-h-80"
            >
              {logs.length === 0 ? (
                <p className="text-slate-500">Waiting for first events...</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((line, i) => {
                    const isLast = i === logs.length - 1 && status === "streaming";
                    const time = line.timestamp ? line.timestamp.slice(11, 19) : "--:--:--";
                    return (
                      <div key={`${line.timestamp}-${i}`} className="flex gap-3">
                        <span className="flex w-24 shrink-0 items-center gap-2 text-slate-400">
                          {isLast && (
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />
                          )}
                        </span>
                        <span className="w-16 shrink-0 text-slate-400">{time}</span>
                        <span>{line.message}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {actions.map((a) => (
              <div
                key={`${a.action}-${a.started}-${a.finished}-${a.tx_hash ?? a.error ?? ""}`}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  {a.started && !a.finished ? (
                    <Spinner className="mt-0.5 h-4 w-4 animate-spin text-slate-400" />
                  ) : a.success === true ? (
                    <span className="text-lg text-green-600" aria-hidden>
                      ✓
                    </span>
                  ) : (
                    <span className="text-lg text-red-500" aria-hidden>
                      ✗
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-800">
                      {actionLabel(a.action)}
                    </div>
                    {a.tx_hash && a.explorer_url && (
                      <a
                        href={a.explorer_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block truncate font-mono text-sm text-orange-500 underline hover:text-orange-600"
                      >
                        {shortHash(a.tx_hash)}
                      </a>
                    )}
                    {a.error && (
                      <p className="mt-2 text-sm text-red-700">
                        {friendlyActionError(a.action, a.error)}
                      </p>
                    )}
                    {a.action === "vote_gauge" &&
                      a.vote_token_id != null &&
                      a.vote_weight != null && (
                        <div className="mt-2 text-sm text-slate-700">
                          <p>
                            Voted with veMEZO #{a.vote_token_id} on{" "}
                            {a.vote_gauge_name ?? "MUSD/BTC LP"}
                          </p>
                          <p className="text-xs text-slate-500">
                            Weight: {(a.vote_weight / 1e18).toFixed(3)} MEZO
                            weight
                          </p>
                        </div>
                      )}
                    <div className="mt-2 flex flex-wrap items-start gap-2">
                      <span className="shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                        AI reasoning
                      </span>
                      <p className="min-w-0 flex-1 text-sm leading-relaxed text-slate-600">
                        {a.rationale}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {explanation && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm leading-relaxed text-slate-700 shadow-sm">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-orange-700">
                What just happened
              </div>
              {explanation}
            </div>
          )}

          {status === "error" && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}
        </div>
      )}

      <p className="pt-2 text-center text-xs text-slate-400">
        Mezoir runs on Mezo Testnet. All transactions are real and verifiable on
        the explorer.
      </p>
    </div>
  );
}
