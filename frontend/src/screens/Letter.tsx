import { useState } from "react";
import { Button } from "../components/ui/Button";
import { Logo } from "../components/ui/Logo";
import {
  formatCitationDisplay,
  getLiveCitations,
  getLiveDeadline,
  getLiveLetter,
  getLiveRemedy,
  getLiveVerification,
} from "../lib/caseHelpers";
import { MOCK_CASE } from "../data/constants";
import type { CaseResult, Citation } from "../types";

const FALLBACK_CITATIONS: Citation[] = [
  { label: "NCD pattern", desc: "Medicare national coverage scaffolding", type: "Federal" },
  { label: "LCD excerpt", desc: "Local medical necessity articulation", type: "Local" },
  { label: "Appeals precedent", desc: "Parity between MA and Traditional Medicare", type: "Precedent" },
];

export function Letter({
  onHistory,
  onProfile,
  caseResult,
}: {
  onHistory: () => void;
  onProfile: () => void;
  caseResult: CaseResult | null;
}) {
  const [sent, setSent] = useState(false);
  const liveLetter = getLiveLetter(caseResult);
  const liveCitations = getLiveCitations(caseResult);
  const liveDeadline = getLiveDeadline(caseResult, MOCK_CASE.deadline);
  const liveVerification = getLiveVerification(caseResult);
  const liveRemedy = getLiveRemedy(caseResult);
  const citationCount = liveCitations ? liveCitations.length : FALLBACK_CITATIONS.length;

  const steps = [
    {
      step: "01",
      title: "Mail your carrier",
      detail: "Use the appeals address printed on your denial. Prefer certified mail with return receipt when available.",
      action: "Certified mail",
    },
    {
      step: "02",
      title: "Attach evidence",
      detail:
        "Include the denial notice, clinical records referenced in the letter, and cited policy PDFs as indexed exhibits.",
      action: "Exhibits indexed",
    },
    {
      step: "03",
      title: "Calendar deadline",
      detail: `${liveDeadline} — confirm against your plan notice and applicable regulations.`,
      action: "Set reminder",
      urgent: true,
    },
  ];

  return (
    <div className="min-h-screen bg-paper">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-paper-line bg-white/90 px-5 py-4 backdrop-blur-sm lg:px-10">
        <Logo />
        <nav className="flex flex-wrap gap-2" aria-label="Workspace">
          <Button variant="ghost" size="sm" onClick={onProfile}>
            Workspace
          </Button>
          <Button variant="ghost" size="sm" onClick={onHistory}>
            Case log
          </Button>
          <Button variant="accent" size="sm" onClick={() => setSent(true)} aria-pressed={sent}>
            {sent ? "Saved (demo)" : "Save draft"}
          </Button>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12 animate-fadeUp">
        <section
          className="rounded-2xl border border-clinical-border bg-clinical-faint p-6 md:flex md:items-start md:gap-5"
          role="status"
        >
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-clinical-border bg-white font-display text-lg font-semibold text-accent shadow-sm"
            aria-hidden
          >
            ✓
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">Draft appeal is ready for review</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">
              {citationCount} citation{citationCount === 1 ? "" : "s"} linked · posture{" "}
              <strong>{liveRemedy}</strong> · verification <strong>{liveVerification}</strong>
            </p>
          </div>
        </section>

        <h2 className="font-display mt-12 text-2xl font-semibold tracking-tight text-ink">Filing checklist</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <article
              key={s.title}
              className={`rounded-xl border bg-white p-5 ${
                s.urgent ? "border-accent/35 ring-1 ring-accent/25" : "border-paper-line"
              }`}
            >
              <div className="font-mono text-[11px] font-semibold text-ink/40">{s.step}</div>
              <h3 className="mt-2 font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink/60">{s.detail}</p>
              <span
                className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                  s.urgent ? "bg-clinical-faint text-accent border border-clinical-border/50" : "bg-paper-muted text-ink border border-paper-line"
                }`}
              >
                {s.action}
              </span>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">Letter body</h2>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigator.clipboard.writeText(liveLetter)}
              aria-label="Copy appeal text"
            >
              Copy
            </Button>
            <Button
              variant="accent"
              size="sm"
              onClick={() => window.open("/api/latest/letter.txt", "_blank", "noopener,noreferrer")}
            >
              Download TXT
            </Button>
          </div>
        </div>
        <article
          className="mt-4 max-h-[28rem] overflow-y-auto rounded-2xl border border-paper-line bg-white p-8 font-serif text-[15px] leading-relaxed text-ink shadow-sm"
          tabIndex={0}
        >
          <pre className="whitespace-pre-wrap font-[inherit]">{liveLetter}</pre>
        </article>

        <section className="mt-10 rounded-2xl border border-paper-line bg-white p-6">
          <h3 className="font-display text-lg font-semibold text-ink">Citations</h3>
          <ul className="mt-4 space-y-3">
            {(liveCitations ?? FALLBACK_CITATIONS).map((c, i) => {
              const { chip, label, desc } = formatCitationDisplay(c, i);
              return (
                <li
                  key={i}
                  className="flex flex-wrap items-start gap-3 rounded-xl bg-paper px-4 py-3 text-sm md:flex-nowrap"
                >
                  <span className="rounded-full bg-paper-muted px-2 py-0.5 text-xs font-semibold text-ink/80">
                    {chip}
                  </span>
                  <div>
                    <span className="font-semibold text-ink">{label}</span>
                    {desc ? <span className="text-ink/60"> — {desc}</span> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}
