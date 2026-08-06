import type { Board, BoardSummary } from "@/lib/kanban";
import { BoardSwitcher } from "@/components/BoardSwitcher";

type AppHeaderProps = {
  username: string;
  board: Board | null;
  boards: BoardSummary[];
  saving: boolean;
  error: string | null;
  onSelectBoard: (boardId: string) => void;
  onCreateBoard: (title: string) => void;
  onDeleteBoard: (boardId: string) => void;
  onRenameBoard: (title: string) => void;
  onLogout: () => void;
};

export const AppHeader = ({
  username,
  board,
  boards,
  saving,
  error,
  onSelectBoard,
  onCreateBoard,
  onDeleteBoard,
  onRenameBoard,
  onLogout,
}: AppHeaderProps) => {
  return (
    <header className="flex flex-col gap-6 rounded-[32px] border border-[var(--stroke)] bg-white/80 p-8 shadow-[var(--shadow)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
            Signed in as {username}
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-[var(--navy-dark)]">
            Kanban Studio
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--gray-text)]">
            Keep momentum visible. Rename columns, drag cards between stages,
            and capture quick notes without getting buried in settings.
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">
            Current board
          </p>
          {board ? (
            <input
              value={board.title}
              onChange={(event) => onRenameBoard(event.target.value)}
              className="mt-2 w-full bg-transparent text-lg font-semibold text-[var(--primary-blue)] outline-none"
              aria-label="Board title"
            />
          ) : (
            <p className="mt-2 text-lg font-semibold text-[var(--primary-blue)]">
              No board selected
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <BoardSwitcher
          boards={boards}
          activeBoardId={board?.id ?? null}
          onSelect={onSelectBoard}
          onCreate={onCreateBoard}
          onDelete={onDeleteBoard}
        />
        <div className="flex items-center gap-3">
          <p className="text-sm text-[var(--gray-text)]">
            {saving ? "Saving..." : error ? `Error: ${error}` : "Changes saved"}
          </p>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-2xl border border-[var(--stroke)] bg-white/90 px-4 py-2 text-sm font-semibold text-[var(--navy-dark)] transition hover:bg-[var(--surface)]"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};
