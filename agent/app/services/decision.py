from typing import TypedDict

from app.services import llm


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
    btc_amount: float,
    mezo_amount: float,
    chain_snapshot: dict,
    btc_days: int,
    mezo_days: int,
) -> list[Option]:
    mezo_amount = mezo_amount or 0.001
    block_ts = chain_snapshot.get("block_timestamp")
    options: list[Option] = []

    btc_count = int(chain_snapshot.get("operator_position_count") or 0)
    btc_oldest_unlock = chain_snapshot.get("operator_oldest_unlock_time")
    btc_newest_unlock = chain_snapshot.get("operator_newest_unlock_time")
    btc_newest_token_id = chain_snapshot.get("operator_newest_token_id")

    mezo_count = int(chain_snapshot.get("mezo_position_count") or 0)
    mezo_oldest_unlock = chain_snapshot.get("mezo_oldest_unlock_time")
    mezo_newest_unlock = chain_snapshot.get("mezo_newest_unlock_time")
    mezo_newest_token_id = chain_snapshot.get("mezo_newest_token_id")

    if btc_days > 0:
        lock_score = 0.6
        if btc_count == 0:
            lock_score += 0.2
        if (
            isinstance(btc_oldest_unlock, int)
            and isinstance(btc_newest_unlock, int)
            and abs(btc_newest_unlock - btc_oldest_unlock) <= 7 * 86400
        ):
            lock_score += 0.1
        if btc_count >= 5:
            lock_score -= 0.05
        options.append(
            {
                "id": "lock_new_btc",
                "label": f"Create a new {btc_amount:.6f} BTC lock for {btc_days} days",
                "action": {
                    "type": "lock_btc",
                    "params": {"amount_btc": btc_amount, "duration_days": btc_days},
                    "rationale": "Create a new veBTC position aligned to your BTC profile.",
                },
                "pros": ["Diversifies expiry timing", f"Adds {btc_amount:.6f} BTC to position"],
                "cons": [f"Adds a {btc_count + 1}th position", "Creates more positions to manage"],
                "score": max(min(lock_score, 1.0), 0.0),
            }
        )

        if btc_count > 0 and isinstance(btc_newest_unlock, int):
            extend_score = 0.6
            days_left = _remaining_days(chain_snapshot, btc_newest_unlock)
            if isinstance(days_left, int) and days_left < 7:
                extend_score += 0.15
            if btc_count in (1, 2):
                extend_score += 0.1
            desired_unlock = (
                int(block_ts) + (btc_days * 86400)
                if isinstance(block_ts, int)
                else btc_newest_unlock
            )
            max_unlock = btc_newest_unlock + (28 * 86400)
            new_unlock = min(desired_unlock, max_unlock)
            if desired_unlock > max_unlock:
                extend_score -= 0.1
            token_id = int(btc_newest_token_id if btc_newest_token_id is not None else -1)
            options.append(
                {
                    "id": f"extend_btc_pos_{token_id}",
                    "label": f"Extend unlock for veBTC position #{token_id}",
                    "action": {
                        "type": "extend_unlock",
                        "params": {"token_id": token_id, "new_unlock_time": int(new_unlock)},
                        "rationale": "Reuse existing veBTC position to avoid fragmentation.",
                    },
                    "pros": [
                        "Reuses existing NFT, no new position",
                        f"Position #{token_id} currently has {days_left if days_left is not None else 'unknown'} days left",
                    ],
                    "cons": ["Concentrates exposure in one position", "Cannot extend past 28-day max"],
                    "score": max(min(extend_score, 1.0), 0.0),
                }
            )

    if mezo_days > 0:
        lock_score = 0.6
        if mezo_count == 0:
            lock_score += 0.2
        if (
            isinstance(mezo_oldest_unlock, int)
            and isinstance(mezo_newest_unlock, int)
            and abs(mezo_newest_unlock - mezo_oldest_unlock) <= 7 * 86400
        ):
            lock_score += 0.1
        if mezo_count >= 5:
            lock_score -= 0.05
        options.append(
            {
                "id": "lock_new_mezo",
                "label": f"Create a new {mezo_amount:.6f} MEZO lock for {mezo_days} days",
                "action": {
                    "type": "lock_mezo",
                    "params": {"amount_mezo": mezo_amount, "duration_days": mezo_days},
                    "rationale": "Create a veMEZO lock to increase governance weight.",
                },
                "pros": ["Improves long-duration voting boost", f"Adds {mezo_amount:.6f} MEZO to position"],
                "cons": [f"Adds a {mezo_count + 1}th MEZO position", "Creates more MEZO positions to manage"],
                "score": max(min(lock_score, 1.0), 0.0),
            }
        )

        if mezo_count > 0 and isinstance(mezo_newest_unlock, int):
            extend_score = 0.6
            days_left = _remaining_days(chain_snapshot, mezo_newest_unlock)
            if isinstance(days_left, int) and days_left < 7:
                extend_score += 0.15
            if mezo_count in (1, 2):
                extend_score += 0.1
            desired_unlock = (
                int(block_ts) + (mezo_days * 86400)
                if isinstance(block_ts, int)
                else mezo_newest_unlock
            )
            max_unlock = mezo_newest_unlock + (4 * 365 * 86400)
            new_unlock = min(desired_unlock, max_unlock)
            if desired_unlock > max_unlock:
                extend_score -= 0.1
            token_id = int(mezo_newest_token_id if mezo_newest_token_id is not None else -1)
            options.append(
                {
                    "id": f"extend_mezo_pos_{token_id}",
                    "label": f"Extend unlock for veMEZO position #{token_id}",
                    "action": {
                        "type": "extend_unlock_mezo",
                        "params": {"token_id": token_id, "new_unlock_time": int(new_unlock)},
                        "rationale": "Extend existing veMEZO lock to avoid spreading voting power.",
                    },
                    "pros": [
                        "Reuses existing NFT, no new position",
                        f"Position #{token_id} currently has {days_left if days_left is not None else 'unknown'} days left",
                    ],
                    "cons": ["Concentrates exposure in one position", "Cannot extend past 4-year max"],
                    "score": max(min(extend_score, 1.0), 0.0),
                }
            )

    return options


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
