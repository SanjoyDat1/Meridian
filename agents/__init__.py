"""
Meridian — local agents package (Anthropic + orchestrator).

Chat and CLI helpers call the orchestrator using **ANTHROPIC_API_KEY**
(typically loaded via **external_evidence_agent/.env**).
"""

from agents.pipeline_director import reply_to_message

__all__ = ["reply_to_message"]
