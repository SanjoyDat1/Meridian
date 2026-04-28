import type { CaseResult, Citation, Remedy } from "../types";
import { FALLBACK_LETTER } from "../data/constants";

export function buildUserPreferences(remedy: Remedy | null): Record<string, string> {
  if (!remedy) return {};
  return {
    desired_outcome: remedy.id,
    desired_outcome_label: remedy.label,
    desired_timeline: remedy.timeline,
    user_selected_reason: remedy.primary,
  };
}

export function getLiveLetter(caseResult: CaseResult | null): string {
  const fromDraft = caseResult?.drafted_letter?.appeal_letter;
  const fromPacket = caseResult?.appeal_packet?.appeal_letter;
  return fromDraft || fromPacket || FALLBACK_LETTER;
}

export function getLiveCitations(caseResult: CaseResult | null): Citation[] | null {
  const c = caseResult?.drafted_letter?.citations_footnoted ?? caseResult?.appeal_packet?.citations_footnoted;
  return c ?? null;
}

export function formatCitationDisplay(citation: Citation, index: number) {
  const rawLabel = citation?.label || citation?.source || `Citation ${citation?.footnote_index ?? index + 1}`;
  const rawDescription = citation?.desc || citation?.quote || "";
  const sourceLooksInternal =
    /^external_evidence\.citations\[\d+\]$/.test(rawLabel) || /^strategy\./.test(rawLabel);
  if (sourceLooksInternal && rawDescription.includes(" — ")) {
    const [title, ...rest] = rawDescription.split(" — ");
    return {
      chip: citation?.type || `Citation ${citation?.footnote_index ?? index + 1}`,
      label: title || rawLabel,
      desc: rest.join(" — "),
    };
  }
  return {
    chip: citation?.type || `Citation ${citation?.footnote_index ?? index + 1}`,
    label: sourceLooksInternal ? `Citation ${citation?.footnote_index ?? index + 1}` : rawLabel,
    desc: rawDescription,
  };
}

export function getLiveDeadline(caseResult: CaseResult | null, fallback: string): string {
  return caseResult?.drafted_letter?.deadline || caseResult?.appeal_packet?.deadline || fallback;
}

export function getLiveRemedy(caseResult: CaseResult | null): string {
  return caseResult?.appeal_strategy?.agent_recommended_remedy || "full_overturn";
}

export function getLiveVerification(caseResult: CaseResult | null): string {
  return (
    caseResult?.pipeline_result?.verification_status ||
    caseResult?.verification_report?.status ||
    "demo"
  );
}
