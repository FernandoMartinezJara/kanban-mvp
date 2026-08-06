import { useState, type FormEvent } from "react";

type EmptyBoardsStateProps = {
  onCreate: (title: string) => void;
};

export const EmptyBoardsState = ({ onCreate }: EmptyBoardsStateProps) => {
  const [title, setTitle] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }
    onCreate(title.trim());
    setTitle("");
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-[32px] border border-dashed border-[var(--stroke)] bg-white/60 p-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
        No boards yet
      </p>
      <h2 className="font-display text-2xl font-semibold text-[var(--navy-dark)]">
        Create your first board
      </h2>
      <p className="max-w-sm text-sm leading-6 text-[var(--gray-text)]">
        Boards keep a project&apos;s columns and cards together. Give it a name to get started.
      </p>
      <form onSubmit={handleSubmit} className="mt-2 flex w-full max-w-sm items-center gap-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Product Roadmap"
          className="w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--primary-blue)]"
          required
        />
        <button
          type="submit"
          className="whitespace-nowrap rounded-2xl bg-[var(--secondary-purple)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Create board
        </button>
      </form>
    </div>
  );
};
