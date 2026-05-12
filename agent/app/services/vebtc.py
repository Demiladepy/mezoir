"""
veBTC service — wraps the Mezo testnet VeBTC contract.

Architecture decision: the agent service is the source of truth.
The frontend calls this; this calls the chain.
"""

import json
import os
from pathlib import Path
from typing import Optional, TypedDict

from dotenv import load_dotenv
from web3 import Web3

from app.services import vemezo

load_dotenv()
from web3.middleware import ExtraDataToPOAMiddleware

# ---- Config ----
RPC_URL = os.getenv("MEZO_TESTNET_RPC_URL", "https://rpc.test.mezo.org")
CHAIN_ID = int(os.getenv("MEZO_TESTNET_CHAIN_ID", "31611"))
VEBTC_PROXY = os.getenv("VEBTC_PROXY_ADDRESS", "0xB63fcCd03521Cf21907627bd7fA465C129479231")
OPERATOR_PK = os.getenv("AGENT_OPERATOR_PRIVATE_KEY", "")
# Mezo BTC ERC20 precompile (public address, not a secret).
BTC_TOKEN_ADDRESS = "0x7b7C000000000000000000000000000000000000"

# ---- ABI loading ----
ABI_PATH = Path(__file__).parent.parent / "abis" / "vebtc.json"
with open(ABI_PATH) as f:
    VEBTC_ABI = json.load(f)

class LockResult(TypedDict):
    tx_hash: str
    token_id: Optional[int]
    block_number: int


def _w3() -> Web3:
    """Build a Web3 client for Mezo testnet."""
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    # Mezo is Cosmos SDK underneath. PoA middleware handles non-standard fields.
    w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
    return w3


def _vebtc_contract(w3: Web3):
    return w3.eth.contract(address=Web3.to_checksum_address(VEBTC_PROXY), abi=VEBTC_ABI)


