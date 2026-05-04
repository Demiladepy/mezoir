from typing import TypedDict

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field

from app.services import vebtc

load_dotenv()

app = FastAPI(title="Mezoir Agent Service")


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
