from app.services import vebtc


def build_action_context(action: dict, intent_dict: dict) -> dict:
    """
    Build the context dict passed to the LLM for rationale generation.
    """
    snap = vebtc.read_chain_snapshot()

    block_ts = snap.get("block_timestamp")
    oldest_unlock = snap.get("operator_oldest_unlock_time")
    pos_count = snap.get("operator_position_count")
    total_locked = snap.get("operator_total_locked_btc")

    if not pos_count:
        lock_summary_text = "User has no existing positions yet"
    elif isinstance(block_ts, int) and isinstance(oldest_unlock, int):
        seconds = max(oldest_unlock - block_ts, 0)
        days = seconds // 86400
        lock_summary_text = (
            f"User holds {pos_count} positions totaling "
            f"{float(total_locked or 0.0):.6f} BTC, oldest unlocks in {days} days"
        )
    else:
        lock_summary_text = (
            f"User holds {pos_count} positions totaling "
            f"{float(total_locked or 0.0):.6f} BTC"
        )

    return {
        "intent": {
            "raw": intent_dict.get("raw"),
            "profile": intent_dict.get("profile"),
            "priority": intent_dict.get("priority"),
        },
        "action": {
            "type": action.get("type"),
            "params": action.get("params", {}),
            "base_rationale": action.get("rationale", ""),
        },
        "chain_snapshot": snap,
        "lock_summary_text": lock_summary_text,
    }
