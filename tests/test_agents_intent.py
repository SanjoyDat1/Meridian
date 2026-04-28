"""Director intent classification (heuristics, no network)."""
from __future__ import annotations

import json

from agents.intent import IntentKind, classify_intent_heuristic, parse_case_payload


def test_help_keywords() -> None:
    i = classify_intent_heuristic("help")
    assert i is not None
    assert i.kind == IntentKind.HELP


def test_demo_summary() -> None:
    i = classify_intent_heuristic("show me the demo summary")
    assert i is not None
    assert i.kind == IntentKind.DEMO_SUMMARY


def test_json_payload() -> None:
    raw = '{"case_id": "x", "schema_version": "1.0", "foo": 1}'
    i = classify_intent_heuristic(raw)
    assert i is not None
    assert i.kind == IntentKind.RUN_JSON
    assert i.case_payload == json.loads(raw)


def test_parse_case_payload_invalid() -> None:
    assert parse_case_payload("not json") is None
    assert parse_case_payload('{"no_case_id": true}') is None
