import type { AgentDef, Remedy } from "../types";

export const MOCK_CASE = {
  patient: "Gene L.",
  insurer: "UnitedHealthcare Medicare Advantage",
  denied: "Skilled Nursing Facility Care (SNF) — Post-Hospital",
  amount: "$12,400",
  denialDate: "March 28, 2026",
  deadline: "April 27, 2026",
  denialReason: "Not medically necessary — patient deemed stable for discharge",
  denialCategory: "medical_necessity",
  appealLevel: "Redetermination (Level 1)",
};

/** Fallback letter if API payload omits body text (offline demo). */
export const FALLBACK_LETTER = `[Your name]
[Address]

${MOCK_CASE.deadline}

Appeals Department — ${MOCK_CASE.insurer}

Re: Formal appeal — denied ${MOCK_CASE.denied}

Dear Reviewer,

I am requesting a full reconsideration of the adverse determination dated ${MOCK_CASE.denialDate}. The denial reason cited (“${MOCK_CASE.denialReason}”) is inconsistent with my treating clinician’s documentation and applicable coverage standards.

Please reverse this denial and provide the full benefit I am entitled to under my plan and Medicare regulations.

Respectfully,
[Signature]`;

export const AGENTS: AgentDef[] = [
  {
    id: "parser",
    num: 1,
    name: "Intake analyst",
    codename: "Rowan",
    roleLine: "Structured denial normalization · parser contract owner",
    tagline: "Claude: structured intake & missing-info scaffold",
    color: "#b91c1c",
    theme: "intake",
    steps: [
      "Normalizing uploaded document text…",
      "Extracting procedure & diagnosis codes…",
      "Mapping denial category & appeal level…",
      "Validating deadlines from the notice…",
      "Emitting parser contract for downstream agents…",
      "✓ Intake artifact sealed",
    ],
    simulatedNarrative:
      "I treated the raw carrier notice as untrusted until every identifier, code, and calendar date survived cross-field validation. The denial frames medical necessity narrowly; I preserved that framing verbatim so later agents argue against the carrier's own wording rather than a paraphrase. Uncertainty is concentrated in plan-specific riders I have not yet seen—those become explicit correspondence asks rather than silent assumptions. Handoff: the clinical reviewer must now decide whether the seeded record actually carries enough functional detail to stress that frame.",
  },
  {
    id: "contact",
    num: 2,
    name: "Correspondence",
    codename: "Ellis",
    roleLine: "Carrier communications · missing-information resolution",
    tagline: "Claude: outreach reasoning + email draft",
    color: "#7f1d1d",
    theme: "correspondence",
    steps: [
      "Reviewing missing-field checklist…",
      "Drafting carrier-facing inquiry…",
      "Cross-checking plan identifiers…",
      "Aligning asks with appeal timeline…",
      "Packaging contact_actions bundle…",
      "✓ Outreach draft ready",
    ],
    simulatedNarrative:
      "I translated Rowan's spine and Soren's gap analysis into the smallest set of carrier-facing requests that protect appeal clocks. Every ask cites a field the parser could not ground or the clinical bundle leaves thin—nothing gratuitous. I am explicit about urgency language when SNF or post-acute access is in scope, because passive emails get routed to general queues. Handoff: Jules should assume these requests are parallel-path while retrieval runs, so citations must not silently require documents we have not yet received.",
  },
  {
    id: "personal",
    num: "3a",
    name: "Clinical facts",
    codename: "Soren",
    roleLine: "Evidence coherence · medical-necessity readiness",
    tagline: "Claude: evidence coherence vs. task",
    color: "#991b1b",
    theme: "clinical",
    steps: [
      "Loading structured patient evidence…",
      "Claude review of record strength & gaps (artifact)…",
      "✓ Facts forwarded to strategy stack",
    ],
    simulatedNarrative:
      "I stress-tested the structured record against the extraction task: symptoms, treatment arcs, and physician voice must line up with the denial category or the strategy will overfit optimistic language. Where the JSON is thin, I name the exact evidentiary holes so Ellis can pursue targeted records—not vague 'please send medical records' scattershot. I am deliberately skeptical of boilerplate clinical phrases that lack dates or functional impact. Handoff: Ellis prioritizes outreach; Jules should not treat policy citations as substitutes for missing bedside facts.",
  },
  {
    id: "external",
    num: "3b",
    name: "Policy corpus",
    codename: "Jules",
    roleLine: "Coverage authority retrieval · citation discipline",
    tagline: "Claude query intents + Mongo retrieval + critique",
    color: "#c2410c",
    theme: "policy",
    steps: [
      "Claude generates & refines search intents…",
      "Scanning curated evidence chunks…",
      "Ranking CMS / guideline matches…",
      "Claude post-retrieval critique of citation set…",
      "Emitting external_evidence.json…",
      "✓ Citations ranked",
    ],
    simulatedNarrative:
      "I treated retrieval as adversarial proof-building: every candidate citation must survive insurer-specific scrutiny, not merely match keywords. Weak matches are labeled so Dante cannot accidentally build the argument on sand. I cross-walked CMS-style authorities with the denial codes and functional limitations Soren emphasized. Handoff: Mira validates contract fit; Dante must rank arguments with eyes open about citation depth versus clinical bluntness.",
  },
  {
    id: "policy",
    num: 4,
    name: "Strategy synthesizer",
    codename: "Dante / Naomi / Vera",
    roleLine: "Strategy → drafting → packet → verification chain",
    tagline: "Claude Sonnet + submit_strategy tool",
    color: "#dc2626",
    theme: "synthesis",
    steps: [
      "Merging four preceding-stage JSON bundles…",
      "Running contract validation…",
      "Synthesizing argument chain…",
      "Scoring remedy recommendation…",
      "Drafting footnoted letter scaffold…",
      "✓ Packet & verification queued",
    ],
    simulatedNarrative:
      "Downstream specialists merged strategy synthesis, patient-safe drafting, exhibit discipline, and independent verification. Dante locked remedy posture only after reconciling Jules' citations with Soren's clinical bluntness—no freelanced legal theories. Naomi kept voice and footnotes aligned with that contract so carrier reviewers see one coherent account. Vera surfaced residual citation drift before the packet is treated as final. Handoff: human counsel reviews PHI and filing channels before external submission.",
  },
];

export const REMEDIES: Remedy[] = [
  {
    id: "full",
    label: "Full overturn",
    confidence: 71,
    timeline: "60–90 days",
    primary:
      "Challenge the denial as inconsistent with cited NCD/LCD material and plan parity rules. Requests complete reversal of the adverse determination.",
    recommended: true,
    tag: "Strongest case",
    tagColor: "#b91c1c",
    strength: "Strong",
  },
  {
    id: "partial",
    label: "Partial approval",
    confidence: 84,
    timeline: "30–45 days",
    primary:
      "Narrow the ask (e.g., first two weeks of care) to improve grant probability while preserving escalation paths.",
    recommended: false,
    tag: "Faster path",
    tagColor: "#7f1d1d",
    strength: "Very strong",
  },
  {
    id: "external",
    label: "Expedited / external review",
    confidence: 62,
    timeline: "72 hours – 30 days",
    primary:
      "Emphasize urgency, concurrent care risk, and eligibility for independent medical review where applicable.",
    recommended: false,
    tag: "Urgent",
    tagColor: "#c2410c",
    strength: "Moderate",
  },
];
