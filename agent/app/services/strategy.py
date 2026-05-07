import os

from app.services import llm
from app.services.decision import (
    explain_decision_llm,
    generate_lock_options,
    pick_option,
)
from app.services.intent import Intent

PROFILE_PARAMS = {
    "btc_heavy": {
        "btc_days": 28,
        "mezo_days": 0,
        "rationale": "Maximizing BTC-denominated yield via long lock",
    },
    "mezo_heavy": {
        "btc_days": 7,
        "mezo_days": 730,
        "rationale": "Minimal BTC qualifier plus 2-year MEZO lock for max voting boost",
    },
    "balanced": {
        "btc_days": 14,
        "mezo_days": 365,
        "rationale": "Balanced exposure across both assets with moderate lock",
    },
    "defensive": {
        "btc_days": 7,
        "mezo_days": 0,
        "rationale": "Minimum BTC lock for low risk",
    },
}


def select_actions(intent: Intent, amount_btc: float) -> list[dict]:
    profile = PROFILE_PARAMS.get(
        intent.profile,
        {"btc_days": 14, "mezo_days": 0, "rationale": "Default balanced strategy"},
    )
    days = int(profile["btc_days"])
    lock_rationale = str(profile["rationale"])
    operator = os.environ.get("AGENT_OPERATOR_ADDRESS", "")
    return [
        {
            "type": "lock_btc",
            "params": {"amount_btc": amount_btc, "duration_days": days},
            "rationale": lock_rationale,
        },
        {
            "type": "set_allowed_manager",
            "params": {"manager_address": operator},
            "rationale": "Authorizing agent to manage the resulting veBTC position on user's behalf",
        },
    ]


def select_actions_with_decisions(
    intent: Intent,
    amount_btc: float,
    chain_snapshot: dict,
) -> dict:
    """
    Return decision records and final action list.
    """
    profile = PROFILE_PARAMS.get(
        intent.profile,
        {"btc_days": 14, "mezo_days": 0, "rationale": "Default balanced strategy"},
    )
    btc_days = int(profile["btc_days"])
    mezo_days = int(profile["mezo_days"])
    base_rationale = str(profile["rationale"])

    options = generate_lock_options(
        intent_dict=intent.model_dump(),
        btc_amount=amount_btc,
        mezo_amount=0.001,
        chain_snapshot=chain_snapshot,
        btc_days=btc_days,
        mezo_days=mezo_days,
    )
    chosen = pick_option(options)
    decision_rationale = explain_decision_llm(
        chosen=chosen,
        considered=options,
        intent_dict=intent.model_dump(),
        chain_snapshot=chain_snapshot,
    )

    operator = os.environ.get("AGENT_OPERATOR_ADDRESS", "")
    actions: list[dict] = []
    chosen_action = {**chosen["action"]}
    if "rationale" not in chosen_action:
        chosen_action["rationale"] = base_rationale
    actions.append(chosen_action)

    has_btc_action = chosen_action["type"] in {"lock_btc", "extend_unlock"}
    has_mezo_action = chosen_action["type"] in {"lock_mezo", "extend_unlock_mezo"}

    if has_btc_action:
        actions.append(
            {
                "type": "set_allowed_manager",
                "params": {"manager_address": operator},
                "rationale": "Authorizing agent to manage the resulting veBTC position on user's behalf",
            }
        )
    if has_mezo_action:
        actions.append(
            {
                "type": "set_allowed_manager_mezo",
                "params": {"manager_address": operator},
                "rationale": "Authorizing agent to manage the resulting veMEZO position on user's behalf",
            }
        )

    profile_name = intent.profile
    if has_mezo_action and profile_name in ("mezo_heavy", "balanced"):
        actions.append(
            {
                "type": "vote_gauge",
                "params": {
                    "token_id": "__POST_LOCK_MEZO__",
                    "weight": int(0.001 * 1e18),
                },
                "rationale": "Casting governance votes with the new veMEZO position to direct emissions and earn boosted rewards",
            }
        )
    return {
        "decisions": [
            {
                "step": "lock_choice",
                "options": options,
                "chosen": chosen,
                "rationale": decision_rationale,
            }
        ],
        "actions": actions,
    }


def explain_plan(actions: list[dict], intent: Intent) -> str:
    days = actions[0]["params"]["duration_days"] if actions else 0
    return (
        f"Based on your intent — {intent.profile.replace('_', ' ')} with {intent.priority} priority — "
        f"the agent will lock your BTC for {days} days, then register itself as the allowed manager "
        f"of the resulting position so it can vote, claim, and rebalance on your behalf."
    )


def generate_rationale_llm(action: dict, intent: Intent, context: dict) -> str:
    if not llm.is_available():
        return action.get("rationale", "")

    system = """You explain DeFi agent decisions in 2-4 sentences for a non-technical user.
Required style:
- Reference specific numbers from the user's chain state when relevant (positions held, total locked, days until unlock).
- Be specific to THIS user's situation, not generic veNFT facts.
- Use concrete language, not marketing speak. No "secures higher yield tiers" without saying which tier or why.
- Mention the action's tx confirmation status indirectly if a tx_hash is in context.
- Plain English, no markdown, no bullet points."""

    ctx_intent = context.get("intent", {})
    ctx_action = context.get("action", {})
    snap = context.get("chain_snapshot", {})
    profile = ctx_intent.get("profile", intent.profile)
    priority = ctx_intent.get("priority", intent.priority)
    action_type = ctx_action.get("type", action.get("type"))
    params_str = str(ctx_action.get("params", action.get("params", {})))
    base_rationale = ctx_action.get("base_rationale", action.get("rationale", ""))
    tx_hash = context.get("tx_hash")
    if tx_hash is None:
        tx_hash = context.get("execution", {}).get("tx_hash")
    block_number = snap.get("block_number")
    operator_address = snap.get("operator_address")
    position_count = snap.get("operator_position_count")
    total_locked = snap.get("operator_total_locked_btc")
    lock_summary_text = context.get("lock_summary_text", "No lock summary available")

    user = f'''User intent: "{ctx_intent.get("raw", intent.raw)}" (classified as {profile}, prioritizing {priority}).

Current chain state (read just now at block {block_number}):
- Operator wallet: {operator_address}
- Existing positions: {position_count} ({total_locked} BTC total)
- {lock_summary_text}

Action being taken:
- Type: {action_type}
- Parameters: {params_str}
- Base rationale (for context only, you should improve it): "{base_rationale}"
- Tx hash (if executed): {tx_hash or "not yet executed"}

Write a 2-4 sentence rationale grounded in the actual chain state above. Reference the user's existing position count or total locked when it's relevant. If the user has zero positions, say so. Do NOT invent numbers.'''

    try:
        return llm.complete(system, user, max_tokens=200).strip()
    except Exception:
        return action.get("rationale", "")
