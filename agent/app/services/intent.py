from pydantic import BaseModel, Field


class Intent(BaseModel):
    raw: str
    profile: str = Field(
        ...,
        description="One of: btc_heavy, mezo_heavy, balanced, defensive",
    )
    priority: str = Field(
        ...,
        description="One of: yield, safety, voting_returns",
    )


def parse_intent(raw: str) -> Intent:
    s = raw.lower()
    if (
        "defensive" in s
        or "park" in s
        or "low risk" in s
        or "safe" in s
    ):
        return Intent(raw=raw, profile="defensive", priority="safety")
    if "mezo" in s and "btc" not in s:
        return Intent(raw=raw, profile="mezo_heavy", priority="voting_returns")
    if "balance" in s or "both" in s:
        return Intent(raw=raw, profile="balanced", priority="yield")
    if "btc" in s or "bitcoin" in s:
        return Intent(raw=raw, profile="btc_heavy", priority="yield")
    return Intent(raw=raw, profile="balanced", priority="yield")
