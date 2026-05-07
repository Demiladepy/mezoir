from app.services import vebtc


def build_action_context(action: dict, intent_dict: dict) -> dict:
    """
    Build the context dict passed to the LLM for rationale generation.
    """
    snap = vebtc.read_chain_snapshot()

    block_ts = snap.get("block_timestamp")
    btc_oldest_unlock = snap.get("operator_oldest_unlock_time")
    btc_count = int(snap.get("operator_position_count") or 0)
    btc_total = float(snap.get("operator_total_locked_btc") or 0.0)
    mezo_oldest_unlock = snap.get("mezo_oldest_unlock_time")
    mezo_count = int(snap.get("mezo_position_count") or 0)
    mezo_total = float(snap.get("mezo_total_locked") or 0.0)

    action_type = action.get("type")

    if btc_count == 0 and mezo_count == 0:
        lock_summary_text = "User has no existing positions yet"
    elif btc_count > 0 and mezo_count == 0:
        if isinstance(block_ts, int) and isinstance(btc_oldest_unlock, int):
            seconds = max(btc_oldest_unlock - block_ts, 0)
            days = seconds // 86400
            lock_summary_text = (
                f"User holds {btc_count} positions totaling "
                f"{btc_total:.6f} BTC, oldest unlocks in {days} days"
            )
        else:
            lock_summary_text = (
                f"User holds {btc_count} positions totaling "
                f"{btc_total:.6f} BTC"
            )
    elif btc_count == 0 and mezo_count > 0:
        if isinstance(block_ts, int) and isinstance(mezo_oldest_unlock, int):
            seconds = max(mezo_oldest_unlock - block_ts, 0)
            days = seconds // 86400
            lock_summary_text = (
                f"User holds {mezo_count} veMEZO positions totaling "
                f"{mezo_total:.6f} MEZO, oldest unlocks in {days} days"
            )
        else:
            lock_summary_text = (
                f"User holds {mezo_count} veMEZO positions totaling "
                f"{mezo_total:.6f} MEZO"
            )
    else:
        lock_summary_text = (
            f"User holds {btc_count} veBTC positions ({btc_total:.6f} BTC) and "
            f"{mezo_count} veMEZO positions ({mezo_total:.6f} MEZO)"
        )

    if action_type in {"lock_mezo", "extend_unlock_mezo"}:
        lock_summary_text = (
            f"veMEZO focus: {mezo_count} positions, {mezo_total:.6f} MEZO locked. "
            f"{lock_summary_text}"
        )
    elif action_type in {"lock_btc", "extend_unlock"}:
        lock_summary_text = (
            f"veBTC focus: {btc_count} positions, {btc_total:.6f} BTC locked. "
            f"{lock_summary_text}"
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
