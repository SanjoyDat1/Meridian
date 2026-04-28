from __future__ import annotations

import json
import re
import sys
import threading
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, File, Form, UploadFile
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from app_backend.api_models import (
    AgentChatRequest,
    AgentChatResponse,
    DemoAutofillItem,
    DemoCaseInfo,
    HealthResponse,
    JobQueuedResponse,
    UserPreferencesPayload,
)


REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND_DIR = REPO_ROOT / "frontend"
FRONTEND_DIST = FRONTEND_DIR / "dist"
CASES_DIR = REPO_ROOT / "cases"
DEFAULT_CASE_PATH = REPO_ROOT / "orchestrator" / "golden_cases" / "pt_tibia_rehab_case.json"

sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(REPO_ROOT / "contact_agent"))
sys.path.insert(0, str(REPO_ROOT / "external_evidence_agent"))
sys.path.insert(0, str(REPO_ROOT / "appeal_strategy_agent"))
sys.path.insert(0, str(REPO_ROOT / "drafting_agent"))

load_dotenv(REPO_ROOT / "external_evidence_agent" / ".env")

from orchestrator.run_pipeline import load_json, run_pipeline
from parser.classify import classify_file
from parser.prompt import run_parser_prompt
from appeals_history.query import get_appeal, list_appeals
from agents.pipeline_director import reply_to_message

app = FastAPI(title="Meridian API")
JOBS: dict[str, dict[str, Any]] = {}
JOBS_LOCK = threading.Lock()


def read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Missing artifact: {path.name}")
    return json.loads(path.read_text(encoding="utf-8"))