def lock_btc(amount_btc: float, duration_days: int) -> LockResult:
    """Lock BTC into veBTC. Approve BTC token, then call createLock."""
    if not OPERATOR_PK:
        raise RuntimeError("AGENT_OPERATOR_PRIVATE_KEY is not set")

    w3 = _w3()
    account = w3.eth.account.from_key(OPERATOR_PK)
    contract = _vebtc_contract(w3)

    value_wei = w3.to_wei(amount_btc, "ether")

    latest_block = w3.eth.get_block("latest")
    ts = int(latest_block["timestamp"])
    week = 7 * 24 * 60 * 60
    raw_unlock = ts + int(duration_days) * 24 * 60 * 60
    # Keep unlock aligned to veBTC's week-based schedule.
    unlock_time = (raw_unlock // week) * week + week

    # Clamp to veBTC's hard max of 4 weeks (28 days).
    duration_seconds = min(unlock_time - ts, 4 * week)
    print(
        f"DEBUG: ts={ts}, unlock_time={unlock_time}, "
        f"duration_seconds={duration_seconds}, "
        f"effective_days={duration_seconds / 86400:.2f}"
    )

    # Approve veBTC to pull BTC via ERC20 transferFrom.
    erc20 = w3.eth.contract(
        address=Web3.to_checksum_address(BTC_TOKEN_ADDRESS),
        abi=[
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
        ],
    )

    approve_tx = erc20.functions.approve(
        Web3.to_checksum_address(VEBTC_PROXY), value_wei
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
        token_id = _get_latest_token_id(w3, contract, account.address)

    return LockResult(
        tx_hash=tx_hash.hex(),
        token_id=token_id,
        block_number=receipt["blockNumber"],
    )


def _get_latest_token_id(w3: Web3, contract, owner: str) -> Optional[int]:
    """Fallback: read most recently minted token by enumerating owner's NFTs."""
    try:
        bal = contract.functions.balanceOf(owner).call()
        if bal == 0:
            return None
        return contract.functions.tokenOfOwnerByIndex(owner, bal - 1).call()
    except Exception:
        return None


def get_balance(owner: str) -> int:
    """Return the number of veBTC NFTs held by an address."""
    w3 = _w3()
    contract = _vebtc_contract(w3)
    return contract.functions.balanceOf(Web3.to_checksum_address(owner)).call()


# Minimal ABI for `locked` when int128 amount encoding fails on-chain decode.
_LOCKED_UINT256_ABI = [
    {
        "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "name": "locked",
        "outputs": [
            {"internalType": "uint256", "name": "amount", "type": "uint256"},
            {"internalType": "uint256", "name": "end", "type": "uint256"},
        ],
        "stateMutability": "view",
        "type": "function",
    }
]


def set_allowed_manager(manager_address: str) -> dict:
    """
    Call setAllowedManager on veBTC. Account-level for msg.sender (operator key);
    not per-tokenId on-chain.
    """
    if not OPERATOR_PK:
        raise RuntimeError("AGENT_OPERATOR_PRIVATE_KEY is not set")

    w3 = _w3()
    account = w3.eth.account.from_key(OPERATOR_PK)
    contract = _vebtc_contract(w3)
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

    return {
        "tx_hash": tx_hash.hex(),
        "block_number": receipt["blockNumber"],
    }


def extend_unlock(token_id: int, new_unlock_time: int) -> dict:
    """
    Calls increaseUnlockTime(tokenId, newUnlockTime) on the veBTC contract.
    Same signing pattern as lock_btc. Returns {"tx_hash", "block_number"}.
    """
    try:
        has_fn = any(
            item.get("type") == "function" and item.get("name") == "increaseUnlockTime"
            for item in VEBTC_ABI
            if isinstance(item, dict)
        )
        if not has_fn:
            print("extend_unlock warning: increaseUnlockTime not present in ABI")
            raise RuntimeError(
                "MockVeBTC does not support extend_unlock — use lock_new path."
            )

        if not OPERATOR_PK:
            raise RuntimeError("AGENT_OPERATOR_PRIVATE_KEY is not set")

        w3 = _w3()
        account = w3.eth.account.from_key(OPERATOR_PK)
        contract = _vebtc_contract(w3)
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
        raise RuntimeError(f"extend_unlock failed: {e}") from e


def get_lock_info(token_id: int) -> dict:
    """Read ownerOf, locked, balanceOfNFT. Per-field failures become None; never raises."""
    w3 = _w3()
    contract = _vebtc_contract(w3)
    addr = Web3.to_checksum_address(VEBTC_PROXY)

    owner: Optional[str] = None
    amount_wei: Optional[str] = None
    amount_btc: Optional[float] = None
    unlock_time: Optional[int] = None
    voting_power_wei: Optional[str] = None

    try:
        o = contract.functions.owner_of(token_id).call()
        owner = Web3.to_checksum_address(o)
    except Exception:
        pass

    locked_tuple: Optional[tuple] = None
    try:
        locked_tuple = contract.functions.locked(token_id).call()
    except Exception:
        try:
            alt = w3.eth.contract(address=addr, abi=_LOCKED_UINT256_ABI)
            locked_tuple = alt.functions.locked(token_id).call()
        except Exception:
            pass

    if locked_tuple is not None and len(locked_tuple) >= 2:
        try:
            raw_amt = locked_tuple[0]
            amt_int = int(raw_amt)
            amount_wei = str(amt_int)
            unlock_time = int(locked_tuple[1])
            amount_btc = amt_int / 1e18
        except Exception:
            pass

    try:
        vp = contract.functions.balance_of_nft(token_id).call()
        voting_power_wei = str(int(vp))
    except Exception:
        pass

    return {
        "token_id": token_id,
        "owner": owner,
        "amount_wei": amount_wei,
        "amount_btc": amount_btc,
        "unlock_time": unlock_time,
        "voting_power_wei": voting_power_wei,
    }


def list_operator_positions(operator_address: str | None = None) -> list[dict]:
    """
    Return all veBTC positions owned by the operator wallet.
    Each position: {"token_id": int, "amount_wei": str, "amount_btc": float, "unlock_time": int}
    Reads via balanceOf + tokenOfOwnerByIndex + locked.
    Uses operator address from env if not passed.
    Returns empty list on any failure (don't raise).
    """
    try:
        addr_in = operator_address or os.environ.get("AGENT_OPERATOR_ADDRESS", "")
        if not addr_in:
            print("list_operator_positions: missing operator address")
            return []

        w3 = _w3()
        contract = _vebtc_contract(w3)
        owner = Web3.to_checksum_address(addr_in)

        balance = int(contract.functions.balanceOf(owner).call())
        count = min(balance, 50)

        positions: list[dict] = []
        for i in range(count):
            token_id = int(contract.functions.tokenOfOwnerByIndex(owner, i).call())
            locked = contract.functions.locked(token_id).call()
            amount_int = int(locked[0])
            unlock_time = int(locked[1])
            positions.append(
                {
                    "token_id": token_id,
                    "amount_wei": str(amount_int),
                    "amount_btc": amount_int / 1e18,
                    "unlock_time": unlock_time,
                }
            )
        return positions
    except Exception as e:
        print(f"list_operator_positions failed: {e}")
        return []


def read_chain_snapshot() -> dict:
    """
    Single read of relevant chain state for context-passing.
    """
    snapshot = {
        "block_number": None,
        "block_timestamp": None,
        "operator_address": None,
        "operator_position_count": None,
        "operator_total_locked_btc": None,
        "operator_oldest_unlock_time": None,
        "operator_newest_unlock_time": None,
        "operator_newest_token_id": None,
        "mezo_position_count": None,
        "mezo_total_locked": None,
        "mezo_oldest_unlock_time": None,
        "mezo_newest_unlock_time": None,
        "mezo_newest_token_id": None,
    }

    operator_address = os.environ.get("AGENT_OPERATOR_ADDRESS", "")
    try:
        if operator_address:
            snapshot["operator_address"] = Web3.to_checksum_address(operator_address)
    except Exception:
        snapshot["operator_address"] = operator_address or None

    try:
        w3 = _w3()
        block = w3.eth.get_block("latest")
        snapshot["block_number"] = int(block["number"])
        snapshot["block_timestamp"] = int(block["timestamp"])
    except Exception as e:
        print(f"read_chain_snapshot block read failed: {e}")

    positions = list_operator_positions(operator_address or None)
    try:
        snapshot["operator_position_count"] = len(positions)
    except Exception:
        snapshot["operator_position_count"] = None

    try:
        total_btc = sum(float(p.get("amount_btc", 0.0) or 0.0) for p in positions)
        snapshot["operator_total_locked_btc"] = total_btc
    except Exception:
        snapshot["operator_total_locked_btc"] = None

    try:
        unlocks = [
            int(p["unlock_time"])
            for p in positions
            if p.get("unlock_time") is not None
        ]
        snapshot["operator_oldest_unlock_time"] = min(unlocks) if unlocks else None
        snapshot["operator_newest_unlock_time"] = max(unlocks) if unlocks else None
    except Exception:
        snapshot["operator_oldest_unlock_time"] = None
        snapshot["operator_newest_unlock_time"] = None

    try:
        newest = max(
            positions,
            key=lambda p: int(p.get("unlock_time") or 0),
        ) if positions else None
        snapshot["operator_newest_token_id"] = (
            int(newest["token_id"]) if newest is not None else None
        )
    except Exception:
        snapshot["operator_newest_token_id"] = None

    try:
        mezo_positions = vemezo.list_operator_positions_mezo(operator_address or None)
        snapshot["mezo_position_count"] = len(mezo_positions)
    except Exception as e:
        print(f"read_chain_snapshot mezo positions failed: {e}")
        mezo_positions = []
        snapshot["mezo_position_count"] = None

    try:
        snapshot["mezo_total_locked"] = sum(
            float(p.get("amount_mezo", 0.0) or 0.0) for p in mezo_positions
        )
    except Exception:
        snapshot["mezo_total_locked"] = None

    try:
        mezo_unlocks = [
            int(p["unlock_time"])
            for p in mezo_positions
            if p.get("unlock_time") is not None
        ]
        snapshot["mezo_oldest_unlock_time"] = min(mezo_unlocks) if mezo_unlocks else None
        snapshot["mezo_newest_unlock_time"] = max(mezo_unlocks) if mezo_unlocks else None
    except Exception:
        snapshot["mezo_oldest_unlock_time"] = None
        snapshot["mezo_newest_unlock_time"] = None

    try:
        newest_mezo = (
            max(
                mezo_positions,
                key=lambda p: int(p.get("unlock_time") or 0),
            )
            if mezo_positions
            else None
        )
        snapshot["mezo_newest_token_id"] = (
            int(newest_mezo["token_id"]) if newest_mezo is not None else None
        )
    except Exception:
        snapshot["mezo_newest_token_id"] = None

    return snapshot