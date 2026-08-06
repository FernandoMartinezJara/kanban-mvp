import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanBoard } from "@/components/KanbanBoard";
import { initialData, type Board } from "@/lib/kanban";

vi.mock("@/lib/api", () => ({
  sendAIBoardQuery: vi.fn().mockResolvedValue({ answer: "" }),
}));

const testBoard: Board = {
  id: "board-test",
  title: "Test Board",
  createdAt: "2024-01-01T00:00:00Z",
  isOwner: true,
  ownerUsername: "test-user",
  members: [],
  ...initialData,
};

const TestHarness = () => {
  const [board, setBoard] = useState<Board>(testBoard);
  return <KanbanBoard board={board} onSave={setBoard} token="test-token" />;
};

const getFirstColumn = () => screen.getAllByTestId(/column-/i)[0];

describe("KanbanBoard", () => {
  it("renders five columns", () => {
    render(<TestHarness />);
    expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
  });

  it("renames a column", async () => {
    render(<TestHarness />);
    const column = getFirstColumn();
    const input = within(column).getByLabelText("Column title");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    expect(input).toHaveValue("New Name");
  });

  it("adds and removes a card", async () => {
    render(<TestHarness />);
    const column = getFirstColumn();
    const addButton = within(column).getByRole("button", {
      name: /add a card/i,
    });
    await userEvent.click(addButton);

    const titleInput = within(column).getByPlaceholderText(/card title/i);
    await userEvent.type(titleInput, "New card");
    const detailsInput = within(column).getByPlaceholderText(/details/i);
    await userEvent.type(detailsInput, "Notes");

    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));

    expect(within(column).getByText("New card")).toBeInTheDocument();

    const deleteButton = within(column).getByRole("button", {
      name: /delete new card/i,
    });
    await userEvent.click(deleteButton);

    expect(within(column).queryByText("New card")).not.toBeInTheDocument();
  });

  it("creates a card with a chosen priority and due date", async () => {
    render(<TestHarness />);
    const column = getFirstColumn();
    await userEvent.click(within(column).getByRole("button", { name: /add a card/i }));

    await userEvent.type(within(column).getByPlaceholderText(/card title/i), "Ship release");
    await userEvent.selectOptions(within(column).getByLabelText("Priority"), "high");
    await userEvent.type(within(column).getByLabelText("Due date"), "2026-03-01");
    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));

    const card = within(column).getByText("Ship release").closest("article") as HTMLElement;
    expect(within(card).getByLabelText(/priority for ship release/i)).toHaveValue("high");
    expect(within(card).getByLabelText(/due date for ship release/i)).toHaveValue("2026-03-01");
  });

  it("edits a card's priority and due date after creation", async () => {
    render(<TestHarness />);
    const column = getFirstColumn();
    const card = within(column).getByTestId("card-card-1");

    await userEvent.selectOptions(
      within(card).getByLabelText(/priority for align roadmap themes/i),
      "high"
    );
    expect(within(card).getByLabelText(/priority for align roadmap themes/i)).toHaveValue(
      "high"
    );

    const dueDateInput = within(card).getByLabelText(/due date for align roadmap themes/i);
    await userEvent.type(dueDateInput, "2026-05-15");
    expect(dueDateInput).toHaveValue("2026-05-15");
  });

  it("filters cards by search query", async () => {
    render(<TestHarness />);
    const column = getFirstColumn();
    expect(within(column).getByText("Align roadmap themes")).toBeInTheDocument();
    expect(within(column).getByText("Gather customer signals")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Search cards"), "roadmap");

    expect(within(column).getByText("Align roadmap themes")).toBeInTheDocument();
    expect(within(column).queryByText("Gather customer signals")).not.toBeInTheDocument();
  });

  it("does not crash when a column references a missing card", () => {
    const BrokenHarness = () => {
      const [board, setBoard] = useState<Board>({
        ...testBoard,
        columns: testBoard.columns.map((column, index) =>
          index === 0
            ? { ...column, cardIds: [...column.cardIds, "missing-card"] }
            : column
        ),
      });
      return <KanbanBoard board={board} onSave={setBoard} token="test-token" />;
    };

    render(<BrokenHarness />);
    expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
  });
});