def serialize_mongo(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [serialize_mongo(item) for item in value]
    if isinstance(value, dict):
        return {key: serialize_mongo(item) for key, item in value.items()}
    return value


def history_summary(record: dict[str, Any]) -> dict[str, Any]:
    citations = record.get("citations") or []
    scores = [
        float(citation.get("relevance_score") or 0)
        for citation in citations
        if citation.get("relevance_score") is not None
    ]
    confidence = round((sum(scores) / len(scores)) * 100) if scores else 71
    outcome = record.get("outcome") or {}
    outcome_status = outcome.get("outcome_status") or "filed"
    status_labels = {
        "approved": "Won",
        "partial_approval": "Won",
        "denied": "Lost",
        "escalated": "Pending",
        "withdrawn": "Closed",
        "pending": "Pending",
        "filed": "Filed",
    }
    amount = record.get("amount_denied_usd")
    return {
        "case_id": record.get("case_id"),
        "date": (record.get("recorded_at") or record.get("updated_at") or "")[:10],
        "denied": record.get("denied_service") or record.get("denial_reason_category") or "Insurance denial",
        "insurer": record.get("insurer_name") or record.get("plan_name") or "Unknown insurer",
        "amount": f"${amount:,.0f}" if isinstance(amount, (int, float)) else "Amount unknown",
        "status": status_labels.get(outcome_status, "Filed"),
        "confidence": confidence,
        "days": outcome.get("days_to_decision") or 0,
        "verification_status": record.get("verification_status"),
        "codes": {
            "cpt_hcpcs": record.get("cpt_hcpcs_codes") or [],
            "icd10": record.get("icd10_codes") or [],
        },
    }


def artifacts_dir(case_id: str) -> Path:
    return CASES_DIR / case_id / "artifacts"


def build_case_payload(case_id: str) -> dict[str, Any]:
    base = artifacts_dir(case_id)
    result_path = CASES_DIR / case_id / "pipeline_result.json"
    if not result_path.exists():
        raise HTTPException(status_code=404, detail="No generated case result found.")

    return {
        "pipeline_result": read_json(result_path),
        "drafted_letter": read_json(base / "drafted_letter.json"),
        "appeal_packet": read_json(base / "appeal_packet.json"),
        "appeal_strategy": read_json(base / "appeal_strategy.json"),
        "verification_report": read_json(base / "verification_report.json"),
        "external_evidence": read_json(base / "external_evidence.json"),
    }


def demo_case_with_preferences(preferences: dict[str, Any] | None = None) -> dict[str, Any]:
    payload = load_json(DEFAULT_CASE_PATH)
    if preferences:
        payload["user_preferences"] = preferences
    return payload


def demo_autofill_from_golden(data: dict[str, Any], relative_path: str) -> tuple[str, list[DemoAutofillItem]]:
    """Build intake autofill copy for the bundled demo (transparent to the user)."""
    narrative = str(data.get("patient_narrative") or "").strip()
    items: list[DemoAutofillItem] = [
        DemoAutofillItem(
            id="bundle",
            label="Primary intake",
            detail=(
                f"Bundled golden JSON ({relative_path}) — structured denial, clinical facts, "
                "and evidence tasking for the full pipeline."
            ),
        )
    ]
    denial = data.get("denial_intake") or {}
    if isinstance(denial, dict) and denial:
        insurer = str(denial.get("insurer") or "").strip()
        reason = str(denial.get("denial_reason_text") or "").strip()
        codes = denial.get("denied_procedure_codes") or []
        code_part = ""
        if isinstance(codes, list) and codes:
            code_part = " · CPT/HCPCS: " + ", ".join(str(c) for c in codes[:8])
        core = f"{insurer}: {reason}".strip(": ").strip()
        items.append(
            DemoAutofillItem(
                id="denial",
                label="Denial / carrier fields (from bundle)",
                detail=(core + code_part) if core else "Structured denial intake from golden case.",
            )
        )
    pe = data.get("personal_evidence") or {}
    if isinstance(pe, dict):
        symptoms = pe.get("symptoms") or []
        if isinstance(symptoms, list) and symptoms:
            items.append(
                DemoAutofillItem(
                    id="clinical",
                    label="Clinical context (influences appeal reasoning)",
                    detail="; ".join(str(s) for s in symptoms[:6]),
                )
            )
    ext = data.get("external_evidence_task") or {}
    if isinstance(ext, dict):
        queries = ext.get("search_queries") or []
        if isinstance(queries, list) and queries:
            items.append(
                DemoAutofillItem(
                    id="retrieval",
                    label="External evidence angles (demo search intents)",
                    detail="; ".join(str(q) for q in queries[:4]),
                )
            )
    items.append(
        DemoAutofillItem(
            id="supporting_docs",
            label="Supporting uploads (your own case)",
            detail=(
                "This demo does not require extra files — context is embedded in the bundle. "
                "For a real appeal, add PT/clinical notes, imaging summaries, prior-auth letters, plan documents, "
                "and related EOBs so strategy and drafting can cite them."
            ),
        )
    )
    if narrative:
        preview = narrative if len(narrative) <= 360 else narrative[:360] + "…"
        items.append(
            DemoAutofillItem(id="narrative_field", label="Patient narrative (prefilled below)", detail=preview)
        )
    return narrative, items


def _decode_pdf_text_without_fitz(file_bytes: bytes) -> str:
    """Tiny fallback for text-based PDFs when PyMuPDF is not installed."""
    chunks: list[str] = []
    for raw in re.findall(rb"\((.*?)\)\s*Tj", file_bytes, flags=re.S):
        text = raw.decode("latin-1", errors="ignore")
        text = text.replace(r"\(", "(").replace(r"\)", ")").replace(r"\\", "\\")
        chunks.append(text)
    return "\n".join(chunks).strip()


def extract_uploaded_text(file_bytes: bytes, content_type: str) -> str:
    if content_type == "text/plain":
        return file_bytes.decode("utf-8", errors="ignore").strip()
    if content_type == "application/pdf":
        try:
            import fitz  # type: ignore

            doc = fitz.open(stream=file_bytes, filetype="pdf")
            return "\n".join(page.get_text() for page in doc).strip()
        except ModuleNotFoundError:
            return _decode_pdf_text_without_fitz(file_bytes)
    return ""


def parsed_case_to_pipeline_input(
    parsed: dict[str, Any],
    preferences: dict[str, Any] | None = None,
    patient_narrative: str | None = None,
) -> dict[str, Any]:
    golden = demo_case_with_preferences()
    case_id = parsed.get("case_id") or parsed.get("denial_intake", {}).get("case_id") or str(uuid4())
    denial = parsed.get("denial_intake", {})
    codes = denial.get("codes", {}) if isinstance(denial.get("codes"), dict) else {}
    cpt_codes = codes.get("cpt_hcpcs") or denial.get("denied_procedure_codes") or []
    diagnosis_codes = codes.get("icd10") or denial.get("diagnosis_codes") or []
    insurer = denial.get("insurer") or denial.get("insurer_name") or golden["denial_intake"].get("insurer")
    plan_id = denial.get("plan_id") or denial.get("plan_name") or golden["denial_intake"].get("plan_id", "")
    member_id = denial.get("member_id") or denial.get("member_id_last4") or golden["denial_intake"].get("member_id", "")

    pipeline_denial = {
        **golden["denial_intake"],
        **denial,
        "case_id": case_id,
        "insurer": insurer,
        "plan_id": plan_id,
        "member_id": member_id,
        "denied_procedure_codes": cpt_codes,
        "diagnosis_codes": diagnosis_codes,
        "denial_reason_text": denial.get("denial_reason_text") or golden["denial_intake"].get("denial_reason_text", ""),
        "denial_reason_category": denial.get("denial_reason_category") or "other",
        "appeal_level": denial.get("appeal_level") or denial.get("current_appeal_level") or "first_internal",
        "treating_physician": denial.get("treating_physician") or golden["denial_intake"].get("treating_physician", "Not specified"),
        "service_dates": denial.get("service_dates") or golden["denial_intake"].get("service_dates", []),
        "confidence_score": denial.get("confidence_score")
        or max((denial.get("field_confidence") or {}).values(), default=0.72),
    }

    external_task = parsed.get("external_evidence_task", {})
    pipeline_external_task = {
        **golden["external_evidence_task"],
        **external_task,
        "case_id": case_id,
        "insurer": external_task.get("insurer") or external_task.get("insurer_name") or insurer,
        "denied_procedures": external_task.get("denied_procedures") or cpt_codes,
        "diagnosis": external_task.get("diagnosis") or diagnosis_codes,
        "codes": external_task.get("codes") or {"cpt_hcpcs": cpt_codes, "icd10": diagnosis_codes},
    }

    personal_evidence = {
        **golden["personal_evidence"],
        "case_id": case_id,
        "provenance": {"source": "uploaded_denial_with_demo_patient_facts", "contains_phi": False},
    }
    if patient_narrative:
        personal_evidence["patient_narrative"] = patient_narrative

    payload = {
        "case_id": case_id,
        "denial_intake": pipeline_denial,
        "missing_info_request": {**golden["missing_info_request"], **parsed.get("missing_info_request", {}), "case_id": case_id},
        "personal_evidence_task": {**golden.get("personal_evidence_task", {}), **parsed.get("personal_evidence_task", {}), "case_id": case_id},
        "personal_evidence": personal_evidence,
        "external_evidence_task": pipeline_external_task,
    }
    if preferences:
        payload["user_preferences"] = preferences
    if patient_narrative:
        payload["patient_narrative"] = patient_narrative
    return payload


def set_job(job_id: str, **updates: Any) -> None:
    with JOBS_LOCK:
        current = JOBS.setdefault(job_id, {})
        current.update(serialize_mongo(updates))


def append_job_event(job_id: str, event: dict[str, Any]) -> None:
    with JOBS_LOCK:
        event = serialize_mongo(event)
        current = JOBS.setdefault(job_id, {})
        current.setdefault("events", []).append(event)
        current["latest_event"] = event


def run_job(job_id: str, preferences: dict[str, Any] | None = None) -> None:
    set_job(job_id, status="running", result=None, error=None)
    try:
        result = run_pipeline(
            demo_case_with_preferences(preferences),
            status_callback=lambda event: append_job_event(job_id, event),
        )
        set_job(job_id, status="success", result=build_case_payload(result["case_id"]))
    except Exception as exc:
        append_job_event(
            job_id,
            {
                "step": "pipeline",
                "status": "failed",
                "artifact": None,
                "notes": [f"{type(exc).__name__}: {exc}"],
            },
        )
        set_job(job_id, status="failed", error=f"{type(exc).__name__}: {exc}")


def run_uploaded_job(
    job_id: str,
    uploads: list[dict[str, Any]],
    preferences: dict[str, Any] | None = None,
    patient_narrative: str | None = None,
) -> None:
    set_job(job_id, status="running", result=None, error=None)
    try:
        append_job_event(
            job_id,
            {
                "step": "doc_parser_agent",
                "status": "running",
                "artifact": None,
                "notes": ["Extracting text from uploaded denial document"],
            },
        )
        labelled_texts: dict[str, str] = {}
        unknown_texts: list[str] = []
        for upload in uploads:
            filename = upload["filename"]
            content_type = upload["content_type"]
            extracted = extract_uploaded_text(upload["bytes"], content_type)
            if not extracted:
                raise ValueError(f"No text could be extracted from {filename}.")
            doc_type = classify_file(filename, content_type)
            if doc_type == "unknown":
                unknown_texts.append(extracted)
            else:
                labelled_texts[doc_type] = "\n\n".join(
                    value for value in [labelled_texts.get(doc_type), extracted] if value
                )
        if unknown_texts:
            labelled_texts["unknown_documents"] = "\n\n".join(unknown_texts)
        if not labelled_texts:
            raise ValueError("No parser-ready text was extracted from uploaded files.")

        parsed = run_parser_prompt(labelled_texts, patient_narrative or "", str(uuid4()))
        parsed["case_id"] = parsed.get("case_id") or parsed.get("denial_intake", {}).get("case_id")
        append_job_event(
            job_id,
            {
                "step": "doc_parser_agent",
                "status": "success",
                "artifact": None,
                "notes": [f"Parsed {', '.join(labelled_texts.keys())}"],
            },
        )
        result = run_pipeline(
            parsed_case_to_pipeline_input(parsed, preferences, patient_narrative),
            status_callback=lambda event: append_job_event(job_id, event),
        )
        set_job(job_id, status="success", result=build_case_payload(result["case_id"]))
    except Exception as exc:
        append_job_event(
            job_id,
            {
                "step": "doc_parser_agent",
                "status": "failed",
                "artifact": None,
                "notes": [f"{type(exc).__name__}: {exc}"],
            },
        )
        set_job(job_id, status="failed", error=f"{type(exc).__name__}: {exc}")


@app.get("/")
def index() -> FileResponse:
    dist_index = FRONTEND_DIST / "index.html"
    if dist_index.exists():
        return FileResponse(dist_index)
    legacy = FRONTEND_DIR / "legacy" / "original-spa.html"
    if legacy.exists():
        return FileResponse(legacy)
    raise HTTPException(
        status_code=503,
        detail="UI not built. Run: cd frontend && npm install && npm run build",
    )


@app.get("/tweaks-panel.jsx")
def tweaks_panel() -> FileResponse:
    legacy = FRONTEND_DIR / "legacy" / "tweaks-panel.jsx"
    if legacy.exists():
        return FileResponse(legacy)
    raise HTTPException(status_code=404, detail="Legacy tweaks panel not present.")


@app.post("/api/agent-chat", response_model=AgentChatResponse, tags=["agents"])
def agent_chat(body: AgentChatRequest) -> AgentChatResponse:
    """
    Anthropic-backed chat director: maps natural language (or JSON case payloads)
    to the local orchestrator (`run_pipeline` and helpers).
    """
    return AgentChatResponse(reply=reply_to_message(body.effective_message()))


@app.get("/health", response_model=HealthResponse, tags=["meta"])
def health() -> HealthResponse:
    return HealthResponse()


@app.get("/api/demo-case", response_model=DemoCaseInfo, tags=["meta"])
def demo_case() -> DemoCaseInfo:
    """Golden case JSON used when the user runs the bundled demo (no upload)."""
    if not DEFAULT_CASE_PATH.exists():
        raise HTTPException(status_code=404, detail="Demo case file not found.")
    data = read_json(DEFAULT_CASE_PATH)
    denial = data.get("denial_intake") or {}
    case_id = str(data.get("case_id") or denial.get("case_id") or "")
    insurer = denial.get("insurer")
    reason = denial.get("denial_reason_text") or ""
    summary = f"{insurer or 'Insurer'} — {reason[:200]}{'…' if len(str(reason)) > 200 else ''}".strip(" —")
    raw = json.dumps(data, indent=2, default=str)
    max_len = 14_000
    preview = raw if len(raw) <= max_len else raw[:max_len] + "\n…\n(truncated for API preview; full file is on disk.)"
    rel = str(DEFAULT_CASE_PATH.relative_to(REPO_ROOT))
    patient_narrative, autofill_items = demo_autofill_from_golden(data, rel)
    return DemoCaseInfo(
        relative_path=rel,
        filename=DEFAULT_CASE_PATH.name,
        case_id=case_id,
        insurer=insurer if isinstance(insurer, str) else None,
        summary=summary or "Golden demo case",
        preview_json=preview,
        patient_narrative=patient_narrative,
        autofill_items=autofill_items,
    )


@app.post("/api/run-demo")
def run_demo(body: UserPreferencesPayload = UserPreferencesPayload()) -> dict[str, Any]:
    result = run_pipeline(demo_case_with_preferences(body.user_preferences or None))
    return build_case_payload(result["case_id"])


@app.post("/api/run-demo-job", response_model=JobQueuedResponse, tags=["jobs"])
def run_demo_job(body: UserPreferencesPayload = UserPreferencesPayload()) -> JobQueuedResponse:
    job_id = str(uuid4())
    with JOBS_LOCK:
        JOBS[job_id] = {
            "job_id": job_id,
            "status": "queued",
            "events": [],
            "result": None,
            "error": None,
        }
    thread = threading.Thread(
        target=run_job,
        args=(job_id, body.user_preferences or None),
        daemon=True,
    )
    thread.start()
    return JobQueuedResponse(job_id=job_id, status="queued")


@app.post("/api/run-upload-job", response_model=JobQueuedResponse, tags=["jobs"])
async def run_upload_job(
    files: list[UploadFile] = File(...),
    patient_narrative: str = Form(""),
    user_preferences: str = Form("{}"),
) -> JobQueuedResponse:
    job_id = str(uuid4())
    try:
        preferences = json.loads(user_preferences) if user_preferences else {}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="user_preferences must be valid JSON.")

    uploads = []
    for file in files:
        uploads.append(
            {
                "filename": file.filename or "uploaded_document",
                "content_type": file.content_type or "application/pdf",
                "bytes": await file.read(),
            }
        )

    with JOBS_LOCK:
        JOBS[job_id] = {
            "job_id": job_id,
            "status": "queued",
            "events": [],
            "result": None,
            "error": None,
        }
    thread = threading.Thread(
        target=run_uploaded_job,
        args=(job_id, uploads, preferences, patient_narrative),
        daemon=True,
    )
    thread.start()
    return JobQueuedResponse(job_id=job_id, status="queued")


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str) -> dict[str, Any]:
    with JOBS_LOCK:
        job = JOBS.get(job_id)
        if job is None:
            raise HTTPException(status_code=404, detail="Job not found.")
        return serialize_mongo(dict(job))


