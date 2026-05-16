import { useEffect, useRef, useState, type ReactNode } from "react";
import { AGENT_URL } from "@/lib/agent-url";

const PRESET_INTENTS = [
  "Maximize my BTC yield",
  "I'm MEZO-heavy, optimize voting returns",
  "Balanced: optimize across both",
  "Park me defensively",
] as const;

const fieldClass =
  "w-full rounded-lg border border-[#e3e8ee] bg-[#fafbff] px-3 py-2.5 text-sm text-[#0a2540] shadow-sm transition-colors focus:border-[#f7931a] focus:outline-none focus:ring-2 focus:ring-[#f7931a]/20";

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

function FadeIn({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div
      className={`transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"} ${className}`}
    >
      {children}
    </div>
  );
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

function attachStreamHandlers(
  source: EventSource,
  handlers: {
    setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>;
    setParsedIntent: React.Dispatch<React.SetStateAction<ParsedIntent | null>>;
    setChainSnapshot: React.Dispatch<React.SetStateAction<ChainSnapshot | null>>;
    setDecisions: React.Dispatch<React.SetStateAction<DecisionState[]>>;
    setActions: React.Dispatch<React.SetStateAction<ActionState[]>>;
    setExplanation: React.Dispatch<React.SetStateAction<string | null>>;
    setStatus: React.Dispatch<
      React.SetStateAction<"idle" | "streaming" | "done" | "error">
    >;
    setErrorMessage: React.Dispatch<React.SetStateAction<string | null>>;
    sourceRef: React.MutableRefObject<EventSource | null>;
  },
) {
  source.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data) as Record<string, unknown> & {
        type?: string;
      };
      const type = payload.type ?? "";

      if (type === "log") {
        handlers.setLogs((prev) => [
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
        if (data) handlers.setParsedIntent(data);
        return;
      }

      if (type === "chain_snapshot") {
        const snap = payload.snapshot as ChainSnapshot | undefined;
        if (snap) handlers.setChainSnapshot(snap);
        return;
      }

      if (type === "decision_options") {
        const step = String(payload.step ?? "");
        const options = (payload.options as DecisionOption[] | undefined) ?? [];
        handlers.setDecisions((prev) => [
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
        handlers.setDecisions((prev) =>
          prev.map((d) =>
            d.step === step ? { ...d, chosen_id, rationale, scores } : d,
          ),
        );
        return;
      }

      if (type === "action_start") {
        const action = String(payload.action ?? "");
        const rationale = String(payload.rationale ?? "");
        handlers.setActions((prev) => [
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
        handlers.setActions((prev) => {
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
        handlers.setActions((prev) => {
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
        handlers.setExplanation(String(payload.text ?? ""));
        return;
      }

      if (type === "done") {
        handlers.setStatus("done");
        source.close();
        handlers.sourceRef.current = null;
      }
    } catch {
      handlers.setStatus("error");
      handlers.setErrorMessage("Couldn't parse stream output from the agent.");
      source.close();
      handlers.sourceRef.current = null;
    }
  };

  source.onerror = () => {
    if (handlers.sourceRef.current) {
      source.close();
      handlers.sourceRef.current = null;
      handlers.setStatus("error");
      handlers.setErrorMessage(
        "Couldn't reach the agent. Is uvicorn running on port 8001?",
      );
    }
  };
}

export function IntentPicker() {
  const [intent, setIntent] = useState<string>(PRESET_INTENTS[0]);
  const [amountBtc, setAmountBtc] = useState(0.001);
  const [status, setStatus] = useState<"idle" | "streaming" | "done" | "error">(
    "idle",
  );
  const [initializing, setInitializing] = useState(false);
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

    setLogs([]);
    setActions([]);
    setDecisions([]);
    setParsedIntent(null);
    setChainSnapshot(null);
    setExplanation(null);
    setErrorMessage(null);

    setStatus("streaming");
    setInitializing(true);

    const url = `${AGENT_URL}/agent/execute_stream?intent=${encodeURIComponent(intent)}&amount_btc=${amountBtc}`;

    window.setTimeout(() => {
      setInitializing(false);
      const source = new EventSource(url);
      sourceRef.current = source;
      attachStreamHandlers(source, {
        setLogs,
        setParsedIntent,
        setChainSnapshot,
        setDecisions,
        setActions,
        setExplanation,
        setStatus,
        setErrorMessage,
        sourceRef,
      });
    }, 300);
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

  const showStream =
    status === "streaming" || status === "done" || status === "error";

  return (
    <section className="overflow-hidden rounded-2xl border border-[#e3e8ee] bg-white shadow-sm">
      <div className="border-b border-[#e3e8ee] p-6 lg:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="intent-select"
              className="text-xs font-medium uppercase tracking-[0.08em] text-[#697386]"
            >
              Intent
            </label>
            <select
              id="intent-select"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              className={fieldClass}
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
              className="text-xs font-medium uppercase tracking-[0.08em] text-[#697386]"
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
              className={fieldClass}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={status === "streaming"}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#f7931a] px-6 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#e08813] hover:shadow-md disabled:pointer-events-none disabled:opacity-60 sm:w-auto"
        >
          {status === "streaming" ? (
            <>
              <Spinner className="h-5 w-5 animate-spin" />
              <span>Running…</span>
            </>
          ) : (
            "Run agent"
          )}
        </button>
      </div>

      {showStream && (
        <div className="flex flex-col">
          {initializing && status === "streaming" && (
            <FadeIn className="border-b border-[#e3e8ee] p-6 lg:p-8">
              <p className="text-sm text-[#425466]">Initializing agent…</p>
            </FadeIn>
          )}

          {(logs.length > 0 || (!initializing && status === "streaming")) && (
            <FadeIn className="border-b border-[#e3e8ee] p-6 lg:p-8">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#697386]">
                Activity
              </p>
              <div
                ref={logContainerRef}
                aria-live="polite"
                className="mt-3 max-h-64 overflow-y-auto rounded-lg bg-[#fafbff] p-4"
              >
                {logs.length === 0 ? (
                  <p className="font-mono text-sm text-[#697386]">
                    Waiting for first events…
                  </p>
                ) : (
                  <div className="space-y-2 font-mono text-sm">
                    {logs.map((line, i) => {
                      const isLast =
                        i === logs.length - 1 && status === "streaming";
                      const time = line.timestamp
                        ? line.timestamp.slice(11, 19)
                        : "--:--:--";
                      return (
                        <div key={`${line.timestamp}-${i}`} className="flex gap-3">
                          <span className="w-16 shrink-0 text-[#697386]">
                            {time}
                          </span>
                          <span className="flex min-w-0 flex-1 gap-2 text-[#425466]">
                            {isLast && (
                              <span
                                className="mt-2 h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[#f7931a]"
                                aria-hidden
                              />
                            )}
                            {line.message}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </FadeIn>
          )}

          {chainSnapshot && (
            <FadeIn className="border-b border-[#e3e8ee] p-6 lg:p-8">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#697386]">
                Chain state
              </p>
              <div className="mt-4 grid gap-6 sm:grid-cols-2">
                <div className="border-l-2 border-[#f7931a] pl-4">
                  <p className="text-xs text-[#697386]">Block</p>
                  <p className="mt-1 font-mono text-sm text-[#0a2540]">
                    {chainSnapshot.block_number ?? "unknown"}
                  </p>
                </div>
                <div className="border-l-2 border-[#f7931a] pl-4">
                  <p className="text-xs text-[#697386]">Operator</p>
                  <p className="mt-1 font-mono text-sm text-[#0a2540]">
                    {shortAddress(chainSnapshot.operator_address)}
                  </p>
                  <p className="mt-2 text-xs text-[#697386]">Positions</p>
                  <p className="mt-1 text-sm text-[#425466]">
                    {chainSnapshot.operator_position_count ?? 0} ·{" "}
                    {(chainSnapshot.operator_total_locked_btc ?? 0).toFixed(6)}{" "}
                    BTC locked
                  </p>
                </div>
              </div>
            </FadeIn>
          )}

          {parsedIntent && (
            <FadeIn className="border-b border-[#e3e8ee] p-6 lg:p-8">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#697386]">
                Parsed intent
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-[#f7931a]/20 bg-[#f7931a]/10 px-3 py-1 text-sm font-medium text-[#f7931a]">
                  {parsedIntent.profile}
                </span>
                <span className="rounded-full border border-[#f7931a]/20 bg-[#f7931a]/10 px-3 py-1 text-sm font-medium text-[#f7931a]">
                  {parsedIntent.priority}
                </span>
              </div>
              <p className="mt-3 text-sm italic text-[#697386]">
                {parsedIntent.raw}
              </p>
            </FadeIn>
          )}

          {decisions.length > 0 && (
            <div className="border-b border-[#e3e8ee]">
              {decisions.map((decision) => {
                const decided = decision.chosen_id !== null;
                const stepLabel = decision.step.replace(/_/g, " ");
                return (
                  <FadeIn
                    key={decision.step}
                    className="border-b border-[#e3e8ee] p-6 last:border-b-0 lg:p-8"
                  >
                    <h3 className="text-lg font-semibold text-[#0a2540]">
                      Decision: {stepLabel}
                    </h3>
                    {!decided && (
                      <p className="mt-1 text-xs uppercase tracking-[0.08em] text-[#697386]">
                        Agent is comparing options
                      </p>
                    )}
                    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                      {decision.options.map((opt) => {
                        const chosen = decision.chosen_id === opt.id;
                        return (
                          <div
                            key={opt.id}
                            className={`relative rounded-xl border-2 p-5 transition-all duration-300 ${
                              chosen
                                ? "scale-[1.01] border-[#f7931a] shadow-[0_4px_12px_rgba(247,147,26,0.15)]"
                                : decided
                                  ? "border-[#e3e8ee] opacity-50"
                                  : "border-[#e3e8ee]"
                            }`}
                          >
                            {chosen && (
                              <span className="absolute right-3 top-3 rounded-full bg-[#f7931a] px-2 py-1 text-xs font-medium text-white">
                                Selected
                              </span>
                            )}
                            <p className="pr-20 text-sm font-medium text-[#0a2540]">
                              {opt.label}
                            </p>
                            <ul className="mt-3 space-y-1">
                              {opt.pros.map((p, i) => (
                                <li
                                  key={`${opt.id}-pro-${i}`}
                                  className="flex gap-2 text-sm text-[#425466]"
                                >
                                  <span className="text-[#f7931a]">•</span>
                                  <span>{p}</span>
                                </li>
                              ))}
                            </ul>
                            <ul className="mt-2 space-y-1">
                              {opt.cons.map((c, i) => (
                                <li
                                  key={`${opt.id}-con-${i}`}
                                  className="flex gap-2 text-sm text-[#697386]"
                                >
                                  <span>•</span>
                                  <span>{c}</span>
                                </li>
                              ))}
                            </ul>
                            <span className="absolute bottom-4 right-4 rounded bg-[#fafbff] px-2 py-1 font-mono text-xs text-[#0a2540]">
                              {opt.score.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {decision.rationale && (
                      <p className="mt-4 rounded-lg bg-[#fafbff] p-4 text-sm italic text-[#697386]">
                        Why: {decision.rationale}
                      </p>
                    )}
                  </FadeIn>
                );
              })}
            </div>
          )}

          {actions.length > 0 && (
            <div className="border-b border-[#e3e8ee] p-6 lg:p-8">
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.08em] text-[#697386]">
                Actions
              </p>
              <div className="flex flex-col gap-4">
                {actions.map((a) => (
                  <FadeIn
                    key={`${a.action}-${a.started}-${a.finished}-${a.tx_hash ?? a.error ?? ""}`}
                    className="rounded-xl border border-[#e3e8ee] p-5 transition-shadow duration-200 hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      {a.started && !a.finished ? (
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#f7931a]"
                          aria-label="Executing"
                        />
                      ) : a.success === true ? (
                        <span
                          className="text-base text-emerald-600"
                          aria-hidden
                        >
                          ✓
                        </span>
                      ) : a.finished ? (
                        <span className="text-base text-red-500" aria-hidden>
                          ✗
                        </span>
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[#0a2540]">
                          {actionLabel(a.action)}
                        </p>
                        <p className="mt-1 text-sm text-[#425466]">
                          {a.rationale}
                        </p>
                        {a.tx_hash && a.explorer_url && (
                          <a
                            href={a.explorer_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1 font-mono text-sm text-[#0a2540] hover:text-[#f7931a]"
                          >
                            {shortHash(a.tx_hash)}
                            <span className="text-[#f7931a]" aria-hidden>
                              ↗
                            </span>
                          </a>
                        )}
                        {a.error && (
                          <p className="mt-2 text-sm text-red-600">
                            {friendlyActionError(a.action, a.error)}
                          </p>
                        )}
                        {a.action === "vote_gauge" &&
                          a.vote_token_id != null &&
                          a.vote_weight != null && (
                            <p className="mt-2 text-sm text-[#425466]">
                              veMEZO #{a.vote_token_id} on{" "}
                              {a.vote_gauge_name ?? "MUSD/BTC LP"} · weight{" "}
                              {(a.vote_weight / 1e18).toFixed(3)}
                            </p>
                          )}
                      </div>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          )}

          {explanation && (
            <FadeIn className="p-6 lg:p-8">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#697386]">
                Agent&apos;s explanation
              </p>
              <p className="mt-3 rounded-lg bg-[#fafbff] p-6 text-base leading-relaxed text-[#425466]">
                {explanation}
              </p>
            </FadeIn>
          )}

          {status === "error" && errorMessage && (
            <div className="border-t border-red-100 bg-red-50 p-4 text-sm text-red-700">
              {errorMessage}
            </div>
          )}
        </div>
      )}

    </section>
  );
}
