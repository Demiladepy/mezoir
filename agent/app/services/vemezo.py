"""
veMEZO service — wraps the Mezo testnet VeMEZO contract.
"""

import json
import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from web3 import Web3

from app.services.w3_poa import make_http_web3

load_dotenv()

# ---- Config ----
RPC_URL = os.getenv("MEZO_TESTNET_RPC_URL", "https://rpc.test.mezo.org")
CHAIN_ID = int(os.getenv("MEZO_TESTNET_CHAIN_ID", "31611"))
VEMEZO_PROXY = os.getenv("VEMEZO_PROXY_ADDRESS", "")
OPERATOR_PK = os.getenv("AGENT_OPERATOR_PRIVATE_KEY", "")
# Mezo MEZO ERC20 precompile (public address, not a secret).
MEZO_TOKEN_ADDRESS = "0x7b7C000000000000000000000000000000000001"

ERC20_APPROVE_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "spender", "type": "address"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"},
        ],
        "name": "approve",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
        "type": "function",
    }
]

# ---- ABI loading ----
ABI_PATH = Path(__file__).parent.parent / "abis" / "vemezo.json"
with open(ABI_PATH) as f:
    VEMEZO_ABI = json.load(f)


def _w3() -> Web3:
    """Build a Web3 client for Mezo testnet."""
    return make_http_web3(RPC_URL)


def _vemezo_contract(w3: Web3):
    return w3.eth.contract(address=Web3.to_checksum_address(VEMEZO_PROXY), abi=VEMEZO_ABI)


def _get_latest_token_id_mezo(w3: Web3, contract, owner: str) -> Optional[int]:
    try:
        bal = contract.functions.balanceOf(owner).call()
        if bal == 0:
            return None
        tid = int(contract.functions.ownerToNFTokenIdList(owner, bal - 1).call())
        return tid if tid != 0 else None
    except Exception:
        return None


def lock_mezo(amount_mezo: float, duration_days: int) -> dict:
    if not OPERATOR_PK:
        raise RuntimeError("AGENT_OPERATOR_PRIVATE_KEY is not set")

    w3 = _w3()
    account = w3.eth.account.from_key(OPERATOR_PK)
    contract = _vemezo_contract(w3)

    value_wei = w3.to_wei(amount_mezo, "ether")

    latest_block = w3.eth.get_block("latest")
    ts = int(latest_block["timestamp"])
    WEEK = 7 * 24 * 60 * 60
    # Next Thursday 00:00 UTC (week boundary from Unix epoch).
    next_epoch_start = ts + (WEEK - (ts % WEEK))
    epochs_to_lock = max(1, min(round(duration_days / 7), 208))
    unlock_time = next_epoch_start + (epochs_to_lock - 1) * WEEK

    duration_seconds = unlock_time - ts
    duration_seconds = min(duration_seconds, 208 * WEEK)
    print(
        f"DEBUG: ts={ts}, unlock_time={unlock_time}, "
        f"duration_seconds={duration_seconds}, "
        f"effective_days={duration_seconds / 86400:.2f}"
    )

    mezo_token = w3.eth.contract(
        address=Web3.to_checksum_address(MEZO_TOKEN_ADDRESS),
        abi=ERC20_APPROVE_ABI,
    )
    approve_tx = mezo_token.functions.approve(
        Web3.to_checksum_address(VEMEZO_PROXY), value_wei
    ).build_transaction(
        {
            "from": account.address,
            "nonce": w3.eth.get_transaction_count(account.address),
            "chainId": CHAIN_ID,
            "gas": 200_000,
            "gasPrice": w3.eth.gas_price,
        }
    )
    signed_approve = account.sign_transaction(approve_tx)
    approve_hash = w3.eth.send_raw_transaction(signed_approve.raw_transaction)
    w3.eth.wait_for_transaction_receipt(approve_hash, timeout=120)

    tx = contract.functions.createLock(value_wei, duration_seconds).build_transaction({
        "from": account.address,
        "nonce": w3.eth.get_transaction_count(account.address),
        "chainId": CHAIN_ID,
        "gas": 1_000_000,
        "gasPrice": w3.eth.gas_price,
    })

    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

    token_id = None
    try:
        deposits = contract.events.Deposit().process_receipt(receipt)
        if deposits:
            token_id = deposits[0]["args"]["tokenId"]
    except Exception:
        token_id = _get_latest_token_id_mezo(w3, contract, account.address)

    return {
        "tx_hash": tx_hash.hex(),
        "token_id": token_id,
        "block_number": receipt["blockNumber"],
    }


