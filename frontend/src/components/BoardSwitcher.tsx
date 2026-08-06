import { useState, type FormEvent } from "react";
import clsx from "clsx";
import type { BoardSummary } from "@/lib/kanban";

type BoardSwitcherProps = {
  boards: BoardSummary[];
  activeBoardId: string | null;
  onSelect: (boardId: string) => void;
  onCreate: (title: string) => void;
  onDelete: (boardId: string) => void;
};

export const BoardSwitcher = ({
  boards,
  activeBoardId,
  onSelect,
  onCreate,
  onDelete,
}: BoardSwitcherProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }
    onCreate(title.trim());
    setTitle("");
    setIsCreating(false);
  };

  const confirmDelete = (board: BoardSummary) => {
    if (window.confirm(`Delete "${board.title}"? This cannot be undone.`)) {
      onDelete(board.id);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {boards.map((board) => {
        const isActive = board.id === activeBoardId;
        return (
          <div
            key={board.id}
            className={clsx(
              "flex items-center gap-1.5 rounded-full border pl-4 pr-2 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition",
              isActive
                ? "border-[var(--primary-blue)] bg-[var(--primary-blue)] text-white"
                : "border-[var(--stroke)] text-[var(--navy-dark)] hover:border-[var(--primary-blue)]"
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(board.id)}
              aria-current={isActive}
              className="max-w-[16ch] truncate"
            >
              {board.title}
            </button>
            <button
              type="button"
              onClick={() => confirmDelete(board)}
              aria-label={`Delete board ${board.title}`}
              title="Delete board"
              className={clsx(
                "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full transition",
                isActive
                  ? "text-white/70 hover:text-white"
                  : "text-[var(--gray-text)] hover:text-[var(--navy-dark)]"
              )}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        );
      })}

      {isCreating ? (
        <form onSubmit={handleCreate} className="flex items-center gap-2">
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Board name"
            className="w-40 rounded-full border border-[var(--stroke)] bg-white px-4 py-2 text-xs font-semibold text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)]"
          />
          <button
            type="submit"
            className="rounded-full bg-[var(--secondary-purple)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => {
              setIsCreating(false);
              setTitle("");
            }}
            className="rounded-full border border-[var(--stroke)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="rounded-full border border-dashed border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-blue)] transition hover:border-[var(--primary-blue)]"
        >
          + New board
        </button>
      )}
    </div>
  );
};
