import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { isOverdue, PRIORITY_LEVELS, type BoardMember, type Card, type Priority } from "@/lib/kanban";

type CardChanges = { priority?: Priority; dueDate?: string | null; assigneeId?: string | null };

type KanbanCardProps = {
  card: Card;
  assignableUsers: BoardMember[];
  onDelete: (cardId: string) => void;
  onUpdate: (cardId: string, changes: CardChanges) => void;
};

const PRIORITY_STYLES: Record<Priority, string> = {
  low: "bg-[var(--surface)] text-[var(--gray-text)]",
  medium: "bg-[rgba(32,157,215,0.12)] text-[var(--primary-blue)]",
  high: "bg-[rgba(236,173,10,0.18)] text-[#8a5a00]",
};

export const KanbanCard = ({ card, assignableUsers, onDelete, onUpdate }: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={clsx(
        "rounded-2xl border border-transparent bg-white px-4 py-4 shadow-[0_12px_24px_rgba(3,33,71,0.08)]",
        "transition-all duration-150",
        isDragging && "opacity-60 shadow-[0_18px_32px_rgba(3,33,71,0.16)]"
      )}
      {...attributes}
      {...listeners}
      data-testid={`card-${card.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-display text-base font-semibold text-[var(--navy-dark)]">
            {card.title}
          </h4>
          <p className="mt-2 text-sm leading-6 text-[var(--gray-text)]">
            {card.details}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDelete(card.id)}
          onPointerDown={(event) => event.stopPropagation()}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-transparent text-[var(--gray-text)] transition hover:border-[var(--stroke)] hover:bg-[var(--surface)] hover:text-[var(--navy-dark)]"
          aria-label={`Delete ${card.title}`}
          title="Delete card"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>
      <div
        className="mt-3 flex items-center gap-2"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <select
          value={card.priority}
          onChange={(event) =>
            onUpdate(card.id, { priority: event.target.value as Priority })
          }
          aria-label={`Priority for ${card.title}`}
          className={clsx(
            "rounded-full border border-transparent px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wide outline-none",
            PRIORITY_STYLES[card.priority]
          )}
        >
          {PRIORITY_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={card.dueDate ?? ""}
          onChange={(event) =>
            onUpdate(card.id, { dueDate: event.target.value || null })
          }
          aria-label={`Due date for ${card.title}`}
          className={clsx(
            "rounded-full border border-[var(--stroke)] bg-white px-2 py-1 text-[0.7rem] outline-none focus:border-[var(--primary-blue)]",
            isOverdue(card.dueDate) && "border-red-300 text-red-600"
          )}
        />
        <select
          value={card.assigneeId ?? ""}
          onChange={(event) =>
            onUpdate(card.id, { assigneeId: event.target.value || null })
          }
          aria-label={`Assignee for ${card.title}`}
          className="min-w-0 flex-1 rounded-full border border-[var(--stroke)] bg-white px-2 py-1 text-[0.7rem] text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)]"
        >
          <option value="">Unassigned</option>
          {assignableUsers.map((person) => (
            <option key={person.id} value={person.id}>
              {person.username}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
};
