"use client";

import { useState, type FormEvent } from "react";
import type { BoardData } from "@/lib/kanban";
import { saveKanban, sendAIQuery } from "@/lib/api";

type AIChatSidebarProps = {
  board: BoardData;
  token: string;
  setBoard: (board: BoardData) => void;
};

export const AIChatSidebar = ({ board, token, setBoard }: AIChatSidebarProps) => {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Array<{ role: string; text: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!prompt.trim()) return;

    setMessages((prev) => [...prev, { role: "user", text: prompt }]);
    setPrompt("");
    setLoading(true);
    setError(null);

    try {
      const data = await sendAIQuery(token, prompt, board);
      const answer = data.answer || "No response.";
      setMessages((prev) => [...prev, { role: "assistant", text: answer }]);

      if (data.board) {
        setBoard(data.board);
        await saveKanban(token, data.board);
      }
    } catch (err) {
      setError(String(err));
      setMessages((prev) => [...prev, { role: "assistant", text: `Error: ${String(err)}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="sticky top-6 h-[calc(100vh-3rem)] min-h-[640px] rounded-[32px] border border-[var(--stroke)] bg-white/90 p-6 shadow-[var(--shadow)]">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
            AI Assistant
          </p>
          <h2 className="text-xl font-semibold text-[var(--navy-dark)]">Board helper</h2>
        </div>
        <span className="rounded-full bg-[var(--accent-yellow)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white">
          beta
        </span>
      </div>

      <div className="mb-6 space-y-4 overflow-auto border-b border-[var(--stroke)] pb-4">
        {messages.length === 0 ? (
          <p className="text-sm text-[var(--gray-text)]">Ask the AI to suggest a board update or move a card.</p>
        ) : (
          messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className="space-y-1">
              <p className="text-[0.7rem] uppercase tracking-[0.25em] text-[var(--gray-text)]">
                {message.role === "user" ? "You" : "AI"}
              </p>
              <p className="rounded-2xl bg-[var(--surface)] p-3 text-sm leading-6 text-[var(--navy-dark)]">
                {message.text}
              </p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium text-[var(--navy-dark)]">
          Ask the AI
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={4}
            className="mt-2 w-full rounded-3xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--primary-blue)]"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-[var(--primary-blue)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--navy-dark)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Thinking..." : "Send to AI"}
        </button>
      </form>
    </aside>
  );
};
