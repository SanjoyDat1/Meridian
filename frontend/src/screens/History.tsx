import { useEffect, useState } from "react";
import { apiJson, type HistoryResponse } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Logo } from "../components/ui/Logo";

const FALLBACK = [
  { date: "Apr 25, 2026", denied: "SNF Care — Post-Hospital", insurer: "UHC Medicare Advantage", amount: "$12,400", status: "Filed", confidence: 71, days: 0 },
  { date: "Jan 12, 2026", denied: "MRI — Lumbar", insurer: "Humana Gold Plus", amount: "$2,800", status: "Won", confidence: 82, days: 34 },
];

const statusTone: Record<string, string> = {
  Filed: "#2563eb",
  Won: "#047857",
  Lost: "#b91c1c",
  Pending: "#b45309",
  Closed: "#64748b",
};

export function History({ onNew, onProfile }: { onNew: () => void; onProfile: () => void }) {
  const [rows, setRows] = useState<HistoryResponse["cases"] | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "live" | "fallback">("loading");

  useEffect(() => {
    let cancel = false;
    apiJson<HistoryResponse>("/api/history")
      .then((data) => {
        if (cancel) return;
        setRows(data.cases || []);
        setLoadState(data.status === "ok" ? "live" : "fallback");
      })
      .catch(() => {
        if (!cancel) setLoadState("fallback");
      });
    return () => {
      cancel = true;
    };
  }, []);

  const cases = rows?.length ? rows : FALLBACK;

  return (
    <div className="min-h-screen bg-paper">
      <header className="flex items-center justify-between border-b border-paper-line bg-white/80 px-5 py-4 backdrop-blur-sm lg:px-10">
        <Logo />
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onProfile}>
            Workspace
          </Button>
          <Button variant="accent" size="sm" onClick={onNew}>
            New intake
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-5 py-12 animate-fadeUp">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">Case log</h1>
        <p className="mt-2 text-ink/60">
          {loadState === "loading" && "Loading appeal history…"}
          {loadState === "live" && "Connected to your configured appeal_history store."}
          {loadState === "fallback" && "Illustrative entries — API unavailable or no records yet."}
        </p>
        <ul className="mt-10 space-y-4">
          {cases.map((c, i) => (
            <li
              key={`hist-${i}`}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-paper-line bg-white p-5 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink">{c.denied}</span>
                  {c.status && (
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{
                        background: `${statusTone[c.status] ?? "#64748b"}18`,
                        color: statusTone[c.status] ?? "#64748b",
                      }}
                    >
                      {c.status}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-ink/55">
                  {c.insurer} · {c.date} · {c.amount}
                </p>
              </div>
              <div className="text-right">
                <div className="font-display text-2xl font-semibold text-accent">{c.confidence}%</div>
                <p className="text-xs text-ink/45">score{c.days ? ` · ${c.days}d` : ""}</p>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
