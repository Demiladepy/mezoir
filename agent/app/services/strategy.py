import os

from app.services import llm
from app.services.intent import Intent

PROFILE_PARAMS = {
    "btc_heavy": (90, "Maximizing BTC-denominated yield via long lock"),
    "mezo_heavy": (30, "Minimal BTC lock to qualify for veNFT, MEZO side will dominate"),
    "balanced": (60, "Balanced lock duration for both fee and voting yield"),
    "defensive": (30, "Minimum lock duration for low risk and quick exit"),
}


def select_actions(intent: Intent, amount_btc: float) -> list[dict]:
    days, lock_rationale = PROFILE_PARAMS.get(intent.profile, (60, "Default balanced strategy"))
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

    system = """You explain DeFi agent decisions in 1-2 sentences for a non-technical user.
Be specific about WHY this action makes sense given the user's intent.
Use plain English. Mention concrete numbers (lock days, BTC amount) when relevant.
Do NOT use markdown or bullets. Just sentences."""

    user = f"""User intent: {intent.raw} (profile: {intent.profile}, priority: {intent.priority})
Action being taken: {action['type']}
Action params: {action['params']}
Context: {context}
Original short rationale: {action.get('rationale', '')}

Write a more specific 1-2 sentence rationale."""

    try:
        return llm.complete(system, user, max_tokens=200).strip()
    except Exception:
        return action.get("rationale", "")
