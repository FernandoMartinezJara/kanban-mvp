import { useState, type FormEvent } from "react";
import type { Board } from "@/lib/kanban";

type ShareBoardMenuProps = {
  board: Board;
  onShare: (username: string) => Promise<void>;
  onUnshare: (memberId: string) => Promise<void>;
};

export const ShareBoardMenu = ({ board, onShare, onUnshare }: ShareBoardMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!board.isOwner) {
    return (
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">
        Shared by {board.ownerUsername}
      </p>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim()) return;
    setError(null);
    try {
      await onShare(username.trim());
      setUsername("");
    } catch (err) {
      setError(String(err));
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--primary-blue)] transition hover:brightness-110"
      >
        Share board{board.members.length > 0 ? ` (${board.members.length})` : ""}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Username to invite"
          aria-label="Share with username"
          className="w-44 rounded-full border border-[var(--stroke)] bg-white px-3 py-2 text-xs outline-none focus:border-[var(--primary-blue)]"
          required
        />
        <button
          type="submit"
          className="rounded-full bg-[var(--secondary-purple)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
        >
          Share
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setError(null);
          }}
          className="rounded-full border border-[var(--stroke)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
        >
          Close
        </button>
      </form>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {board.members.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {board.members.map((member) => (
            <li
              key={member.id}
              className="flex items-center gap-1.5 rounded-full border border-[var(--stroke)] bg-[var(--surface)] py-1 pl-3 pr-1 text-xs text-[var(--navy-dark)]"
            >
              {member.username}
              <button
                type="button"
                onClick={() => onUnshare(member.id)}
                aria-label={`Remove ${member.username} from this board`}
                title="Remove access"
                className="flex h-4 w-4 items-center justify-center rounded-full text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
              >
                <svg
                  width="10"
                  height="10"
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
