from typing import TypedDict

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field

from app.services import vebtc
from app.services.intent import parse_intent_llm
from app.services.strategy import explain_plan, generate_rationale_llm, select_actions

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


@app.post("/agent/execute")
def execute_endpoint(body: ExecuteRequest):
    parsed = parse_intent_llm(body.intent)
    actions = select_actions(parsed, body.amount_btc)
    results: list[dict] = []
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
                ctx = {
                    "tx_hash": details.get("tx_hash"),
                    "block_number": details.get("block_number"),
                }
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
                enriched = generate_rationale_llm(
                    action,
                    parsed,
                    {"tx_hash": None, "block_number": None, "error": str(e)},
                )
                if enriched:
                    fail_entry["rationale"] = enriched
            except Exception:
                pass
            results.append(fail_entry)
    explanation = explain_plan(actions, parsed)
    return {
        "intent_parsed": parsed.model_dump(),
        "actions_taken": results,
        "explanation": explanation,
    }
