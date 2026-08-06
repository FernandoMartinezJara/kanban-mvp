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
