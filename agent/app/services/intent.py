import json
import re

from pydantic import BaseModel

from app.services import llm


class Intent(BaseModel):
    raw: str
    profile: str  # btc_heavy | mezo_heavy | balanced | defensive | defensive_lock | yield_farmer | just_diversify
    priority: str  # "yield" | "safety" | "voting_returns"


def parse_intent(raw: str) -> Intent:
    text = raw.lower()
    # Order matters — check most specific first
    if any(
        w in text
        for w in [
            "yield farmer",
            "yield farming",
            "max yield",
            "maximum lock",
            "long lock",
        ]
    ):
        return Intent(raw=raw, profile="yield_farmer", priority="yield")
    if any(
        w in text
        for w in ["defensive lock", "conservative", "low risk", "safe"]
    ):
        return Intent(raw=raw, profile="defensive_lock", priority="safety")
    if any(w in text for w in ["diversify", "spread", "balanced exposure"]):
        return Intent(raw=raw, profile="just_diversify", priority="yield")
    if any(w in text for w in ["defensive", "park", "low risk", "safe"]):
        return Intent(raw=raw, profile="defensive", priority="safety")
    if "mezo" in text and "btc" not in text and "bitcoin" not in text:
        return Intent(raw=raw, profile="mezo_heavy", priority="voting_returns")
    if any(w in text for w in ["balance", "both"]):
        return Intent(raw=raw, profile="balanced", priority="yield")
    if any(w in text for w in ["btc", "bitcoin"]):
        return Intent(raw=raw, profile="btc_heavy", priority="yield")
    return Intent(raw=raw, profile="balanced", priority="yield")


_VALID_PROFILES = frozenset(
    {
        "btc_heavy",
        "mezo_heavy",
        "balanced",
        "defensive",
        "defensive_lock",
        "yield_farmer",
        "just_diversify",
    }
)
_VALID_PRIORITIES = frozenset({"yield", "safety", "voting_returns"})


def parse_intent_llm(raw: str) -> Intent:
    if not llm.is_available():
        return parse_intent(raw)  # fallback to keywords

    system = """You classify user intents for a DeFi agent on Mezo blockchain.
Output ONLY valid JSON matching: {"profile": "<profile>", "priority": "<priority>"}

Valid profiles (choose one):
- btc_heavy: maximize BTC-denominated yield via longer veBTC locks
- mezo_heavy: MEZO-focused; minimal BTC qualifier plus long MEZO lock for voting boost
- balanced: moderate exposure across both veBTC and veMEZO
- defensive: minimum BTC lock, lowest risk, no MEZO lock
- defensive_lock: conservative; short BTC + short MEZO lock for capital flexibility
- yield_farmer: maximum lock duration on both assets for max voting weight and emissions
- just_diversify: spread across veBTC and veMEZO at moderate durations

Valid priorities: yield, safety, voting_returns

No prose, no markdown, just the JSON."""

    user = f"Intent: {raw}"

    try:
        text = llm.complete(system, user, max_tokens=100)
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            data = json.loads(match.group())
            profile = data.get("profile")
            priority = data.get("priority")
            if profile in _VALID_PROFILES and priority in _VALID_PRIORITIES:
                return Intent(raw=raw, profile=profile, priority=priority)
    except Exception:
        pass

    return parse_intent(raw)  # fallback
