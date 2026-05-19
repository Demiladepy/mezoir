"""
Goldsky subgraph client for dashboard-style aggregates (optional; RPC fallback in main).
"""

import os
from typing import Any

import requests
from web3 import Web3

SUBGRAPH_URL = os.getenv("GOLDSKY_SUBGRAPH_URL", "").strip()


def try_dashboard_from_subgraph(operator_address: str) -> dict[str, Any] | None:
    """
    Query Goldsky for operator positions and recent votes. Returns a dict aligned with
    /agent/dashboard when successful; None if subgraph URL is unset or the query fails.
    """
    if not SUBGRAPH_URL or not operator_address:
        return None
    try:
        op = Web3.to_checksum_address(operator_address)
    except Exception:
        return None

    owner_var = op.lower()

    query = """
    query GetDashboard($owner: Bytes!) {
      _meta {
        block {
          number
        }
      }
      vePositions(where: { owner: $owner, active: true }) {
        contract
        tokenId
        amount
      }
      voteCasts(
        where: { voter: $owner }
        orderBy: timestamp
        orderDirection: desc
        first: 10
      ) {
        tokenId
        gauge
        weight
      }
    }
    """

    try:
        response = requests.post(
            SUBGRAPH_URL,
            json={"query": query, "variables": {"owner": owner_var}},
            timeout=15,
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()
        body = response.json()
        if body.get("errors"):
            return None
        data = body.get("data")
        if not isinstance(data, dict):
            return None

        meta = data.get("_meta") or {}
        block_info = meta.get("block") or {}
        block_raw = block_info.get("number")
        try:
            block_number = int(block_raw) if block_raw is not None else 0
        except (TypeError, ValueError):
            block_number = 0

        ve_positions = data.get("vePositions") or []
        vote_casts = data.get("voteCasts") or []

        btc_positions = [p for p in ve_positions if p.get("contract") == "veBTC"]
        mezo_positions = [p for p in ve_positions if p.get("contract") == "veMEZO"]

        def sum_amount(rows: list[dict[str, Any]]) -> float:
            total = 0
            for p in rows:
                try:
                    total += int(p.get("amount") or 0)
                except (TypeError, ValueError):
                    continue
            return total / 1e18

        active_votes: list[dict[str, Any]] = []
        for v in vote_casts:
            try:
                tid = v.get("tokenId")
                if tid is None:
                    continue
                active_votes.append(
                    {
                        "token_id": int(tid),
                        "weight_wei": str(v.get("weight") or "0"),
                        "gauge": v.get("gauge"),
                    }
                )
            except (TypeError, ValueError):
                continue

        return {
            "btc_positions": len(btc_positions),
            "btc_total_locked": sum_amount(btc_positions),
            "mezo_positions": len(mezo_positions),
            "mezo_total_locked": sum_amount(mezo_positions),
            "active_votes": active_votes,
            "gauge_total_votes_wei": "0",
            "operator_address": op,
            "block_number": block_number,
        }
    except Exception:
        return None


def get_recent_activity(limit: int = 5) -> dict[str, list[dict[str, Any]]]:
    """
    Query Goldsky subgraph for recent activity across the network.
    Returns recent locks (Deposit events) and recent votes.
    """
    if not SUBGRAPH_URL:
        return {"locks": [], "votes": []}

    query = """
    query GetRecentActivity($limit: Int!) {
      vePositions(first: $limit, orderBy: createdAt, orderDirection: desc, where: {active: true}) {
        id
        contract
        tokenId
        owner
        amount
        unlockTime
        createdAt
      }
      voteCasts(first: $limit, orderBy: timestamp, orderDirection: desc) {
        id
        tokenId
        gauge
        voter
        weight
        timestamp
      }
    }
    """

    try:
        response = requests.post(
            SUBGRAPH_URL,
            json={"query": query, "variables": {"limit": limit}},
            timeout=5,
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()
        body = response.json()
        if body.get("errors"):
            print(f"get_recent_activity graphql errors: {body.get('errors')}")
            return {"locks": [], "votes": []}
        data = body.get("data") or {}
        return {
            "locks": [
                {
                    "id": p["id"],
                    "contract": p["contract"],
                    "token_id": int(p["tokenId"]),
                    "owner": p["owner"],
                    "amount": float(int(p["amount"]) / 1e18),
                    "unlock_time": int(p["unlockTime"]),
                    "created_at": int(p["createdAt"]),
                }
                for p in data.get("vePositions", [])
            ],
            "votes": [
                {
                    "token_id": int(v["tokenId"]),
                    "gauge": v["gauge"],
                    "voter": v["voter"],
                    "weight": v["weight"],
                    "timestamp": int(v["timestamp"]),
                }
                for v in data.get("voteCasts", [])
            ],
        }
    except Exception as e:
        print(f"get_recent_activity failed: {e}")
        return {"locks": [], "votes": []}
