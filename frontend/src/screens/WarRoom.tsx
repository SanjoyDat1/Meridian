import { useEffect, useMemo, useState } from "react";
import { AGENTS, MOCK_CASE } from "../data/constants";
import type { BackendStatus, CitFeedItem, JobEvent } from "../types";
import { Button } from "../components/ui/Button";
import { Logo } from "../components/ui/Logo";


const citColors: Record<string, string> = {
  federal_policy: "#b91c1c",
  local_coverage: "#991b1b",
  precedent: "#c2410c",
  case_law: "#dc2626",
  insurer_bulletin: "#7f1d1d",
};

/** Maps backend step names to War Room column index (visual order: intake, correspondence, clinical, policy, synthesis). */
const STEP_TO_AGENT: Record<string, number> = {
  doc_parser_agent: 0,
  seed_golden_artifacts: 0,
  personal_evidence_agent: 2,
  personal_evidence_claude_review: 2,
  contact_agent: 1,
  external_evidence_agent: 3,
  appeal_strategy_input: 4,
  appeal_strategy_agent: 4,
  drafting_agent_letter: 4,
  drafting_agent_packet: 4,
  verification: 4,
};

const FINAL_AGENT_STEPS = [
  "appeal_strategy_input",
  "appeal_strategy_agent",
  "drafting_agent_letter",
  "drafting_agent_packet",
  "verification",
];

const FEED_LABELS: Record<string, string> = {
  doc_parser_agent: "Document parser extracted denial details",
  seed_golden_artifacts: "Loaded parsed denial and patient facts",
  personal_evidence_agent: "Clinical evidence reviewed vs. extraction task",
  personal_evidence_claude_review: "Claude artifact: personal evidence review",
  contact_agent: "Contact agent prepared missing-information requests",
  external_evidence_agent: "External evidence agent returned citation-backed policy evidence",
  appeal_strategy_input: "Normalized strategy input contract",
  appeal_strategy_agent: "Appeal strategy generated argument chain",
  drafting_agent_letter: "Drafting agent produced appeal letter",
  drafting_agent_packet: "Final appeal packet assembled",
  verification: "Citation verification report generated",
};

const THEME_SKIN: Record<
  (typeof AGENTS)[number]["theme"],
  { card: string; ribbon: string; dot: string }
> = {
  intake: {
    card: "border-l-[6px] border-l-rose-700 bg-gradient-to-b from-rose-50/90 via-white to-white shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]",
    ribbon: "from-rose-800 to-rose-900",
    dot: "#9f1239",
  },
  correspondence: {
    card: "border-l-[6px] border-l-slate-600 bg-gradient-to-b from-slate-50/95 via-white to-slate-50/30",
    ribbon: "from-slate-700 to-slate-900",
    dot: "#475569",
  },
  clinical: {
    card: "border-l-[6px] border-l-teal-700 bg-gradient-to-b from-teal-50/85 via-white to-emerald-50/40",
    ribbon: "from-teal-700 to-emerald-900",
    dot: "#0f766e",
  },
  policy: {
    card: "border-l-[6px] border-l-amber-600 bg-gradient-to-b from-amber-50/90 via-white to-amber-50/25",
    ribbon: "from-amber-700 to-orange-900",
    dot: "#b45309",
  },
  synthesis: {
    card: "border-l-[6px] border-l-red-700 bg-gradient-to-br from-red-50/90 via-white to-stone-100/60",
    ribbon: "from-red-800 to-red-950",
    dot: "#b91c1c",
  },
};

function foldNarratives(events: JobEvent[]): string[] {
  const out = ["", "", "", "", ""];
  for (const e of events) {
    const idx = STEP_TO_AGENT[e.step];
    if (idx === undefined || !e.narrative?.trim()) continue;
    out[idx] = e.narrative.trim();
  }
  return out;
}

function TypewriterBlock({ text, isThinking }: { text: string; isThinking: boolean }) {
  const [revealed, setRevealed] = useState("");
  useEffect(() => {
    setRevealed("");
    if (!text) return;
    let i = 0;
    let id = 0;
    const tick = () => {
      const chunk = isThinking ? 1 : 3;
      i = Math.min(text.length, i + chunk);
      setRevealed(text.slice(0, i));
      if (i < text.length) id = window.setTimeout(tick, isThinking ? 26 : 12);
    };
    id = window.setTimeout(tick, isThinking ? 200 : 80);
    return () => window.clearTimeout(id);
  }, [text, isThinking]);
  if (!text) return <p className="text-xs italic text-ink/40">Awaiting specialist reasoning from the API…</p>;
  return (
    <p className="whitespace-pre-wrap text-[13px] leading-[1.65] text-ink/85">
      {revealed}
      {revealed.length < text.length ? <span className="ml-0.5 inline-block h-3 w-px animate-pulse bg-accent align-middle" /> : null}
    </p>
  );
}

