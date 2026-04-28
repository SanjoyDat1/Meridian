import { useState, type ReactNode } from "react";
import { Button } from "../components/ui/Button";
import { Logo } from "../components/ui/Logo";

type Voice = "direct" | "support" | "data";

const COPY: Record<
  Voice,
  { headline: ReactNode; sub: string }
> = {
  direct: {
    headline: (
      <>
        From denial notice to a
        <br />
        <span className="text-accent">file-ready</span> appeal package.
      </>
    ),
    sub: "Meridian structures intake, retrieves policy citations, and drafts an appeal you can review with counsel—running entirely on your stack.",
  },
  support: {
    headline: (
      <>
        A calm workflow for
        <br />
        <span className="text-accent">high-stakes</span> appeals.
      </>
    ),
    sub: "Guided steps from documents through strategy and letter, with live pipeline status while jobs execute on your local or hosted backend.",
  },
  data: {
    headline: (
      <>
        Transparent hand-offs,
        <br />
        <span className="text-ink/80">auditable</span> artifacts.
      </>
    ),
    sub: "Every stage emits structured JSON under your cases directory—parser through verification—so teams can inspect, diff, and version outputs.",
  },
};

export function Landing({
  onStart,
  onAccount,
  onDirector,
}: {
  onStart: () => void;
  onAccount: () => void;
  onDirector: () => void;
}) {
  const [voice, setVoice] = useState<Voice>("direct");
  const c = COPY[voice];

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="flex items-center justify-between border-b border-paper-line bg-white px-6 py-4 lg:px-12">
        <Logo />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onDirector} className="!border-transparent !shadow-none">
            Concierge
          </Button>
          <Button variant="ghost" size="sm" onClick={onAccount} className="!border-transparent !shadow-none">
            Workspace
          </Button>
          <Button variant="accent" size="sm" onClick={onStart}>
            Start intake
          </Button>
        </div>
      </header>

      <main className="grid flex-1 lg:grid-cols-2">
        <section className="flex flex-col justify-center px-6 py-14 lg:px-16 lg:py-20">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/45">
            Meridian · self-hosted evaluation
          </p>
          <h1 className="font-display text-4xl font-semibold leading-[1.08] text-ink sm:text-[2.75rem]">
            {c.headline}
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-ink/65">{c.sub}</p>

          <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Messaging emphasis">
            {(
              [
                ["direct", "Clinical"],
                ["support", "Guided"],
                ["data", "Technical"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setVoice(id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  voice === id
                    ? "bg-ink text-paper shadow-lift"
                    : "bg-white text-ink/70 ring-1 ring-paper-line hover:bg-paper-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button variant="accent" size="lg" onClick={onStart}>
              Begin document intake
            </Button>
            <span className="text-sm text-ink/50">
              No cloud account required · connects to your Meridian API
            </span>
          </div>
        </section>

        <section className="relative flex items-center justify-center bg-clinical-faint px-8 py-16 lg:min-h-[520px]">
          <div
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='72' height='72' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M36 0 L72 36 L36 72 L0 36 Z' fill='none' stroke='%23b91c1c' stroke-width='0.35'/%3E%3C/svg%3E")`,
            }}
          />
          <article
            className="relative w-full max-w-sm rounded-lg border border-paper-line bg-white p-7 text-ink shadow-lg"
            style={{ boxShadow: "0 20px 40px rgb(185 28 28 / 0.08), 0 8px 16px rgb(0 0 0 / 0.06)" }}
          >
            <header className="mb-4 flex justify-between border-b border-ink/10 pb-3">
              <div>
                <div className="text-xs font-semibold text-ink">UnitedHealthcare</div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-ink/45">
                  Adverse determination
                </div>
              </div>
              <div className="text-right text-[10px] font-mono text-ink/40">
                <div>Mar 28, 2026</div>
                <div>#UHC-2026-8847291</div>
              </div>
            </header>
            <p className="text-[11px] leading-relaxed text-ink/80">
              Skilled nursing care following inpatient stay — <strong>not medically necessary</strong> per internal
              criteria. Amount: <strong>$12,400.00</strong>
            </p>
            <div className="absolute right-5 top-[4.5rem] rotate-[10deg] rounded border border-rose-700/80 bg-rose-50 px-2 py-0.5 font-display text-base font-bold tracking-widest text-rose-800">
              DENIED
            </div>
            <p className="mt-4 border-t border-ink/10 pt-3 text-[10px] text-ink/45">
              You have the right to appeal. Calendar all deadlines from this notice.
            </p>
          </article>
        </section>
      </main>

      <footer className="border-t border-paper-line px-6 py-5 text-center text-xs leading-relaxed text-ink/50 lg:px-12 lg:text-left">
        <strong className="font-medium text-ink/65">Compliance:</strong> Meridian produces draft materials only.
        Licensed professionals should review every filing. PHI stays on infrastructure you control.
      </footer>
    </div>
  );
}
