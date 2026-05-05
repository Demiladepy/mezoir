import os
from typing import Optional

from anthropic import Anthropic

_client: Optional[Anthropic] = None


def client() -> Optional[Anthropic]:
    global _client
    if _client is None:
        key = os.environ.get("ANTHROPIC_API_KEY")
        if not key:
            return None
        _client = Anthropic(api_key=key)
    return _client


def is_available() -> bool:
    return client() is not None


def complete(system: str, user: str, max_tokens: int = 500) -> str:
    c = client()
    if c is None:
        raise RuntimeError("ANTHROPIC_API_KEY not set")
    model = os.environ.get("LLM_MODEL", "claude-sonnet-4-6")
    response = c.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return response.content[0].text
