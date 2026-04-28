"""HTTP API smoke tests (FastAPI TestClient)."""
from __future__ import annotations

from fastapi.testclient import TestClient

from app_backend.main import app

client = TestClient(app)


def test_health() -> None:
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_agent_chat_help() -> None:
    r = client.post("/api/agent-chat", json={"message": "help"})
    assert r.status_code == 200
    body = r.json()
    assert "reply" in body
    assert "Meridian director" in body["reply"]


def test_agent_chat_alias_text_field() -> None:
    r = client.post("/api/agent-chat", json={"text": "status"})
    assert r.status_code == 200
    assert "Meridian director" in r.json()["reply"]


def test_agent_chat_empty_body_still_200() -> None:
    r = client.post("/api/agent-chat", json={})
    assert r.status_code == 200
    assert "reply" in r.json()


def test_run_demo_job_returns_queued_shape() -> None:
    r = client.post("/api/run-demo-job", json={})
    assert r.status_code == 200
    data = r.json()
    assert set(data.keys()) == {"job_id", "status"}
    assert data["status"] == "queued"


def test_get_job_unknown_returns_404() -> None:
    r = client.get("/api/jobs/00000000-0000-4000-8000-000000000000")
    assert r.status_code == 404
    assert r.json()["detail"] == "Job not found."


def test_run_upload_job_invalid_user_preferences_json_returns_400() -> None:
    r = client.post(
        "/api/run-upload-job",
        data={"patient_narrative": "", "user_preferences": "not-json"},
        files=[("files", ("stub.txt", b"stub", "text/plain"))],
    )
    assert r.status_code == 400
    assert "user_preferences" in r.json()["detail"].lower()


def test_openapi_schema_title() -> None:
    r = client.get("/openapi.json")
    assert r.status_code == 200
    assert r.json().get("info", {}).get("title") == "Meridian API"


def test_demo_case_returns_bundle() -> None:
    r = client.get("/api/demo-case")
    assert r.status_code == 200
    data = r.json()
    assert data["filename"] == "pt_tibia_rehab_case.json"
    assert "preview_json" in data
    assert data.get("case_id")
    assert data.get("patient_narrative")
    items = data.get("autofill_items") or []
    assert isinstance(items, list) and len(items) >= 2
    assert all("label" in x and "detail" in x for x in items)
