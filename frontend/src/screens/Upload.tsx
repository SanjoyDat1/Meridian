import { useCallback, useEffect, useRef, useState } from "react";
import { apiJson, type DemoCaseInfo } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Logo } from "../components/ui/Logo";
import { StepRail } from "../components/ui/StepRail";
import { Tag } from "../components/ui/Tag";
import type { UploadPayload } from "../types";

const STEPS = ["Documents", "Outcome", "Pipeline", "Letter"];

function fileKey(f: File) {
  return `${f.name}:${f.size}:${f.lastModified}`;
}

export function Upload({ onNext }: { onNext: (p: UploadPayload) => void }) {
  const [denialLabel, setDenialLabel] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [supportingFiles, setSupportingFiles] = useState<File[]>([]);
  const [useDemo, setUseDemo] = useState(false);
  const [story, setStory] = useState("");
  const [demoCase, setDemoCase] = useState<DemoCaseInfo | null>(null);
  const [demoMetaState, setDemoMetaState] = useState<"loading" | "ok" | "error">("loading");
  const [demoMetaErrorDetail, setDemoMetaErrorDetail] = useState("");
  const [demoOpen, setDemoOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const supportingInputRef = useRef<HTMLInputElement>(null);

  const fetchDemoMeta = useCallback(() => {
    setDemoMetaState("loading");
    setDemoMetaErrorDetail("");
    apiJson<DemoCaseInfo>("/api/demo-case")
      .then((data) => {
        setDemoCase(data);
        setDemoMetaState("ok");
      })
      .catch((err) => {
        setDemoCase(null);
        setDemoMetaState("error");
        setDemoMetaErrorDetail(err instanceof Error ? err.message : "Request failed");
      });
  }, []);

  useEffect(() => {
    fetchDemoMeta();
  }, [fetchDemoMeta]);

  const ready = Boolean(denialLabel);

  return (
    <div className="min-h-screen bg-paper">
      <header className="flex items-center justify-between border-b border-paper-line bg-white/80 px-6 py-4 backdrop-blur-sm lg:px-10">
        <Logo />
        <p className="text-sm text-ink/50">Connected workspace · evaluation build</p>
      </header>
      <div className="mx-auto max-w-2xl px-5 py-12 animate-fadeUp">
        <StepRail labels={STEPS} activeIndex={0} />
        <h1 className="font-display mt-10 text-4xl font-semibold tracking-tight text-ink">
          Denial documentation
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-ink/60">
          Start with the denial letter or EOB, then add anything that helps Meridian reason about medical necessity and
          coverage — clinical notes, imaging summaries, PT plans, prior-authorization letters, plan documents, and related
          EOBs. Files are sent only to your Meridian API; nothing leaves your environment unless you configure it.
        </p>

        {demoMetaState === "loading" ? (
          <section
            className="mt-8 rounded-2xl border border-paper-line bg-white p-5 text-sm text-ink/60 shadow-sm"
            aria-live="polite"
          >
            Loading bundled demonstration metadata from <span className="font-mono text-xs">/api/demo-case</span>…
          </section>
        ) : null}

        {demoMetaState === "ok" && demoCase ? (
          <section
            className="mt-8 rounded-2xl border border-clinical-border/60 bg-clinical-faint/50 p-5 shadow-sm"
            aria-label="Bundled demonstration case"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Bundled demo file</p>
                <h2 className="font-display mt-1 text-lg font-semibold text-ink">{demoCase.filename}</h2>
                <p className="mt-1 font-mono text-xs text-ink/50">{demoCase.relative_path}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink/70">{demoCase.summary}</p>
                <p className="mt-2 text-xs text-ink/50">
                  Case ID <span className="font-mono font-medium text-ink">{demoCase.case_id}</span>
                  {demoCase.insurer ? (
                    <>
                      {" "}
                      · <span className="text-ink/70">{demoCase.insurer}</span>
                    </>
                  ) : null}
                </p>
              </div>
              <Button variant="ghost" size="sm" type="button" onClick={() => setDemoOpen((o) => !o)}>
                {demoOpen ? "Hide JSON" : "Show JSON preview"}
              </Button>
            </div>
            {demoOpen && (
              <pre
                className="mt-4 max-h-72 overflow-auto rounded-xl border border-paper-line bg-white p-4 text-left text-[11px] leading-relaxed text-ink/80 font-mono"
                tabIndex={0}
              >
                {demoCase.preview_json}
              </pre>
            )}
            <p className="mt-3 text-xs text-ink/45">
              Each pipeline stage can use <strong className="text-ink/60">Claude</strong> for critical reasoning (parser,
              contact, retrieval planning, strategy tool, draft tool, verification narrative). Demo uses this golden JSON as
              intake unless you upload your own files.
            </p>
          </section>
        ) : null}

        {demoMetaState === "error" ? (
          <section
            className="mt-8 rounded-2xl border border-red-200/90 bg-red-50/80 p-5 shadow-sm"
            aria-live="assertive"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-red-800/90">Demo unavailable</p>
            <p className="mt-2 text-sm font-medium text-red-950">The demo button stays off until this loads.</p>
            <p className="mt-2 text-sm leading-relaxed text-red-900/85">
              Start the Meridian API on{" "}
              <code className="rounded bg-white/90 px-1.5 py-0.5 font-mono text-xs text-ink">127.0.0.1:8000</code> (or
              match your Vite proxy in <span className="font-mono text-xs">vite.config.ts</span>). From the project root,
              run your usual <span className="font-mono text-xs">uvicorn</span> command so{" "}
              <span className="font-mono text-xs">/api/demo-case</span> returns 200. Then click Retry.
            </p>
            <p className="mt-2 font-mono text-xs text-red-800/80">{demoMetaErrorDetail}</p>
            <Button variant="ghost" size="sm" type="button" className="mt-3 border border-red-200" onClick={fetchDemoMeta}>
              Retry loading demo
            </Button>
          </section>
        ) : null}

        <section className="mt-10 rounded-2xl border border-paper-line bg-white p-6 shadow-sm">
          <div className="flex gap-5">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-paper-line bg-paper-muted font-mono text-xs font-semibold text-ink/50"
              aria-hidden
            >
              PDF
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-ink">Primary denial artifact</h2>
                <Tag label="Required" color="#b91c1c" />
              </div>
              <p className="mt-1 text-sm leading-relaxed text-ink/55">
                The intake service extracts CPT/ICD cues and deadlines when your parser pipeline runs.
              </p>
              {denialLabel ? (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-clinical-border/40 bg-clinical-faint px-4 py-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                    ✓
                  </span>
                  <span className="font-medium text-ink truncate">{denialLabel}</span>
                  <button
                    type="button"
                    className="ml-auto text-lg leading-none text-ink/35 hover:text-ink"
                    onClick={() => {
                      setDenialLabel(null);
                      setFile(null);
                      setUseDemo(false);
                      setSupportingFiles([]);
                    }}
                    aria-label="Remove file"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="w-full rounded-xl border-2 border-dashed border-paper-line bg-paper-muted/40 px-6 py-10 text-center transition-colors hover:border-accent/50 hover:bg-accent-faint/30"
                  >
                    <span className="font-semibold text-ink">Choose file</span>
                    <span className="mt-1 block text-sm text-ink/50">PDF · TXT · PNG · JPG</span>
                  </button>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.txt"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setFile(f);
                        setUseDemo(false);
                        setDenialLabel(f.name);
                      }
                      e.target.value = "";
                    }}
                    aria-label="Upload denial document"
                  />
                  <div className="mt-4 space-y-3">
                    <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={demoMetaState !== "ok" || !demoCase}
                      onClick={() => {
                        if (!demoCase) return;
                        setDenialLabel(demoCase.filename);
                        setFile(null);
                        setSupportingFiles([]);
                        setUseDemo(true);
                        setStory(demoCase.patient_narrative || "");
                      }}
                    >
                      {demoMetaState === "loading"
                        ? "Loading demo bundle…"
                        : demoMetaState === "error"
                          ? "Use bundled demo (API offline)"
                          : `Use bundled demo (${demoCase?.filename ?? "golden case"})`}
                    </Button>
                    </div>
                    {demoMetaState === "error" ? (
                      <p className="text-center text-xs text-ink/50">
                        Fix the connection above, then this button will activate.
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-paper-line bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-ink">Supporting documents</h2>
            <Tag label="Recommended" color="#475569" />
          </div>
          <p className="mt-1 text-sm leading-relaxed text-ink/55">
            The stronger the fact pattern behind your appeal, the better strategy and drafting can be. Add PT or therapy
            notes, operative or imaging summaries, treating-physician letters, prior-authorization or peer-to-peer
            outcomes, plan or evidence-of-coverage excerpts, and any related EOBs or carrier letters. Each file is
            classified and merged into the intake the pipeline sees.
          </p>
          {useDemo ? (
            <p className="mt-3 rounded-lg border border-amber-200/90 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950/90">
              The bundled demo runs only from the golden JSON — files you add here are{" "}
              <span className="font-semibold">not</span> uploaded for that path. Upload your own denial as the primary
              artifact to include supporting documents in a live run.
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {supportingFiles.map((f) => (
              <span
                key={fileKey(f)}
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-paper-line bg-paper-muted/50 px-3 py-1.5 text-sm text-ink"
              >
                <span className="truncate">{f.name}</span>
                <button
                  type="button"
                  className="shrink-0 text-lg leading-none text-ink/35 hover:text-ink"
                  aria-label={`Remove ${f.name}`}
                  onClick={() =>
                    setSupportingFiles((prev) => prev.filter((x) => fileKey(x) !== fileKey(f)))
                  }
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <button
            type="button"
            disabled={useDemo}
            onClick={() => supportingInputRef.current?.click()}
            className="mt-3 w-full rounded-xl border-2 border-dashed border-paper-line bg-paper-muted/30 px-4 py-6 text-center text-sm font-medium text-ink transition-colors enabled:hover:border-accent/50 enabled:hover:bg-accent-faint/30 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {useDemo ? "Add files after switching to your own denial" : "Add supporting files (multi-select)"}
          </button>
          <input
            ref={supportingInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.txt"
            className="sr-only"
            onChange={(e) => {
              const list = e.target.files;
              if (list?.length) {
                setSupportingFiles((prev) => [...prev, ...Array.from(list)]);
              }
              e.target.value = "";
            }}
            aria-label="Upload supporting documents"
          />
        </section>

        <section className="mt-6 rounded-2xl border border-paper-line bg-white p-6">
          <h2 className="text-lg font-semibold text-ink">Patient narrative (optional)</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink/55">
            Your own words fill gaps the denial letter may omit — functional limitations, timeline of care, what you
            tried before the denied service, and why it matters for safety or recovery. This seeds appeal reasoning, not
            only parsing.
          </p>
          <label htmlFor="narrative" className="sr-only">
            Patient narrative
          </label>
          <textarea
            id="narrative"
            value={story}
            onChange={(e) => setStory(e.target.value)}
            rows={5}
            placeholder="Example: I was discharged after surgery and required SNF for wound care and therapy…"
            className="mt-4 w-full resize-y rounded-xl border border-paper-line bg-paper px-4 py-3 text-base text-ink placeholder:text-ink/35 focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
        </section>

        {useDemo && demoCase && (demoCase.autofill_items?.length ?? 0) > 0 ? (
          <section
            className="mt-6 rounded-2xl border border-accent/30 bg-accent-faint/35 p-6 shadow-sm"
            aria-label="Demo autofill summary"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Demo autofill</p>
            <h2 className="font-display mt-1 text-lg font-semibold text-ink">What we prefilled</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink/60">
              The demonstration uses the bundled golden case. Below is exactly what was applied to this screen; you can
              still edit the narrative before continuing.
            </p>
            <ul className="mt-4 space-y-3">
              {demoCase.autofill_items.map((item) => (
                <li key={item.id} className="rounded-xl border border-paper-line bg-white/95 px-4 py-3 shadow-sm">
                  <p className="text-sm font-semibold text-ink">{item.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink/70">{item.detail}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-paper-line pt-6">
          <p className="text-sm text-ink/50" role="status">
            {ready
              ? useDemo
                ? "Demo intake ready — review prefilled details above"
                : supportingFiles.length > 0
                  ? `Ready with ${supportingFiles.length} supporting file${supportingFiles.length === 1 ? "" : "s"}`
                  : "Ready for outcome selection"
              : "Upload a document or select the demonstration file"}
          </p>
          <Button
            variant="accent"
            size="lg"
            disabled={!ready}
            onClick={() =>
              onNext({
                denialFile: file,
                supportingFiles,
                useDemo,
                patientNarrative: story,
              })
            }
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
