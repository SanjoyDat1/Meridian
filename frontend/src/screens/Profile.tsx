import { useState } from "react";
import { Button } from "../components/ui/Button";
import { Logo } from "../components/ui/Logo";

const LANGUAGES = ["English", "Español", "中文", "Tagalog", "Tiếng Việt", "한국어"];

const SAMPLE_CASES = [
  { date: "Apr 25, 2026", denied: "SNF Care — Post-Hospital", amount: "$12,400", status: "Filed", color: "#2563eb" },
  { date: "Jan 12, 2026", denied: "MRI — Lumbar", amount: "$2,800", status: "Won", color: "#047857" },
];

export function Profile({ onBack, onNewCase }: { onBack: () => void; onNewCase: () => void }) {
  const [lang, setLang] = useState("English");
  const [notifs, setNotifs] = useState(true);

  return (
    <div className="min-h-screen bg-paper">
      <header className="flex items-center justify-between border-b border-paper-line bg-white/90 px-5 py-4 backdrop-blur-sm lg:px-10">
        <Logo />
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Case log
          </Button>
          <Button variant="accent" size="sm" onClick={onNewCase}>
            New intake
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-5 py-12 animate-fadeUp">
        <section className="rounded-2xl bg-accent p-8 text-white shadow-lift">
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/30 bg-white/15 font-display text-xl font-semibold text-white">
              GL
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-xl font-semibold text-white">Gene L.</h1>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Demo
                </span>
              </div>
              <p className="mt-1 font-mono text-xs text-white/75">meridian-local · Medicare narrative</p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["3", "Appeals tracked", "#2563eb"],
            ["$4.2k", "Illustrative recoveries", "#047857"],
            ["2/2", "Closed (sample)", "#0f766e"],
          ].map(([n, l, c]) => (
            <div key={String(n)} className="rounded-xl border border-paper-line bg-white p-4 text-center shadow-sm">
              <div className="font-display text-3xl font-semibold" style={{ color: c as string }}>
                {n}
              </div>
              <div className="text-xs text-ink/50">{l}</div>
            </div>
          ))}
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-paper-line bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-paper-line px-5 py-4">
            <h2 className="font-semibold text-ink">Recent cases</h2>
            <button type="button" className="text-sm font-semibold text-accent" onClick={onBack}>
              View log
            </button>
          </div>
          <ul>
            {SAMPLE_CASES.map((c, i) => (
              <li
                key={c.denied}
                className={`flex items-center gap-3 px-5 py-4 ${i ? "border-t border-paper-line" : ""}`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: c.color }} aria-hidden />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-ink">{c.denied}</div>
                  <div className="text-sm text-ink/50">
                    {c.date} · {c.amount}
                  </div>
                </div>
                <span className="text-xs font-semibold" style={{ color: c.color }}>
                  {c.status}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-2xl border border-paper-line bg-white shadow-sm">
          <div className="border-b border-paper-line px-5 py-4">
            <h2 className="font-semibold text-ink">Preferences</h2>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div>
              <div className="font-semibold text-ink">Language</div>
              <p className="text-sm text-ink/50">UI copy only in this evaluation build</p>
            </div>
            <label htmlFor="lang" className="sr-only">
              Interface language
            </label>
            <select
              id="lang"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="rounded-xl border border-paper-line bg-paper px-3 py-2 text-sm text-ink"
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-paper-line px-5 py-4">
            <div>
              <div className="font-semibold text-ink">Deadline reminders</div>
              <p className="text-sm text-ink/50">Notify before appeal windows close (demo toggle)</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={notifs}
              onClick={() => setNotifs((v) => !v)}
              className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${notifs ? "bg-accent" : "bg-paper-line"}`}
            >
              <span
                className="absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all"
                style={{ left: notifs ? "1.5rem" : "0.25rem" }}
              />
            </button>
          </div>
        </section>

        <p className="mt-8 rounded-xl border border-clinical-border/60 bg-clinical-faint p-4 text-sm leading-relaxed text-ink/70">
          Evaluation workspace — have a licensed professional review all generated filings before submission.
        </p>
      </main>
    </div>
  );
}
