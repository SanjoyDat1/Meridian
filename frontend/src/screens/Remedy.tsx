import { useState } from "react";
import { Button } from "../components/ui/Button";
import { Logo } from "../components/ui/Logo";
import { StepRail } from "../components/ui/StepRail";
import type { Remedy } from "../types";
import { REMEDIES } from "../data/constants";

const STEPS = ["Documents", "Outcome", "Pipeline", "Letter"];

export function Remedy({ onNext }: { onNext: (r: Remedy) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const remedy = REMEDIES.find((r) => r.id === selected) ?? null;

  return (
    <div className="min-h-screen bg-paper">
      <header className="flex items-center justify-between border-b border-paper-line bg-white/90 px-6 py-4 lg:px-10">
        <Logo />
        <StepRail labels={STEPS} activeIndex={1} />
      </header>
      <div className="mx-auto max-w-3xl px-5 py-12 animate-fadeUp">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Step 2 of 4</p>
        <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight text-ink">Appeal posture</h1>
        <p className="mt-3 max-w-xl text-lg leading-relaxed text-ink/60">
          This selection maps to structured{" "}
          <code className="rounded-md bg-paper-muted px-1.5 py-0.5 text-sm text-ink/80">user_preferences</code> for the
          strategy engine before drafting.
        </p>

        <ul className="mt-10 space-y-4" role="listbox" aria-label="Remedy options">
          {REMEDIES.map((r) => {
            const active = selected === r.id;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setSelected(r.id)}
                  className={`w-full rounded-2xl border-2 p-6 text-left transition-all ${
                    active
                      ? "border-accent bg-accent-faint/80 shadow-lift"
                      : "border-paper-line bg-white hover:border-ink/12"
                  }`}
                  aria-selected={active}
                >
                  <div className="flex flex-wrap items-start gap-4">
                    <div
                      className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                        active ? "border-accent" : "border-paper-line"
                      }`}
                      aria-hidden
                    >
                      {active && <span className="h-3 w-3 rounded-full bg-accent" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-bold">{r.label}</h2>
                        <span
                          className="rounded-full px-3 py-0.5 text-xs font-bold uppercase"
                          style={{ background: `${r.tagColor}22`, color: r.tagColor }}
                        >
                          {r.tag}
                        </span>
                      </div>
                      <p className="mt-2 text-ink/65">{r.primary}</p>
                      <div className="mt-4 flex flex-wrap gap-8 text-sm">
                        <div>
                          <div className="text-ink/45">Confidence</div>
                          <div className="font-bold" style={{ color: r.tagColor }}>
                            {r.strength}
                          </div>
                        </div>
                        <div>
                          <div className="text-ink/45">Timeline</div>
                          <div className="font-bold text-ink">{r.timeline}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-10 flex justify-end">
          <Button variant="accent" size="lg" disabled={!remedy} onClick={() => remedy && onNext(remedy)}>
            Run analysis pipeline
          </Button>
        </div>
      </div>
    </div>
  );
}