@app.get("/api/history")
def history(limit: int = 25, offset: int = 0) -> dict[str, Any]:
    try:
        records = [serialize_mongo(record) for record in list_appeals(limit=limit, offset=offset)]
        return {
            "status": "ok",
            "cases": [history_summary(record) for record in records],
            "records": records,
        }
    except Exception as exc:
        return {
            "status": "unavailable",
            "cases": [],
            "records": [],
            "error": f"{type(exc).__name__}: {exc}",
        }


@app.get("/api/history/{case_id}")
def history_case(case_id: str) -> dict[str, Any]:
    try:
        record = get_appeal(case_id)
        if record is None:
            raise HTTPException(status_code=404, detail="History record not found.")
        serialized = serialize_mongo(record)
        return {"status": "ok", "case": history_summary(serialized), "record": serialized}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"{type(exc).__name__}: {exc}") from exc


@app.get("/api/latest")
def latest() -> dict[str, Any]:
    case_id = "demo-pt-tibia-001"
    return build_case_payload(case_id)


@app.get("/api/latest/letter.txt")
def latest_letter_text() -> PlainTextResponse:
    payload = build_case_payload("demo-pt-tibia-001")
    letter = payload["drafted_letter"].get("appeal_letter", "")
    if not letter:
        raise HTTPException(status_code=404, detail="No appeal letter found.")
    return PlainTextResponse(
        letter,
        headers={"Content-Disposition": "attachment; filename=meridian_appeal_letter.txt"},
    )


assets_dir = FRONTEND_DIST / "assets"
if assets_dir.is_dir():
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