export function WarRoom({
  onNext,
  backendRunning,
  backendStatus,
  jobEvents = [],
}: {
  onNext: () => void;
  backendRunning: boolean;
  backendStatus: BackendStatus | null;
  jobEvents: JobEvent[];
}) {
  const [agentPhase, setAgentPhase] = useState(0);
  const [agentLines, setAgentLines] = useState<number[]>(() => Array(5).fill(0));
  const [agentDone, setAgentDone] = useState<boolean[]>(() => Array(5).fill(false));
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [factsCount, setFactsCount] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [showNext, setShowNext] = useState(false);
  const [citFeed, setCitFeed] = useState<CitFeedItem[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [mockNarratives, setMockNarratives] = useState<string[]>(() => ["", "", "", "", ""]);

  const narrativeFromJob = useMemo(() => foldNarratives(jobEvents), [jobEvents]);
  const columnTouched = useMemo(() => {
    const t = [false, false, false, false, false];
    jobEvents.forEach((e) => {
      const i = STEP_TO_AGENT[e.step];
      if (i !== undefined) t[i] = true;
    });
    return t;
  }, [jobEvents]);
  const hasLiveEvents = jobEvents.length > 0;
  const columnNarratives = hasLiveEvents ? narrativeFromJob : mockNarratives;

  useEffect(() => {
    const t = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  /* Simulated crawl when no backend job stream (offline / preview). */
  useEffect(() => {
    const schedule: [number, () => void][] = [];
    if (backendRunning || jobEvents.length > 0) return undefined;
    let time = 800;
    AGENTS.forEach((agent, ai) => {
      schedule.push([time, () => setAgentPhase(ai)]);
      agent.steps.forEach((_, li) => {
        time += 520 + li * 90;
        schedule.push([
          time,
          () =>
            setAgentLines((prev) => {
              const n = [...prev];
              n[ai] = li + 1;
              return n;
            }),
        ]);
      });
      time += 400;
      schedule.push([
        time,
        () => {
          setAgentDone((prev) => {
            const n = [...prev];
            n[ai] = true;
            return n;
          });
          setDoneCount((c) => c + 1);
          setMockNarratives((prev) => {
            const n = [...prev];
            n[ai] = agent.simulatedNarrative;
            return n;
          });
          const factBumps = [0, 0, 4, 0, 0];
          const evidBumps = [0, 3, 0, 5, 0];
          setFactsCount((c) => c + (factBumps[ai] ?? 0));
          setEvidenceCount((c) => c + (evidBumps[ai] ?? 0));
        },
      ]);
      time += 550;
    });
    schedule.push([time + 600, () => setShowNext(true)]);
    const timers = schedule.map(([delay, fn]) => window.setTimeout(fn, delay));
    return () => timers.forEach(window.clearTimeout);
  }, [backendRunning, jobEvents.length]);

  useEffect(() => {
    if (!jobEvents.length) return;
    const done: boolean[] = Array(5).fill(false);
    const lines: number[] = Array(5).fill(0);
    let facts = 0;
    let evidence = 0;

    const intakeDone =
      jobEvents.some((e) => e.step === "seed_golden_artifacts" && e.status === "success") ||
      jobEvents.some((e) => e.step === "doc_parser_agent" && e.status === "success");
    const personalDone = jobEvents.some(
      (e) =>
        (e.step === "personal_evidence_agent" || e.step === "personal_evidence_claude_review") &&
        e.status === "success",
    );
    const contactDone = jobEvents.some((e) => e.step === "contact_agent" && e.status === "success");
    const externalDone = jobEvents.some(
      (e) => e.step === "external_evidence_agent" && e.status !== "running" && e.status !== "failed",
    );
    const verificationEvt = jobEvents.find((e) => e.step === "verification");
    const strategyChainDone =
      verificationEvt &&
      verificationEvt.status !== "running" &&
      verificationEvt.status !== "failed";

    done[0] = intakeDone;
    done[2] = personalDone;
    done[1] = contactDone;
    done[3] = externalDone;
    done[4] = Boolean(strategyChainDone);

    let active = 0;
    const runningEvt = [...jobEvents].reverse().find((e) => e.status === "running");
    if (runningEvt) {
      active = STEP_TO_AGENT[runningEvt.step] ?? 0;
    } else if (backendRunning) {
      const last = jobEvents[jobEvents.length - 1];
      active = last ? (STEP_TO_AGENT[last.step] ?? 0) : 0;
    } else {
      active = done.findIndex((d) => !d);
      if (active < 0) active = 4;
    }

    jobEvents.forEach((event) => {
      const index = STEP_TO_AGENT[event.step];
      if (index === undefined) return;
      if (index === 4) {
        const finalStepIndex = FINAL_AGENT_STEPS.indexOf(event.step);
        const cap = AGENTS[4]!.steps.length;
        lines[index] = Math.max(
          lines[index] ?? 0,
          Math.min(cap, (finalStepIndex >= 0 ? finalStepIndex + 1 : lines[index]) || 1),
        );
      } else {
        const cap = AGENTS[index]!.steps.length;
        lines[index] = Math.max(lines[index] ?? 0, Math.min(cap, 1 + (event.notes?.length ?? 0)));
      }
      if (event.step === "personal_evidence_agent" || event.step === "personal_evidence_claude_review")
        facts = Math.max(facts, 4);
      if (event.step === "external_evidence_agent") evidence = Math.max(evidence, 5);
    });

    if (backendRunning && verificationEvt?.status === "running") {
      done[4] = false;
    }

    setAgentPhase(active);
    setAgentDone(done);
    setAgentLines(lines);
    setFactsCount(facts);
    setEvidenceCount(evidence);
    setDoneCount(done.filter(Boolean).length);
    setShowNext(
      !backendRunning &&
        jobEvents.some(
          (e) => e.step === "verification" && e.status !== "running" && e.status !== "failed",
        ),
    );

    setCitFeed(
      jobEvents.slice(-8).map((event) => ({
        src: FEED_LABELS[event.step] || event.step.replace(/_/g, " "),
        text: event.narrative
          ? `${event.narrative.slice(0, 220)}${event.narrative.length > 220 ? "…" : ""}`
          : event.notes?.join(" · ") || event.status,
        type: event.status === "failed" ? "case_law" : "federal_policy",
      })),
    );
  }, [jobEvents, backendRunning]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-paper text-ink">
      <header className="flex flex-wrap items-center gap-6 border-b border-paper-line bg-accent px-5 py-4 text-white lg:px-8">
        <Logo inverted />
        <div className="flex flex-1 flex-wrap justify-end gap-8 text-sm">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/70">Focus</div>
            <div className="max-w-[14rem] truncate font-medium text-white">{MOCK_CASE.denied}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/70">Deadline</div>
            <div className="font-semibold text-white">{MOCK_CASE.deadline}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/70">Elapsed</div>
            <div className="font-mono text-white">
              {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-6 border-b border-paper-line bg-white px-5 py-4 lg:px-8">
        <div className="min-w-[200px] flex-1">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-ink/45">Pipeline stages</div>
          <div className="flex gap-1">
            {AGENTS.map((agent, ai) => (
              <div key={agent.id} className="flex-1">
                <div className="relative h-1.5 overflow-hidden rounded-full bg-paper-muted">
                  {agentPhase === ai && !agentDone[ai] && (
                    <div
                      className="absolute inset-y-0 w-[46%] animate-travel rounded-full opacity-90"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${agent.color}55, ${agent.color}, ${agent.color}55, transparent)`,
                      }}
                    />
                  )}
                  {agentDone[ai] && (
                    <div className="h-full rounded-full" style={{ backgroundColor: agent.color }} />
                  )}
                </div>
                <div
                  className={`mt-1 truncate text-[9px] font-semibold ${
                    agentDone[ai] || agentPhase === ai ? "!text-ink" : "!text-ink/40"
                  }`}
                >
                  {agent.codename}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-8">
          <Stat value={evidenceCount} label="Citations" tone="#b91c1c" />
          <Stat value={factsCount} label="Facts" tone="#404040" />
          <Stat value={`${doneCount}/5`} label="Stages" tone="#7f1d1d" />
        </div>
        {showNext && (
          <Button
            variant="accent"
            size="md"
            disabled={backendRunning}
            onClick={() => {
              if (!backendRunning) onNext();
            }}
            className="shrink-0"
          >
            {backendRunning ? "Generating…" : "Review outputs →"}
          </Button>
        )}
      </div>

      {backendStatus && (
        <div
          className={`border-b border-paper-line bg-white px-5 py-2 text-sm lg:px-8 ${
            backendStatus.type === "error" ? "!text-red-700 bg-clinical-faint" : "!text-ink/60"
          }`}
          role="status"
          aria-live="polite"
        >
          {backendStatus.message}
        </div>
      )}

      <div className="grid flex-1 grid-cols-1 overflow-hidden bg-paper-muted/40 lg:grid-cols-[repeat(5,minmax(0,1fr))_280px]">
        {AGENTS.map((agent, ai) => {
          const skin = THEME_SKIN[agent.theme];
          const isActive = agentPhase === ai && !agentDone[ai];
          const isDone = agentDone[ai];
          const isWaiting =
            hasLiveEvents && backendRunning && !columnTouched[ai] && !isActive && !isDone;
          const narrative = columnNarratives[ai] ?? "";
          return (
            <section
              key={agent.id}
              className={`flex min-h-[320px] flex-col border-b border-paper-line px-3 py-4 lg:min-h-0 lg:border-b-0 lg:border-r lg:px-4 lg:py-5 ${
                skin.card
              } ${isWaiting ? "opacity-[0.42]" : ""} ${
                isActive ? "ring-2 ring-inset ring-accent/35 shadow-md" : ""
              }`}
              aria-label={`${agent.codename} · ${agent.name}`}
            >
              <div
                className={`mb-3 rounded-lg bg-gradient-to-r ${skin.ribbon} px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-sm`}
              >
                {agent.codename}
              </div>
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white shadow"
                  style={{ backgroundColor: isDone ? "#15803d" : isActive ? skin.dot : "#a3a3a3" }}
                />
                <span className="text-[10px] font-mono uppercase tracking-wider text-ink/50">
                  {isDone ? "complete" : isActive ? "thinking" : "queued"}
                </span>
              </div>
              <h2 className="font-display text-base font-semibold leading-tight text-ink">{agent.name}</h2>
              <p className="mt-0.5 text-[11px] font-medium leading-snug text-ink/60">{agent.roleLine}</p>
              <p className="mt-1 text-[10px] italic text-ink/45">{agent.tagline}</p>

              <div className="mt-3 flex-1 overflow-y-auto rounded-xl border border-paper-line/80 bg-white/75 p-3 shadow-inner">
                <div className="mb-2 text-[9px] font-bold uppercase tracking-wider text-accent/90">
                  Live reasoning · prior context injected at API
                </div>
                <TypewriterBlock text={narrative} isThinking={isActive && Boolean(narrative)} />
              </div>

              <div className="mt-3 max-h-28 overflow-y-auto border-t border-paper-line/60 pt-2 font-mono text-[10px] leading-relaxed text-ink/55">
                {agent.steps.slice(0, agentLines[ai] ?? 0).map((line, li) => (
                  <div key={li} className="flex gap-1">
                    <span className="text-ink/25">›</span>
                    <span className={li === (agentLines[ai] ?? 0) - 1 && !isDone ? "font-medium text-ink/80" : ""}>
                      {line}
                    </span>
                  </div>
                ))}
                {isActive && (
                  <div className="mt-2 flex items-center gap-2 text-[11px]" style={{ color: agent.color }}>
                    <span
                      className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
                      aria-hidden
                    />
                    <span>Model synthesizing…</span>
                  </div>
                )}
              </div>
            </section>
          );
        })}
        <aside className="flex flex-col border-t border-paper-line bg-white p-4 lg:border-t-0" aria-label="Evidence stream">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-ink/45">Signal feed</div>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
            {citFeed.length === 0 && (
              <p className="text-sm italic text-ink/40">Awaiting agent telemetry…</p>
            )}
            {citFeed.map((c, i) => (
              <article
                key={`${c.src}-${i}`}
                className="rounded-xl border-l-4 border-paper-line bg-paper-muted/60 p-3 animate-fadeUp"
                style={{ borderLeftColor: citColors[c.type] || "#b91c1c" }}
              >
                <div className="text-[10px] font-bold uppercase" style={{ color: citColors[c.type] || "#b91c1c" }}>
                  {c.type.replace(/_/g, " ")}
                </div>
                <div className="mt-1 text-sm font-semibold text-ink">{c.src}</div>
                <p className="mt-1 text-xs text-ink/55">{c.text}</p>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ value, label, tone }: { value: number | string; label: string; tone: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-3xl font-semibold" style={{ color: tone }}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-ink/45">{label}</div>
    </div>
  );
}