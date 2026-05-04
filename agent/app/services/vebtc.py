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

load_dotenv()
from web3.middleware import ExtraDataToPOAMiddleware

# ---- Config ----
RPC_URL = os.getenv("MEZO_TESTNET_RPC_URL", "https://rpc.test.mezo.org")
CHAIN_ID = int(os.getenv("MEZO_TESTNET_CHAIN_ID", "31611"))
VEBTC_PROXY = os.getenv("VEBTC_PROXY_ADDRESS", "0xB63fcCd03521Cf21907627bd7fA465C129479231")
BTC_TOKEN_ADDRESS = "0x7b7C000000000000000000000000000000000000"
OPERATOR_PK = os.getenv("AGENT_OPERATOR_PRIVATE_KEY", "")

# ---- ABI loading ----
ABI_PATH = Path(__file__).parent.parent / "abis" / "vebtc.json"
with open(ABI_PATH) as f:
    VEBTC_ABI = json.load(f)

ERC20_APPROVE_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "spender", "type": "address"},
            {"internalType": "uint256", "name": "value", "type": "uint256"},
        ],
        "name": "approve",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
        "type": "function",
    }
]


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
    """Lock BTC into veBTC. Approve BTC precompile, then call createLock with absolute unlock timestamp."""
    if not OPERATOR_PK:
        raise RuntimeError("AGENT_OPERATOR_PRIVATE_KEY is not set")

    w3 = _w3()
    account = w3.eth.account.from_key(OPERATOR_PK)
    contract = _vebtc_contract(w3)

    value_wei = w3.to_wei(amount_btc, "ether")

    latest_block = w3.eth.get_block("latest")
    WEEK = 7 * 24 * 60 * 60
    raw_unlock = latest_block["timestamp"] + (duration_days * 24 * 60 * 60)
    # Round to nearest week boundary - matches contract's internal floor division
    # Use floor + WEEK to guarantee we're above the requested duration after rounding
    unlock_time = (raw_unlock // WEEK) * WEEK + WEEK

    # Step 1: approve the veBTC contract to pull BTC via the precompile
    btc_token = w3.eth.contract(
        address=Web3.to_checksum_address(BTC_TOKEN_ADDRESS),
        abi=ERC20_APPROVE_ABI,
    )
    approve_tx = btc_token.functions.approve(
        Web3.to_checksum_address(VEBTC_PROXY),
        value_wei,
    ).build_transaction({
        "from": account.address,
        "nonce": w3.eth.get_transaction_count(account.address),
        "chainId": CHAIN_ID,
        "gas": 200_000,
        "gasPrice": w3.eth.gas_price,
    })
    signed_approve = account.sign_transaction(approve_tx)
    approve_hash = w3.eth.send_raw_transaction(signed_approve.raw_transaction)
    w3.eth.wait_for_transaction_receipt(approve_hash, timeout=120)

    # Step 2: createLock with ABSOLUTE unlock timestamp (not duration)
    tx = contract.functions.createLock(value_wei, unlock_time).build_transaction({
        "from": account.address,
        "nonce": w3.eth.get_transaction_count(account.address),
        "chainId": CHAIN_ID,
        "gas": 3_000_000,
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


def set_allowed_manager(token_id: int, manager_address: str) -> dict:
    """
    Call setAllowedManager on veBTC. The contract only takes the manager address;
    it applies to the caller's NFT (operator must own the position). token_id is
    accepted for API symmetry with HTTP routes; it is not sent on-chain.
    """
    _ = token_id  # reserved for future validation / logging
    if not OPERATOR_PK:
        raise RuntimeError("AGENT_OPERATOR_PRIVATE_KEY is not set")

    w3 = _w3()
    account = w3.eth.account.from_key(OPERATOR_PK)
    contract = _vebtc_contract(w3)
    manager = Web3.to_checksum_address(manager_address)

    tx = contract.functions.set_allowed_manager(manager).build_transaction({
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


def get_lock_info(token_id: int) -> dict:
    """Read owner, lock schedule, and voting power for a veNFT. Failed reads are None."""
    w3 = _w3()
    contract = _vebtc_contract(w3)
    addr = Web3.to_checksum_address(VEBTC_PROXY)

    owner: Optional[str] = None
    amount: Optional[str] = None
    unlock_time: Optional[int] = None
    voting_power: Optional[str] = None

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
            amount = str(int(locked_tuple[0]))
            unlock_time = int(locked_tuple[1])
        except Exception:
            pass

    try:
        vp = contract.functions.balance_of_nft(token_id).call()
        voting_power = str(int(vp))
    except Exception:
        pass

    return {
        "token_id": token_id,
        "owner": owner,
        "amount": amount,
        "unlock_time": unlock_time,
        "voting_power": voting_power,
    }