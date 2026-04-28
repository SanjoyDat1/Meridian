/**
 * Performs JSON API calls against the same origin (production)
 * or Vite dev server proxy (`/api` → backend :8000).
 */
import type { CaseResult, JobEvent } from "../types";

export async function apiJson<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = String(body.detail);
    } catch {
      /* use status text */
    }
    throw new Error(detail);
  }
  return response.json() as Promise<T>;
}

export type DemoJobResponse = { job_id: string; status: string };

export type AgentChatResponse = { reply: string };

export type JobPollResponse = {
  job_id: string;
  status: string;
  events?: JobEvent[];
  latest_event?: JobEvent;
  error?: string | null;
  result?: CaseResult | null;
};

export type HistoryResponse = {
  status: string;
  cases: HistoryCaseSummary[];
};

export type HistoryCaseSummary = {
  case_id?: string;
  date?: string;
  denied?: string;
  insurer?: string;
  amount?: string;
  status?: string;
  confidence?: number;
  days?: number;
};

export type DemoAutofillItem = {
  id: string;
  label: string;
  detail: string;
};

export type DemoCaseInfo = {
  relative_path: string;
  filename: string;
  case_id: string;
  insurer: string | null;
  summary: string;
  preview_json: string;
  patient_narrative: string;
  autofill_items: DemoAutofillItem[];
};
