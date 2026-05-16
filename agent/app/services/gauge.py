import json
import os
from pathlib import Path

from dotenv import load_dotenv
from web3 import Web3

from app.services.w3_poa import make_http_web3

load_dotenv()

RPC_URL = os.getenv("MEZO_TESTNET_RPC_URL", "https://rpc.test.mezo.org")
CHAIN_ID = int(os.getenv("MEZO_TESTNET_CHAIN_ID", "31611"))
GAUGE_ADDRESS = os.getenv("GAUGE_ADDRESS", "")
OPERATOR_PK = os.getenv("AGENT_OPERATOR_PRIVATE_KEY", "")

ABI_PATH = Path(__file__).parent.parent / "abis" / "gauge.json"
with open(ABI_PATH) as f:
    GAUGE_ABI = json.load(f)


def _w3() -> Web3:
    return make_http_web3(RPC_URL)


def _gauge_contract(w3: Web3):
    if not GAUGE_ADDRESS:
        raise RuntimeError("GAUGE_ADDRESS is not set")
    return w3.eth.contract(address=Web3.to_checksum_address(GAUGE_ADDRESS), abi=GAUGE_ABI)


def cast_vote(token_id: int, weight: int) -> dict:
    if not OPERATOR_PK:
        raise RuntimeError("AGENT_OPERATOR_PRIVATE_KEY is not set")
    w3 = _w3()
    account = w3.eth.account.from_key(OPERATOR_PK)
    contract = _gauge_contract(w3)

    tx = contract.functions.vote(int(token_id), int(weight)).build_transaction(
        {
            "from": account.address,
            "nonce": w3.eth.get_transaction_count(account.address),
            "chainId": CHAIN_ID,
            "gas": 400_000,
            "gasPrice": w3.eth.gas_price,
        }
    )
    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    return {"tx_hash": tx_hash.hex(), "block_number": receipt["blockNumber"]}


def get_gauge_state() -> dict:
    if not GAUGE_ADDRESS:
        return {
            "gauge_name": None,
            "vemezo_address": None,
            "total_votes": 0,
        }
    w3 = _w3()
    contract = _gauge_contract(w3)
    try:
        gauge_name = contract.functions.name().call()
    except Exception:
        gauge_name = None
    try:
        vemezo_address = contract.functions.veMEZO().call()
    except Exception:
        vemezo_address = None
    try:
        total_votes = int(contract.functions.totalVotes().call())
    except Exception:
        total_votes = None

    return {
        "gauge_name": gauge_name,
        "vemezo_address": vemezo_address,
        "total_votes": total_votes,
    }


def get_vote_for_token(token_id: int) -> int:
    """Returns the weight this tokenId has voted with on the gauge. 0 if no vote."""
    if not GAUGE_ADDRESS:
        return 0
    w3 = _w3()
    contract = _gauge_contract(w3)
    try:
        return int(contract.functions.votes(int(token_id)).call())
    except Exception:
        return 0
