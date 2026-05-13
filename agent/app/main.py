import asyncio
import json
import os
from datetime import datetime, timezone
from typing import TypedDict

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field

from app.services import gauge, goldsky, vebtc, vemezo
from app.services.context import build_action_context
from app.services.intent import parse_intent_llm
from app.services.strategy import (
    explain_plan,
    generate_rationale_llm,
    select_actions,
    select_actions_with_decisions,
)

load_dotenv()

app = FastAPI(title="Mezoir Agent Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3004",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _explorer_tx_url(tx_hash: str) -> str:
    if tx_hash.startswith("0x"):
        return f"https://explorer.test.mezo.org/tx/{tx_hash}"
    return f"https://explorer.test.mezo.org/tx/0x{tx_hash}"


class EchoState(TypedDict):
    text: str
    response: str


class LockBtcRequest(BaseModel):
    amount_btc: float = Field(..., gt=0, description="Amount of BTC to lock")
    duration_days: int = Field(
        ..., gt=0, le=4 * 365, description="Lock duration in days"
    )


class LockBtcResponse(BaseModel):
    tx_hash: str
    token_id: int | None
    block_number: int
    explorer_url: str


class LockMezoRequest(BaseModel):
    amount_mezo: float = Field(..., gt=0, description="Amount of MEZO to lock")
    duration_days: int = Field(
        ..., gt=0, le=4 * 365, description="Lock duration in days"
    )


class LockMezoResponse(BaseModel):
    tx_hash: str
    token_id: int | None
    block_number: int
    explorer_url: str


class SetAllowedManagerRequest(BaseModel):
    manager_address: str = Field(..., min_length=1)


class SetAllowedManagerResponse(BaseModel):
    tx_hash: str
    block_number: int
    explorer_url: str


class ExecuteRequest(BaseModel):
    intent: str = Field(..., min_length=1)
    amount_btc: float = Field(..., gt=0)


def echo_node(state: EchoState) -> EchoState:
    return {"text": state["text"], "response": state["text"]}


graph = StateGraph(EchoState)
graph.add_node("echo", echo_node)
graph.set_entry_point("echo")
graph.add_edge("echo", END)
echo_flow = graph.compile()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/echo")
def echo(payload: dict[str, str]) -> dict[str, str]:
    text = payload.get("text", "")
    result = echo_flow.invoke({"text": text, "response": ""})
    return {"response": result["response"]}


@app.post("/agent/lock_btc", response_model=LockBtcResponse)
def lock_btc_endpoint(req: LockBtcRequest):
    """
    First end-to-end action.
    Locks BTC into veBTC on Mezo testnet via the agent's operator wallet.
    """
    try:
        result = vebtc.lock_btc(req.amount_btc, req.duration_days)
        return LockBtcResponse(
            tx_hash=result["tx_hash"],
            token_id=result["token_id"],
            block_number=result["block_number"],
            explorer_url=f"https://explorer.test.mezo.org/tx/{result['tx_hash']}",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/agent/lock_mezo", response_model=LockMezoResponse)
def lock_mezo_endpoint(req: LockMezoRequest):
    try:
        result = vemezo.lock_mezo(req.amount_mezo, req.duration_days)
        return LockMezoResponse(
            tx_hash=result["tx_hash"],
            token_id=result["token_id"],
            block_number=result["block_number"],
            explorer_url=f"https://explorer.test.mezo.org/tx/{result['tx_hash']}",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/agent/balance/{address}")
def balance_endpoint(address: str):
    return {"address": address, "vebtc_count": vebtc.get_balance(address)}


@app.post("/agent/set_allowed_manager", response_model=SetAllowedManagerResponse)
def set_allowed_manager_endpoint(req: SetAllowedManagerRequest):
    try:
        result = vebtc.set_allowed_manager(req.manager_address)
        return SetAllowedManagerResponse(
            tx_hash=result["tx_hash"],
            block_number=result["block_number"],
            explorer_url=_explorer_tx_url(result["tx_hash"]),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/agent/lock/{token_id}")
def lock_info_endpoint(token_id: int):
    return vebtc.get_lock_info(token_id)


@app.get("/agent/lock_mezo/{token_id}")
def lock_info_mezo_endpoint(token_id: int):
    return vemezo.get_lock_info_mezo(token_id)


@app.get("/agent/dashboard")
async def get_dashboard():
    operator = os.getenv("AGENT_OPERATOR_ADDRESS", "").strip()
    if operator:
        try:
            dash = await asyncio.to_thread(goldsky.try_dashboard_from_subgraph, operator)
            if dash is not None:
                gauge_state = await asyncio.to_thread(gauge.get_gauge_state)
                dash["gauge_total_votes_wei"] = str(gauge_state.get("total_votes", 0))
                for v in dash["active_votes"]:
                    v["gauge_name"] = gauge_state.get("gauge_name")
                print("dashboard via goldsky")
                return dash
        except Exception as e:
            print(f"dashboard goldsky failed: {e}")

    print("dashboard via rpc fallback")
    snapshot = await asyncio.to_thread(vebtc.read_chain_snapshot)
    gauge_state = await asyncio.to_thread(gauge.get_gauge_state)

    operator_votes: list[dict] = []
    mezo_count = snapshot.get("mezo_position_count", 0) or 0
    if mezo_count > 0:
        newest_id = snapshot.get("mezo_newest_token_id")
        if newest_id is not None:
            try:
                vote_weight = await asyncio.to_thread(gauge.get_vote_for_token, int(newest_id))
                if vote_weight > 0:
                    operator_votes.append(
                        {
                            "token_id": int(newest_id),
                            "weight_wei": str(vote_weight),
                            "gauge_name": gauge_state.get("gauge_name"),
                        }
                    )
            except Exception:
                pass

    return {
        "btc_positions": snapshot.get("operator_position_count", 0),
        "btc_total_locked": snapshot.get("operator_total_locked_btc", 0),
        "mezo_positions": snapshot.get("mezo_position_count", 0),
        "mezo_total_locked": snapshot.get("mezo_total_locked", 0),
        "active_votes": operator_votes,
        "gauge_total_votes_wei": str(gauge_state.get("total_votes", 0)),
        "operator_address": snapshot.get("operator_address"),
        "block_number": snapshot.get("block_number"),
    }


@app.post("/agent/execute")
def execute_endpoint(body: ExecuteRequest):
    parsed = parse_intent_llm(body.intent)
    chain_snapshot = vebtc.read_chain_snapshot()
    decision_pack = select_actions_with_decisions(parsed, body.amount_btc, chain_snapshot)
    actions = decision_pack["actions"]
    decisions = decision_pack["decisions"]
    results: list[dict] = []
    last_mezo_token_id = None
    for action in actions:
        atype = action["type"]
        rationale = action["rationale"]
        try:
            if atype == "lock_btc":
                p = action["params"]
                details = vebtc.lock_btc(
                    p["amount_btc"],
                    p["duration_days"],
                )
            elif atype == "extend_unlock":
                p = action["params"]
                try:
                    details = vebtc.extend_unlock(
                        p["token_id"],
                        p["new_unlock_time"],
                    )
                except Exception:
                    fallback = select_actions(parsed, body.amount_btc)[0]
                    fp = fallback["params"]
                    details = vebtc.lock_btc(
                        fp["amount_btc"],
                        fp["duration_days"],
                    )
            elif atype == "lock_mezo":
                p = action["params"]
                details = vemezo.lock_mezo(
                    p["amount_mezo"],
                    p["duration_days"],
                )
                last_mezo_token_id = details.get("token_id")
            elif atype == "set_allowed_manager_mezo":
                p = action["params"]
                details = vemezo.set_allowed_manager_mezo(p["manager_address"])
            elif atype == "extend_unlock_mezo":
                p = action["params"]
                try:
                    details = vemezo.extend_unlock_mezo(
                        p["token_id"],
                        p["new_unlock_time"],
                    )
                except Exception:
                    details = vemezo.lock_mezo(0.001, 365)
                last_mezo_token_id = details.get("token_id", p.get("token_id"))
            elif atype == "vote_gauge":
                p = dict(action["params"])
                if p.get("token_id") == "__POST_LOCK_MEZO__":
                    if last_mezo_token_id is None:
                        continue
                    p["token_id"] = last_mezo_token_id
                details = gauge.cast_vote(int(p["token_id"]), int(p["weight"]))
                gauge_state = gauge.get_gauge_state()
                details["gauge_name"] = gauge_state.get("gauge_name", "MUSD/BTC LP")
                details["token_id"] = int(p["token_id"])
                details["weight"] = int(p["weight"])
            elif atype == "set_allowed_manager":
                p = action["params"]
                details = vebtc.set_allowed_manager(p["manager_address"])
            else:
                continue
            tx_hash = details["tx_hash"]
            explorer_url = (
                "https://explorer.test.mezo.org/tx/0x"
                f"{tx_hash if not tx_hash.startswith('0x') else tx_hash[2:]}"
            )
            entry: dict = {
                "action": atype,
                "success": True,
                "tx_hash": tx_hash,
                "explorer_url": explorer_url,
                "rationale": rationale,
                "details": details,
            }
            try:
                ctx = build_action_context(action, parsed.model_dump())
                ctx["tx_hash"] = details.get("tx_hash")
                ctx["execution"] = {"block_number": details.get("block_number")}
                enriched = generate_rationale_llm(action, parsed, ctx)
                if enriched:
                    entry["rationale"] = enriched
            except Exception:
                pass
            results.append(entry)
        except Exception as e:
            fail_entry: dict = {
                "action": atype,
                "success": False,
                "error": str(e),
                "rationale": rationale,
            }
            try:
                ctx = build_action_context(action, parsed.model_dump())
                ctx["execution"] = {
                    "tx_hash": None,
                    "block_number": None,
                    "error": str(e),
                }
                enriched = generate_rationale_llm(
                    action,
                    parsed,
                    ctx,
                )
                if enriched:
                    fail_entry["rationale"] = enriched
            except Exception:
                pass
            results.append(fail_entry)
    explanation = explain_plan(actions, parsed)
    return {
        "intent_parsed": parsed.model_dump(),
        "chain_snapshot": chain_snapshot,
        "actions_taken": results,
        "decisions": decisions,
        "explanation": explanation,
    }


@app.get("/agent/execute_stream")
async def execute_stream_endpoint(intent: str, amount_btc: float):
    req = ExecuteRequest(intent=intent, amount_btc=amount_btc)

    def _sse(payload: dict) -> str:
        return f"data: {json.dumps(payload)}\n\n"

    def _ts() -> str:
        return datetime.now(timezone.utc).isoformat()

    async def stream():
        last_mezo_token_id = None
        yield _sse(
            {"type": "log", "timestamp": _ts(), "message": "Parsing intent..."}
        )
        await asyncio.sleep(0)

        parsed = parse_intent_llm(req.intent)
        yield _sse(
            {
                "type": "parsed_intent",
                "intent_parsed": parsed.model_dump(),
            }
        )
        await asyncio.sleep(0)

        yield _sse(
            {
                "type": "log",
                "timestamp": _ts(),
                "message": (
                    f"Classified as {parsed.profile} with {parsed.priority} priority"
                ),
            }
        )
        await asyncio.sleep(0)

        yield _sse(
            {"type": "log", "timestamp": _ts(), "message": "Reading chain state..."}
        )
        await asyncio.sleep(0)

        yield _sse(
            {
                "type": "log",
                "timestamp": _ts(),
                "message": "Reading on-chain positions...",
            }
        )
        await asyncio.sleep(0)

        snapshot = await asyncio.to_thread(vebtc.read_chain_snapshot)
        yield _sse({"type": "chain_snapshot", "snapshot": snapshot})
        await asyncio.sleep(0)

        pos_count = snapshot.get("operator_position_count")
        total_locked = snapshot.get("operator_total_locked_btc")
        try:
            pos_text = int(pos_count if pos_count is not None else 0)
        except Exception:
            pos_text = 0
        try:
            total_text = float(total_locked if total_locked is not None else 0.0)
        except Exception:
            total_text = 0.0
        yield _sse(
            {
                "type": "log",
                "timestamp": _ts(),
                "message": (
                    f"Found {pos_text} existing positions, {total_text:.4f} BTC locked total"
                ),
            }
        )
        await asyncio.sleep(0)

        w3 = vebtc._w3()
        latest_block = w3.eth.get_block("latest")
        operator = os.getenv("AGENT_OPERATOR_ADDRESS", "")
        yield _sse(
            {
                "type": "log",
                "timestamp": _ts(),
                "message": (
                    f"Connected to Mezo testnet, block {latest_block['number']} "
                    f"(operator {operator or 'not set'})"
                ),
            }
        )
        await asyncio.sleep(0)

        yield _sse(
            {
                "type": "log",
                "timestamp": _ts(),
                "message": "Considering action options...",
            }
        )
        await asyncio.sleep(0)

        decision_pack = select_actions_with_decisions(parsed, req.amount_btc, snapshot)
        decisions = decision_pack["decisions"]
        for d in decisions:
            options = d["options"]
            chosen = d["chosen"]
            rationale_d = d["rationale"]
            yield _sse(
                {
                    "type": "decision_options",
                    "step": d["step"],
                    "options": options,
                }
            )
            await asyncio.sleep(0)
            if len(options) > 0:
                yield _sse(
                    {
                        "type": "log",
                        "timestamp": _ts(),
                        "message": f"Option A: {options[0]['label']}",
                    }
                )
                await asyncio.sleep(0)
            if len(options) > 1:
                yield _sse(
                    {
                        "type": "log",
                        "timestamp": _ts(),
                        "message": f"Option B: {options[1]['label']}",
                    }
                )
                await asyncio.sleep(0)
            await asyncio.sleep(0.4)
            yield _sse(
                {
                    "type": "decision_made",
                    "step": d["step"],
                    "chosen_id": chosen["id"],
                    "rationale": rationale_d,
                    "scores": {o["id"]: o["score"] for o in options},
                }
            )
            await asyncio.sleep(0)
            yield _sse(
                {
                    "type": "log",
                    "timestamp": _ts(),
                    "message": f"Decision: {chosen['label']} ({rationale_d})",
                }
            )
            await asyncio.sleep(0)

        yield _sse(
            {
                "type": "log",
                "timestamp": _ts(),
                "message": f"Selecting actions for {parsed.profile} profile...",
            }
        )
        await asyncio.sleep(0)

        actions = decision_pack["actions"]
        yield _sse(
            {
                "type": "log",
                "timestamp": _ts(),
                "message": f"Plan: {len(actions)} actions to execute",
            }
        )
        await asyncio.sleep(0)

        for action in actions:
            atype = action["type"]
            rationale = action.get("rationale", "")

            yield _sse(
                {
                    "type": "action_start",
                    "action": atype,
                    "rationale": rationale,
                }
            )
            await asyncio.sleep(0)

            yield _sse(
                {
                    "type": "log",
                    "timestamp": _ts(),
                    "message": f"Executing {atype}...",
                }
            )
            await asyncio.sleep(0)

            try:
                if atype == "lock_btc":
                    p = action["params"]
                    details = vebtc.lock_btc(
                        amount_btc=p["amount_btc"],
                        duration_days=p["duration_days"],
                    )
                elif atype == "extend_unlock":
                    p = action["params"]
                    try:
                        details = vebtc.extend_unlock(
                            p["token_id"],
                            p["new_unlock_time"],
                        )
                    except Exception:
                        yield _sse(
                            {
                                "type": "log",
                                "timestamp": _ts(),
                                "message": "Extend not supported on mock — falling back to lock_new",
                            }
                        )
                        await asyncio.sleep(0)
                        fallback = select_actions(parsed, req.amount_btc)[0]
                        fp = fallback["params"]
                        details = vebtc.lock_btc(
                            amount_btc=fp["amount_btc"],
                            duration_days=fp["duration_days"],
                        )
                elif atype == "lock_mezo":
                    p = action["params"]
                    details = vemezo.lock_mezo(
                        amount_mezo=p["amount_mezo"],
                        duration_days=p["duration_days"],
                    )
                    last_mezo_token_id = details.get("token_id")
                elif atype == "set_allowed_manager_mezo":
                    p = action["params"]
                    details = vemezo.set_allowed_manager_mezo(p["manager_address"])
                elif atype == "extend_unlock_mezo":
                    p = action["params"]
                    try:
                        details = vemezo.extend_unlock_mezo(
                            p["token_id"],
                            p["new_unlock_time"],
                        )
                    except Exception:
                        yield _sse(
                            {
                                "type": "log",
                                "timestamp": _ts(),
                                "message": "Extend not supported on mock — falling back to lock_mezo",
                            }
                        )
                        await asyncio.sleep(0)
                        details = vemezo.lock_mezo(amount_mezo=0.001, duration_days=365)
                    last_mezo_token_id = details.get("token_id", p.get("token_id"))
                elif atype == "vote_gauge":
                    p = dict(action["params"])
                    if p.get("token_id") == "__POST_LOCK_MEZO__":
                        if last_mezo_token_id is None:
                            yield _sse(
                                {
                                    "type": "log",
                                    "timestamp": _ts(),
                                    "message": "No veMEZO position available to vote — skipping",
                                }
                            )
                            await asyncio.sleep(0)
                            continue
                        p["token_id"] = last_mezo_token_id
                    yield _sse(
                        {
                            "type": "log",
                            "timestamp": _ts(),
                            "message": f"Casting vote with veMEZO #{p['token_id']}...",
                        }
                    )
                    await asyncio.sleep(0)
                    details = await asyncio.to_thread(gauge.cast_vote, int(p["token_id"]), int(p["weight"]))
                    gauge_state = await asyncio.to_thread(gauge.get_gauge_state)
                    details["gauge_name"] = gauge_state.get("gauge_name", "MUSD/BTC LP")
                    details["token_id"] = int(p["token_id"])
                    details["weight"] = int(p["weight"])
                    yield _sse(
                        {
                            "type": "vote_cast",
                            "token_id": details["token_id"],
                            "weight": details["weight"],
                            "tx_hash": details["tx_hash"],
                            "explorer_url": _explorer_tx_url(details["tx_hash"]),
                            "gauge_name": details["gauge_name"],
                        }
                    )
                    await asyncio.sleep(0)
                elif atype == "set_allowed_manager":
                    p = action["params"]
                    details = vebtc.set_allowed_manager(p["manager_address"])
                else:
                    continue

                block_number = details.get("block_number")
                yield _sse(
                    {
                        "type": "log",
                        "timestamp": _ts(),
                        "message": f"Tx confirmed in block {block_number}",
                    }
                )
                await asyncio.sleep(0)

                tx_hash = details["tx_hash"]
                explorer_url = (
                    "https://explorer.test.mezo.org/tx/0x"
                    f"{tx_hash if not tx_hash.startswith('0x') else tx_hash[2:]}"
                )
                rationale_out = rationale
                try:
                    ctx = build_action_context(action, parsed.model_dump())
                    ctx["tx_hash"] = tx_hash
                    ctx["execution"] = {"block_number": block_number}
                    enriched = generate_rationale_llm(action, parsed, ctx)
                    if enriched:
                        rationale_out = enriched
                except Exception:
                    pass
                yield _sse(
                    {
                        "type": "action_result",
                        "action": atype,
                        "success": True,
                        "tx_hash": tx_hash,
                        "explorer_url": explorer_url,
                        "rationale": rationale_out,
                    }
                )
                await asyncio.sleep(0)
            except Exception as e:
                err = str(e)
                yield _sse(
                    {
                        "type": "log",
                        "timestamp": _ts(),
                        "message": f"Action failed: {err}",
                    }
                )
                await asyncio.sleep(0)
                rationale_out = rationale
                try:
                    ctx = build_action_context(action, parsed.model_dump())
                    ctx["execution"] = {"tx_hash": None, "block_number": None, "error": err}
                    enriched = generate_rationale_llm(action, parsed, ctx)
                    if enriched:
                        rationale_out = enriched
                except Exception:
                    pass
                yield _sse(
                    {
                        "type": "action_result",
                        "action": atype,
                        "success": False,
                        "error": err,
                        "rationale": rationale_out,
                    }
                )
                await asyncio.sleep(0)

        explanation = explain_plan(actions, parsed)
        yield _sse({"type": "explanation", "text": explanation})
        await asyncio.sleep(0)
        yield _sse({"type": "done"})

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
