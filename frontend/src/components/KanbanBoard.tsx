"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import { AIChatSidebar } from "@/components/AIChatSidebar";
import {
  boardCollaborators,
  cardMatchesQuery,
  createId,
  moveCard,
  type Board,
  type Card,
  type Priority,
} from "@/lib/kanban";

type KanbanBoardProps = {
  board: Board;
  onSave: (board: Board) => void;
  token: string;
};

export const KanbanBoard = ({ board, onSave, token }: KanbanBoardProps) => {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const cardsById = useMemo(() => board.cards, [board.cards]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);

    if (!over || active.id === over.id) {
      return;
    }

    onSave({
      ...board,
      columns: moveCard(board.columns, active.id as string, over.id as string),
    });
  };

  const handleRenameColumn = (columnId: string, title: string) => {
    onSave({
      ...board,
      columns: board.columns.map((column) =>
        column.id === columnId ? { ...column, title } : column
      ),
    });
  };

  const handleAddCard = (
    columnId: string,
    title: string,
    details: string,
    priority: Priority,
    dueDate: string | null,
    assigneeId: string | null
  ) => {
    const id = createId("card");
    onSave({
      ...board,
      cards: {
        ...board.cards,
        [id]: {
          id,
          title,
          details: details || "No details yet.",
          priority,
          dueDate,
          assigneeId,
        },
      },
      columns: board.columns.map((column) =>
        column.id === columnId
          ? { ...column, cardIds: [...column.cardIds, id] }
          : column
      ),
    });
  };

  const handleDeleteCard = (columnId: string, cardId: string) => {
    onSave({
      ...board,
      cards: Object.fromEntries(
        Object.entries(board.cards).filter(([id]) => id !== cardId)
      ),
      columns: board.columns.map((column) =>
        column.id === columnId
          ? {
              ...column,
              cardIds: column.cardIds.filter((id) => id !== cardId),
            }
          : column
      ),
    });
  };

  const handleUpdateCard = (
    _columnId: string,
    cardId: string,
    changes: { priority?: Priority; dueDate?: string | null; assigneeId?: string | null }
  ) => {
    const card = board.cards[cardId];
    if (!card) return;
    onSave({
      ...board,
      cards: { ...board.cards, [cardId]: { ...card, ...changes } },
    });
  };

  const activeCard = activeCardId ? cardsById[activeCardId] : null;
  const isSearching = searchQuery.trim().length > 0;
  const assignableUsers = useMemo(() => boardCollaborators(board), [board]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-6">
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search cards by title or details..."
          aria-label="Search cards"
          className="w-full max-w-md rounded-2xl border border-[var(--stroke)] bg-white px-4 py-2 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
        />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <section className="flex min-w-0 flex-1 gap-4 overflow-x-auto pb-2 xl:grid xl:grid-cols-5 xl:gap-6 xl:overflow-visible xl:pb-0">
            {board.columns.map((column) => {
              const columnCards = column.cardIds
                .map((cardId) => board.cards[cardId])
                .filter((card): card is Card => card !== undefined);
              const visibleCards = isSearching
                ? columnCards.filter((card) => cardMatchesQuery(card, searchQuery))
                : columnCards;

              return (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  cards={visibleCards}
                  assignableUsers={assignableUsers}
                  onRename={handleRenameColumn}
                  onAddCard={handleAddCard}
                  onDeleteCard={handleDeleteCard}
                  onUpdateCard={handleUpdateCard}
                />
              );
            })}
          </section>
          <AIChatSidebar board={board} token={token} onSave={onSave} />
        </div>
      </div>
      <DragOverlay>
        {activeCard ? (
          <div className="w-[260px]">
            <KanbanCardPreview card={activeCard} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
