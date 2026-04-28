"""Pydantic request/response models for public HTTP APIs (OpenAPI + validation)."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class AgentChatRequest(BaseModel):
    """Body for `POST /api/agent-chat`. Either `message` or legacy alias `text` may be set."""

    message: str | None = Field(default=None, description="Primary user utterance.")
    text: str | None = Field(default=None, description="Alias for `message` (back-compat).")

    def effective_message(self) -> str:
        if self.message is not None and str(self.message).strip():
            return str(self.message).strip()
        if self.text is not None and str(self.text).strip():
            return str(self.text).strip()
        return ""


class AgentChatResponse(BaseModel):
    reply: str = Field(..., description="Director reply (plain text).")


class UserPreferencesPayload(BaseModel):
    """Optional preferences passed into strategy / contact (opaque dict)."""

    user_preferences: dict[str, Any] = Field(default_factory=dict)


class JobQueuedResponse(BaseModel):
    job_id: str
    status: str


class HealthResponse(BaseModel):
    status: str = "ok"


class DemoAutofillItem(BaseModel):
    """One row shown in the UI when the user picks the bundled demo (transparent autofill)."""

    id: str
    label: str
    detail: str


class DemoCaseInfo(BaseModel):
    """Bundled golden case used for 'Use demo file' in the UI and `run_pipeline` default."""

    relative_path: str = Field(..., description="Path relative to repository root.")
    filename: str
    case_id: str
    insurer: str | None = None
    summary: str = Field(..., description="Short human-readable description of the demo scenario.")
    preview_json: str = Field(..., description="Pretty-printed JSON (may truncate).")
    patient_narrative: str = Field(
        default="",
        description="Top-level patient-facing story for intake; copied into the story textarea in demo mode.",
    )
    autofill_items: list[DemoAutofillItem] = Field(
        default_factory=list,
        description="What the UI prefilled when demo was selected.",
    )
