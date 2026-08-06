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
import { createId, moveCard, type Board, type Card } from "@/lib/kanban";

type KanbanBoardProps = {
  board: Board;
  onSave: (board: Board) => void;
  token: string;
};

export const KanbanBoard = ({ board, onSave, token }: KanbanBoardProps) => {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

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

  const handleAddCard = (columnId: string, title: string, details: string) => {
    const id = createId("card");
    onSave({
      ...board,
      cards: {
        ...board.cards,
        [id]: { id, title, details: details || "No details yet." },
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

  const activeCard = activeCardId ? cardsById[activeCardId] : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <section className="flex min-w-0 flex-1 gap-4 overflow-x-auto pb-2 xl:grid xl:grid-cols-5 xl:gap-6 xl:overflow-visible xl:pb-0">
          {board.columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              cards={column.cardIds
                .map((cardId) => board.cards[cardId])
                .filter((card): card is Card => card !== undefined)}
              onRename={handleRenameColumn}
              onAddCard={handleAddCard}
              onDeleteCard={handleDeleteCard}
            />
          ))}
        </section>
        <AIChatSidebar board={board} token={token} onSave={onSave} />
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
