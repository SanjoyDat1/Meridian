/**
 * Root shell: single-page flow with explicit screen state (no router dependency).
 */
import React, { useEffect, useState } from "react";
import { apiJson, type DemoJobResponse, type JobPollResponse } from "./lib/api";
import { buildUserPreferences } from "./lib/caseHelpers";
import type { BackendStatus, CaseResult, JobEvent, Remedy, UploadPayload } from "./types";
import { Landing } from "./screens/Landing";
import { Upload } from "./screens/Upload";
import { Remedy as RemedyScreen } from "./screens/Remedy";
import { WarRoom } from "./screens/WarRoom";
import { Letter } from "./screens/Letter";
import { History } from "./screens/History";
import { Profile } from "./screens/Profile";

import { DirectorChat } from "./screens/DirectorChat";

type Screen = "landing" | "upload" | "remedy" | "warroom" | "letter" | "history" | "profile" | "director";

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [caseResult, setCaseResult] = useState<CaseResult | null>(null);
  const [backendRunning, setBackendRunning] = useState(false);
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null);
  const [jobEvents, setJobEvents] = useState<JobEvent[]>([]);
  const [uploadPayload, setUploadPayload] = useState<UploadPayload | null>(null);

  useEffect(() => {
    apiJson<CaseResult>("/api/latest")
      .then(setCaseResult)
      .catch(() => {
        /* optional warm cache */
      });
  }, []);

  async function startAnalysis(remedy: Remedy) {
    setScreen("warroom");
    setBackendRunning(true);
    setJobEvents([]);
    setBackendStatus({ type: "info", message: "Running Meridian analysis pipeline…" });
    try {
      let job: DemoJobResponse | null = null;
      const prefs = buildUserPreferences(remedy);

      if (uploadPayload?.denialFile && !uploadPayload.useDemo) {
        const form = new FormData();
        form.append("files", uploadPayload.denialFile);
        for (const f of uploadPayload.supportingFiles ?? []) {
          form.append("files", f);
        }
        form.append("patient_narrative", uploadPayload.patientNarrative || "");
        form.append("user_preferences", JSON.stringify(prefs));
        const response = await fetch("/api/run-upload-job", { method: "POST", body: form });
        if (!response.ok) {
          let detail = `${response.status}`;
          try {
            const body = (await response.json()) as { detail?: string };
            if (body.detail) detail = body.detail;
          } catch {
            /* ignore */
          }
          throw new Error(detail);
        }
        job = (await response.json()) as DemoJobResponse;
      } else {
        job = await apiJson<DemoJobResponse>("/api/run-demo-job", {
          method: "POST",
          body: JSON.stringify({ user_preferences: prefs }),
        });
      }

      let finalJob: JobPollResponse = {
        job_id: job.job_id,
        status: job.status,
        events: [],
      };
      while (finalJob.status === "queued" || finalJob.status === "running") {
        await new Promise((r) => setTimeout(r, 1500));
        finalJob = await apiJson<JobPollResponse>(`/api/jobs/${job.job_id}`);
        setJobEvents(finalJob.events ?? []);
        const latest = finalJob.latest_event;
        if (latest) {
          setBackendStatus({
            type: "info",
            message: `${latest.step.replace(/_/g, " ")} · ${latest.status}`,
          });
        }
      }

      if (finalJob.status === "success" && finalJob.result) {
        setCaseResult(finalJob.result);
        setBackendStatus({ type: "success", message: "Pipeline complete — review artifacts under cases/." });
      } else {
        throw new Error(finalJob.error || "Job failed");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setBackendStatus({
        type: "error",
        message: `Run failed (${message}). Loading last cached demo payload if available.`,
      });
      try {
        setCaseResult(await apiJson<CaseResult>("/api/latest"));
      } catch {
        /* ignore */
      }
    } finally {
      setBackendRunning(false);
    }
  }

  const screens: Record<Screen, React.ReactElement> = {
    landing: (
      <Landing
        onStart={() => setScreen("upload")}
        onAccount={() => setScreen("profile")}
        onDirector={() => setScreen("director")}
      />
    ),
    upload: (
      <Upload
        onNext={(payload) => {
          setUploadPayload(payload);
          setScreen("remedy");
        }}
      />
    ),
    remedy: <RemedyScreen onNext={startAnalysis} />,
    warroom: (
      <WarRoom
        onNext={() => setScreen("letter")}
        backendRunning={backendRunning}
        backendStatus={backendStatus}
        jobEvents={jobEvents}
      />
    ),
    letter: (
      <Letter
        caseResult={caseResult}
        onHistory={() => setScreen("history")}
        onProfile={() => setScreen("profile")}
      />
    ),
    history: (
      <History onNew={() => setScreen("landing")} onProfile={() => setScreen("profile")} />
    ),
    profile: (
      <Profile onBack={() => setScreen("history")} onNewCase={() => setScreen("landing")} />
    ),
    director: (
      <DirectorChat onBack={() => setScreen("landing")} onWorkspace={() => setScreen("profile")} />
    ),
  };

  return screens[screen] ?? screens.landing;
}
