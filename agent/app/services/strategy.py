import os

from app.services.intent import Intent


def select_actions(intent: Intent, amount_btc: float) -> list[dict]:
    profile_days_rationale: dict[str, tuple[int, str]] = {
        "btc_heavy": (
            90,
            "Maximizing BTC-denominated yield via long lock",
        ),
        "mezo_heavy": (
            30,
            "Minimal BTC lock to qualify for veNFT, MEZO side will dominate",
        ),
        "balanced": (
            60,
            "Balanced lock duration for both fee and voting yield",
        ),
        "defensive": (
            30,
            "Minimum lock duration for low risk and quick exit",
        ),
    }
    days, lock_rationale = profile_days_rationale.get(
        intent.profile,
        profile_days_rationale["balanced"],
    )
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
            "rationale": (
                "Authorizing agent to manage the resulting position on user's behalf"
            ),
        },
    ]


def explain_plan(actions: list[dict], intent: Intent) -> str:
    lock = next((a for a in actions if a["type"] == "lock_btc"), None)
    days = lock["params"]["duration_days"] if lock else 0
    return (
        f"Your intent maps to the {intent.profile.replace('_', ' ')} profile with "
        f"a focus on {intent.priority.replace('_', ' ')}. "
        f"The plan locks BTC for {days} days, then grants the agent permission to "
        "manage the new veNFT on your behalf going forward."
    )
