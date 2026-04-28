export type JobEvent = {
  step: string;
  status: string;
  notes?: string[];
  narrative?: string;
  timestamp?: string;
  artifact?: string | null;
};

export type BackendStatus = {
  type: "info" | "success" | "error";
  message: string;
};

export type Citation = {
  label?: string;
  source?: string;
  footnote_index?: number;
  quote?: string;
  desc?: string;
  type?: string;
};

/** Loose payload returned from /api/jobs/:id result and /api/latest */
export type CaseResult = {
  drafted_letter?: {
    appeal_letter?: string;
    citations_footnoted?: Citation[];
    deadline?: string;
  };
  appeal_packet?: {
    appeal_letter?: string;
    citations_footnoted?: Citation[];
    deadline?: string;
  };
  appeal_strategy?: { agent_recommended_remedy?: string };
  pipeline_result?: { verification_status?: string };
  verification_report?: { status?: string };
};

export type Remedy = {
  id: string;
  label: string;
  confidence: number;
  timeline: string;
  primary: string;
  recommended: boolean;
  tag: string;
  tagColor: string;
  strength: string;
};

export type AgentDef = {
  id: string;
  num: number | string;
  /** Short UI label (role family). */
  name: string;
  /** Moniker shown in the War Room ("codename"). */
  codename: string;
  /** One-line job title / specialty. */
  roleLine: string;
  tagline: string;
  color: string;
  steps: string[];
  /** Visual treatment for the column skin. */
  theme: "intake" | "correspondence" | "clinical" | "policy" | "synthesis";
  /** Shown when the UI runs without live job events (simulated crawl). */
  simulatedNarrative: string;
};

export type UploadPayload = {
  denialFile: File | null;
  /** Additional PDFs/images/text that strengthen medical-necessity and policy arguments. */
  supportingFiles: File[];
  useDemo: boolean;
  patientNarrative: string;
};

export type CitFeedItem = {
  src: string;
  text: string;
  type: string;
};
