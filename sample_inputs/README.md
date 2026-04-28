# Sample inputs

JSON fixtures for exercising individual agents or the orchestrator. Shapes align with **`shared/schemas.py`**.

- **`denial_intake.json`** — parser / strategy denial shape.
- **`missing_info_request.json`** — contact agent input.
- **`personal_evidence_task.json`** — personal evidence agent task.
- **`external_evidence_task.json`** — external evidence retrieval task.
- **`demo_uhc_pt_denial_email.html`** — example HTML email body for parser experiments.

Use with **`python -m orchestrator.run_pipeline --case orchestrator/golden_cases/pt_tibia_rehab_case.json`** for a full local run, or point a single agent’s `POST /run` at these files after wrapping in the expected envelope (`case_id`, `schema_version`, `status`, `provenance`).