def set_allowed_manager_mezo(manager_address: str) -> dict:
    if not OPERATOR_PK:
        raise RuntimeError("AGENT_OPERATOR_PRIVATE_KEY is not set")

    w3 = _w3()
    account = w3.eth.account.from_key(OPERATOR_PK)
    contract = _vemezo_contract(w3)
    manager = Web3.to_checksum_address(manager_address)

    tx = contract.functions.setAllowedManager(manager).build_transaction({
        "from": account.address,
        "nonce": w3.eth.get_transaction_count(account.address),
        "chainId": CHAIN_ID,
        "gas": 600_000,
        "gasPrice": w3.eth.gas_price,
    })

    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    return {"tx_hash": tx_hash.hex(), "block_number": receipt["blockNumber"]}


def get_lock_info_mezo(token_id: int) -> dict:
    w3 = _w3()
    contract = _vemezo_contract(w3)

    owner: Optional[str] = None
    amount_wei: Optional[str] = None
    amount_mezo: Optional[float] = None
    unlock_time: Optional[int] = None
    voting_power_wei: Optional[str] = None

    try:
        o = contract.functions.ownerOf(token_id).call()
        owner = Web3.to_checksum_address(o)
    except Exception:
        pass

    try:
        locked_tuple = contract.functions.locked(token_id).call()
        if locked_tuple is not None and len(locked_tuple) >= 2:
            raw_amt = locked_tuple[0]
            amt_int = int(raw_amt)
            amount_wei = str(amt_int)
            unlock_time = int(locked_tuple[1])
            amount_mezo = amt_int / 1e18
    except Exception:
        pass

    try:
        vp = contract.functions.balanceOfNFT(token_id).call()
        voting_power_wei = str(int(vp))
    except Exception:
        pass

    return {
        "token_id": token_id,
        "owner": owner,
        "amount_wei": amount_wei,
        "amount_mezo": amount_mezo,
        "unlock_time": unlock_time,
        "voting_power_wei": voting_power_wei,
    }


def list_operator_positions_mezo(operator_address: str | None = None) -> list[dict]:
    try:
        addr_in = operator_address or os.environ.get("AGENT_OPERATOR_ADDRESS", "")
        if not addr_in:
            print("list_operator_positions_mezo: missing operator address")
            return []

        w3 = _w3()
        contract = _vemezo_contract(w3)
        owner = Web3.to_checksum_address(addr_in)

        positions: list[dict] = []
        for i in range(250):
            try:
                token_id = int(
                    contract.functions.ownerToNFTokenIdList(owner, i).call()
                )
            except Exception:
                break
            if token_id == 0:
                break
            try:
                locked = contract.functions.locked(token_id).call()
                amount_int = int(locked[0])
                unlock_time = int(locked[1])
                positions.append(
                    {
                        "token_id": token_id,
                        "amount_wei": str(amount_int),
                        "amount_mezo": amount_int / 1e18,
                        "unlock_time": unlock_time,
                    }
                )
            except Exception as e:
                print(f"locked read failed for token {token_id}: {e}")
                continue
        return positions
    except Exception as e:
        print(f"list_operator_positions_mezo failed: {e}")
        return []


def extend_unlock_mezo(token_id: int, new_unlock_time: int) -> dict:
    try:
        has_fn = any(
            item.get("type") == "function" and item.get("name") == "increaseUnlockTime"
            for item in VEMEZO_ABI
            if isinstance(item, dict)
        )
        if not has_fn:
            print("extend_unlock_mezo warning: increaseUnlockTime not present in ABI")
            raise RuntimeError(
                "MockVeMEZO does not support extend_unlock_mezo — use lock_mezo path."
            )

        if not OPERATOR_PK:
            raise RuntimeError("AGENT_OPERATOR_PRIVATE_KEY is not set")

        w3 = _w3()
        account = w3.eth.account.from_key(OPERATOR_PK)
        contract = _vemezo_contract(w3)
        tx = contract.functions.increaseUnlockTime(
            int(token_id), int(new_unlock_time)
        ).build_transaction(
            {
                "from": account.address,
                "nonce": w3.eth.get_transaction_count(account.address),
                "chainId": CHAIN_ID,
                "gas": 600_000,
                "gasPrice": w3.eth.gas_price,
            }
        )
        signed = account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        return {"tx_hash": tx_hash.hex(), "block_number": receipt["blockNumber"]}
    except RuntimeError:
        raise
    except Exception as e:
        raise RuntimeError(f"extend_unlock_mezo failed: {e}") from e
