from typing import TypedDict

from app.services import llm, vebtc


class Option(TypedDict):
    id: str
    label: str
    action: dict
    pros: list[str]
    cons: list[str]
    score: float


def _remaining_days(chain_snapshot: dict, unlock_time: int | None) -> int | None:
    if unlock_time is None:
        return None
    ts = chain_snapshot.get("block_timestamp")
    if not isinstance(ts, int):
        return None
    return max(int((unlock_time - ts) // 86400), 0)


def generate_lock_options(
    intent_dict: dict,
    amount_btc: float,
    chain_snapshot: dict,
    target_duration_days: int,
) -> list[Option]:
    """
    Returns 2 options for how to gain veBTC exposure.
    If no existing positions, returns just [lock_new].
    """
    _ = intent_dict
    count = int(chain_snapshot.get("operator_position_count") or 0)
    oldest_unlock = chain_snapshot.get("operator_oldest_unlock_time")
    newest_unlock = chain_snapshot.get("operator_newest_unlock_time")
    newest_token_id = chain_snapshot.get("operator_newest_token_id")
    block_ts = chain_snapshot.get("block_timestamp")

    lock_score = 0.6
    if count == 0:
        lock_score += 0.2
    if (
        isinstance(oldest_unlock, int)
        and isinstance(newest_unlock, int)
        and abs(newest_unlock - oldest_unlock) <= 7 * 86400
    ):
        lock_score += 0.1
    if count >= 5:
        lock_score -= 0.05

    lock_option: Option = {
        "id": "lock_new",
        "label": f"Create a new {amount_btc:.6f} BTC lock for {target_duration_days} days",
        "action": {
            "type": "lock_btc",
            "params": {"amount_btc": amount_btc, "duration_days": target_duration_days},
            "rationale": "Create a new position to align with your target lock profile.",
        },
        "pros": [
            "Diversifies expiry timing",
            f"Adds {amount_btc:.6f} BTC to position",
        ],
        "cons": [
            f"Adds a {count + 1}th position",
            "Creates more positions to manage",
        ],
        "score": max(min(lock_score, 1.0), 0.0),
    }

    if count == 0:
        return [lock_option]

    extend_score = 0.6
    days_left = _remaining_days(chain_snapshot, newest_unlock if isinstance(newest_unlock, int) else None)
    if isinstance(days_left, int) and days_left < 7:
        extend_score += 0.15
    if count in (1, 2):
        extend_score += 0.1

    if not isinstance(newest_unlock, int):
        return [lock_option]

    desired_unlock = (
        int(block_ts) + (target_duration_days * 86400)
        if isinstance(block_ts, int)
        else newest_unlock
    )
    max_unlock = newest_unlock + (28 * 86400)
    new_unlock_time = min(desired_unlock, max_unlock)
    if desired_unlock > max_unlock:
        extend_score -= 0.1

    if newest_token_id is None:
        newest_token_id = -1

    extend_option: Option = {
        "id": f"extend_pos_{newest_token_id}",
        "label": f"Extend unlock time for position #{newest_token_id}",
        "action": {
            "type": "extend_unlock",
            "params": {"token_id": int(newest_token_id), "new_unlock_time": int(new_unlock_time)},
            "rationale": "Extend the most recent position to keep exposure concentrated.",
        },
        "pros": [
            "Reuses existing NFT, no new position",
            f"Position #{int(newest_token_id)} currently has {days_left if days_left is not None else 'unknown'} days left",
        ],
        "cons": [
            "Concentrates exposure in one position",
            "Cannot extend past 28-day max",
        ],
        "score": max(min(extend_score, 1.0), 0.0),
    }
    return [lock_option, extend_option]


def pick_option(options: list[Option]) -> Option:
    """Returns the highest-scoring option. Stable tiebreak by id."""
    return max(options, key=lambda o: (o["score"], o["id"]))


def explain_decision_llm(
    chosen: Option,
    considered: list[Option],
    intent_dict: dict,
    chain_snapshot: dict,
) -> str:
    """
    Produce a 1-2 sentence rationale for WHY this option was chosen.
    """
    alt = [o for o in considered if o["id"] != chosen["id"]]
    if not llm.is_available():
        if alt:
            return (
                f"{chosen['id']} chosen (score {chosen['score']:.2f}) over "
                f"{alt[0]['id']} (score {alt[0]['score']:.2f})."
            )
        return f"{chosen['id']} chosen (score {chosen['score']:.2f})."

    system = (
        "You explain a DeFi agent's decision in 1-2 sentences. "
        "Reference the specific numbers (position count, days remaining, scores) "
        "that drove the choice. Plain English, no markdown."
    )
    user = (
        f"Intent: {intent_dict}\n"
        f"Chain snapshot: {chain_snapshot}\n"
        f"Chosen option: {chosen}\n"
        f"Considered options: {considered}\n"
        "Explain why this option was selected."
    )
    try:
        return llm.complete(system, user, max_tokens=120).strip()
    except Exception:
        if alt:
            return (
                f"{chosen['id']} chosen (score {chosen['score']:.2f}) over "
                f"{alt[0]['id']} (score {alt[0]['score']:.2f})."
            )
        return f"{chosen['id']} chosen (score {chosen['score']:.2f})."
