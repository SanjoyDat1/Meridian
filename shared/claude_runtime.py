"""Shared Anthropic client + default model for pipeline Claude stages."""
from __future__ import annotations

import os
from functools import lru_cache

from anthropic import Anthropic


def default_model() -> str:
    return (
        os.getenv("COUNTERCLAIM_DIRECTOR_MODEL")
        or os.getenv("ANTHROPIC_MODEL")
        or "claude-sonnet-4-6"
    )


def anthropic_available() -> bool:
    return bool(os.getenv("ANTHROPIC_API_KEY"))


@lru_cache(maxsize=1)
def get_client() -> Anthropic:
    return Anthropic()
