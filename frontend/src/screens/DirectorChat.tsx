/**
 * Concierge: synchronous chat against POST /api/agent-chat.
 */
import { useCallback, useState } from "react";
import { apiJson, type AgentChatResponse } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Logo } from "../components/ui/Logo";

export function DirectorChat({
  onBack,
  onWorkspace,
}: {
  onBack: () => void;
  onWorkspace: () => void;
}) {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async () => {
    const text = message.trim();
    if (!text || loading) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiJson<AgentChatResponse>("/api/agent-chat", {
        method: "POST",
        body: JSON.stringify({ message: text }),
      });
      setReply(data.reply);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setReply(null);
    } finally {
      setLoading(false);
    }
  }, [message, loading]);

  return (
    <div className="min-h-screen bg-paper">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-paper-line bg-white/90 px-5 py-4 backdrop-blur-sm lg:px-10">
        <Logo />
        <nav className="flex flex-wrap gap-2" aria-label="Navigate">
          <Button variant="ghost" size="sm" onClick={onBack}>
            Home
          </Button>
          <Button variant="ghost" size="sm" onClick={onWorkspace}>
            Workspace
          </Button>
        </nav>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-10 animate-fadeUp">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Meridian Concierge</p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-ink">Assistant</h1>
        <p className="mt-2 max-w-xl text-ink/65 leading-relaxed">
          Natural-language control for your local stack. Try <strong>help</strong>,{" "}
          <strong>demo summary</strong>, or <strong>run demo case</strong> (executes the full pipeline on the server —
          may take a minute).
        </p>

        <div className="mt-8 space-y-4">
          <label htmlFor="director-message" className="block text-sm font-semibold text-ink">
            Message
          </label>
          <textarea
            id="director-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void send();
              }
            }}
            rows={4}
            className="w-full resize-y rounded-xl border border-paper-line bg-white px-4 py-3 text-ink placeholder:text-ink/35 focus:border-accent focus:ring-1 focus:ring-accent/25"
            placeholder="e.g. help"
            disabled={loading}
          />
          <p className="text-xs text-ink/45">Shortcut: Ctrl+Enter or ⌘+Enter to send.</p>
          <Button variant="accent" size="md" onClick={() => void send()} disabled={loading || !message.trim()}>
            {loading ? "Sending…" : "Send message"}
          </Button>
        </div>

        {error && (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
            {error}
          </div>
        )}

        <section className="mt-10" aria-label="Assistant reply">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink/45">Reply</h2>
          <div
            className="mt-2 min-h-[8rem] rounded-xl border border-paper-line bg-white p-5 font-mono text-sm leading-relaxed text-ink whitespace-pre-wrap shadow-sm"
            aria-live="polite"
            aria-busy={loading}
          >
            {reply ?? (loading ? "…" : "Send a message to see the assistant response.")}
          </div>
        </section>
      </main>
    </div>
  );
}
