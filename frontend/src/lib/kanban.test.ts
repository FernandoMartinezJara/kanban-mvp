import { cardMatchesQuery, isOverdue, moveCard, type Card, type Column } from "@/lib/kanban";

describe("moveCard", () => {
  const baseColumns: Column[] = [
    { id: "col-a", title: "A", cardIds: ["card-1", "card-2"] },
    { id: "col-b", title: "B", cardIds: ["card-3"] },
  ];

  it("reorders cards in the same column", () => {
    const result = moveCard(baseColumns, "card-2", "card-1");
    expect(result[0].cardIds).toEqual(["card-2", "card-1"]);
  });

  it("moves cards to another column", () => {
    const result = moveCard(baseColumns, "card-2", "card-3");
    expect(result[0].cardIds).toEqual(["card-1"]);
    expect(result[1].cardIds).toEqual(["card-2", "card-3"]);
  });

  it("drops cards to the end of a column", () => {
    const result = moveCard(baseColumns, "card-1", "col-b");
    expect(result[0].cardIds).toEqual(["card-2"]);
    expect(result[1].cardIds).toEqual(["card-3", "card-1"]);
  });
});

describe("cardMatchesQuery", () => {
  const card: Card = {
    id: "card-1",
    title: "Align roadmap themes",
    details: "Draft quarterly themes with impact statements.",
    priority: "medium",
    dueDate: null,
  };

  it("matches on title, case-insensitively", () => {
    expect(cardMatchesQuery(card, "roadmap")).toBe(true);
    expect(cardMatchesQuery(card, "ROADMAP")).toBe(true);
  });

  it("matches on details", () => {
    expect(cardMatchesQuery(card, "quarterly")).toBe(true);
  });

  it("returns false when nothing matches", () => {
    expect(cardMatchesQuery(card, "nonexistent")).toBe(false);
  });

  it("treats a blank query as matching everything", () => {
    expect(cardMatchesQuery(card, "")).toBe(true);
    expect(cardMatchesQuery(card, "   ")).toBe(true);
  });
});

describe("isOverdue", () => {
  const now = new Date("2026-01-10T12:00:00Z");

  it("returns false for a null due date", () => {
    expect(isOverdue(null, now)).toBe(false);
  });

  it("returns true when the due date is in the past", () => {
    expect(isOverdue("2026-01-01", now)).toBe(true);
  });

  it("returns false when the due date is today", () => {
    expect(isOverdue("2026-01-10", now)).toBe(false);
  });

  it("returns false when the due date is in the future", () => {
    expect(isOverdue("2026-02-01", now)).toBe(false);
  });
});
