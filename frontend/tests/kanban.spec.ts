import { expect, test, type Page, type Route } from "@playwright/test";

type MockColumn = { id: string; title: string; cardIds: string[] };
type MockCard = {
  id: string;
  title: string;
  details: string;
  priority: "low" | "medium" | "high";
  dueDate: string | null;
};
type MockBoard = {
  id: string;
  title: string;
  createdAt: string;
  ownerId: string;
  memberIds: string[];
  columns: MockColumn[];
  cards: Record<string, MockCard>;
};

const seedBoard: MockBoard = {
  id: "board-1",
  title: "Product Roadmap",
  createdAt: "2024-01-01T00:00:00.000Z",
  ownerId: "user-1",
  memberIds: [],
  columns: [
    { id: "col-backlog", title: "Backlog", cardIds: ["card-1", "card-2"] },
    { id: "col-discovery", title: "Discovery", cardIds: ["card-3"] },
    { id: "col-progress", title: "In Progress", cardIds: ["card-4"] },
    { id: "col-review", title: "Review", cardIds: ["card-5"] },
    { id: "col-done", title: "Done", cardIds: ["card-6"] },
  ],
  cards: {
    "card-1": {
      id: "card-1",
      title: "Align roadmap themes",
      details: "Draft quarterly themes.",
      priority: "medium",
      dueDate: null,
    },
    "card-2": {
      id: "card-2",
      title: "Gather customer signals",
      details: "Review feedback.",
      priority: "low",
      dueDate: null,
    },
    "card-3": {
      id: "card-3",
      title: "Prototype analytics view",
      details: "Sketch dashboard.",
      priority: "medium",
      dueDate: null,
    },
    "card-4": {
      id: "card-4",
      title: "Refine status language",
      details: "Standardize labels.",
      priority: "high",
      dueDate: "2026-01-01",
    },
    "card-5": {
      id: "card-5",
      title: "QA micro-interactions",
      details: "Verify hover states.",
      priority: "low",
      dueDate: null,
    },
    "card-6": {
      id: "card-6",
      title: "Ship marketing page",
      details: "Approve final copy.",
      priority: "high",
      dueDate: null,
    },
  },
};

const secondBoard: MockBoard = {
  id: "board-2",
  title: "Marketing Launch",
  createdAt: "2024-01-02T00:00:00.000Z",
  ownerId: "user-1",
  memberIds: [],
  columns: [
    { id: "col-backlog-2", title: "Backlog", cardIds: [] },
    { id: "col-discovery-2", title: "Discovery", cardIds: [] },
    { id: "col-progress-2", title: "In Progress", cardIds: [] },
    { id: "col-review-2", title: "Review", cardIds: [] },
    { id: "col-done-2", title: "Done", cardIds: [] },
  ],
  cards: {},
};

const mockBackend = async (page: Page, initialBoards: MockBoard[] = [seedBoard]) => {
  const boards = new Map(initialBoards.map((entry) => [entry.id, structuredClone(entry)]));
  const users = new Map<string, string>([["user-1", "user"]]);
  let nextBoardId = boards.size + 1;
  let nextUserId = 2;

  const userIdFromRequest = (route: Route) => {
    const auth = route.request().headers()["authorization"] ?? "";
    const match = auth.match(/^Bearer token-(.+)$/);
    return match ? match[1] : "user-1";
  };

  const boardResponse = (board: MockBoard, viewerId: string) => ({
    ...board,
    isOwner: board.ownerId === viewerId,
    ownerUsername: users.get(board.ownerId) ?? "unknown",
    members: board.memberIds.map((id) => ({ id, username: users.get(id) ?? "unknown" })),
  });

  const boardSummary = (board: MockBoard, viewerId: string) => ({
    id: board.id,
    title: board.title,
    createdAt: board.createdAt,
    isOwner: board.ownerId === viewerId,
    ownerUsername: users.get(board.ownerId) ?? "unknown",
  });

  await page.route("**/api/auth/login", (route) => {
    const body = route.request().postDataJSON();
    const existing = Array.from(users.entries()).find(([, username]) => username === body.username);
    if (!existing) {
      return route.fulfill({ status: 401, json: { detail: "Invalid credentials" } });
    }
    const [id, username] = existing;
    return route.fulfill({ json: { token: `token-${id}`, user: { id, username } } });
  });
  await page.route("**/api/auth/register", (route) => {
    const body = route.request().postDataJSON();
    if (Array.from(users.values()).includes(body.username)) {
      return route.fulfill({ status: 409, json: { detail: "Username already taken" } });
    }
    const id = `user-${nextUserId++}`;
    users.set(id, body.username);
    return route.fulfill({
      status: 201,
      json: { token: `token-${id}`, user: { id, username: body.username } },
    });
  });
  await page.route("**/api/auth/me", (route) => {
    const id = userIdFromRequest(route);
    return route.fulfill({ json: { id, username: users.get(id) ?? "unknown" } });
  });
  await page.route("**/api/auth/logout", (route) => route.fulfill({ status: 204, body: "" }));
  await page.route("**/api/auth/change-password", (route) => {
    const body = route.request().postDataJSON();
    if (body.currentPassword !== "password") {
      return route.fulfill({ status: 401, json: { detail: "Current password is incorrect" } });
    }
    const id = userIdFromRequest(route);
    return route.fulfill({ json: { id, username: users.get(id) ?? "unknown" } });
  });

  await page.route("**/api/boards", (route) => {
    const method = route.request().method();
    const userId = userIdFromRequest(route);
    if (method === "GET") {
      const visible = Array.from(boards.values()).filter(
        (board) => board.ownerId === userId || board.memberIds.includes(userId)
      );
      return route.fulfill({ json: visible.map((board) => boardSummary(board, userId)) });
    }
    if (method === "POST") {
      const body = route.request().postDataJSON();
      const id = `board-${nextBoardId++}`;
      const created: MockBoard = {
        id,
        title: body.title,
        createdAt: new Date().toISOString(),
        ownerId: userId,
        memberIds: [],
        columns: [
          { id: `${id}-backlog`, title: "Backlog", cardIds: [] },
          { id: `${id}-discovery`, title: "Discovery", cardIds: [] },
          { id: `${id}-progress`, title: "In Progress", cardIds: [] },
          { id: `${id}-review`, title: "Review", cardIds: [] },
          { id: `${id}-done`, title: "Done", cardIds: [] },
        ],
        cards: {},
      };
      boards.set(id, created);
      return route.fulfill({ status: 201, json: boardResponse(created, userId) });
    }
    return route.continue();
  });

  await page.route("**/api/boards/*/share", (route) => {
    const url = new URL(route.request().url());
    const boardId = url.pathname.split("/").slice(-2, -1)[0];
    const userId = userIdFromRequest(route);
    const board = boards.get(boardId);
    if (!board || board.ownerId !== userId) {
      return route.fulfill({ status: 404, json: { detail: "Board not found" } });
    }
    const body = route.request().postDataJSON();
    const target = Array.from(users.entries()).find(([, username]) => username === body.username);
    if (!target) {
      return route.fulfill({ status: 404, json: { detail: "User not found" } });
    }
    const [targetId] = target;
    if (targetId === userId) {
      return route.fulfill({ status: 400, json: { detail: "You already own this board" } });
    }
    if (!board.memberIds.includes(targetId)) {
      board.memberIds.push(targetId);
    }
    return route.fulfill({ json: boardResponse(board, userId) });
  });

  await page.route("**/api/boards/*/share/*", (route) => {
    if (route.request().method() !== "DELETE") return route.continue();
    const url = new URL(route.request().url());
    const segments = url.pathname.split("/");
    const memberId = segments.pop() as string;
    segments.pop();
    const boardId = segments.pop() as string;
    const userId = userIdFromRequest(route);
    const board = boards.get(boardId);
    if (!board || board.ownerId !== userId) {
      return route.fulfill({ status: 404, json: { detail: "Board not found" } });
    }
    board.memberIds = board.memberIds.filter((id) => id !== memberId);
    return route.fulfill({ json: boardResponse(board, userId) });
  });

  await page.route("**/api/boards/*", (route) => {
    const url = new URL(route.request().url());
    const id = url.pathname.split("/").pop() as string;
    const method = route.request().method();
    const userId = userIdFromRequest(route);

    if (method === "GET") {
      const found = boards.get(id);
      if (!found) return route.fulfill({ status: 404, json: { detail: "Board not found" } });
      return route.fulfill({ json: boardResponse(found, userId) });
    }
    if (method === "PUT") {
      const body = route.request().postDataJSON();
      const existing = boards.get(id) as MockBoard;
      const updated: MockBoard = {
        ...existing,
        ...body,
        id,
        ownerId: existing.ownerId,
        memberIds: existing.memberIds,
      };
      boards.set(id, updated);
      return route.fulfill({ json: boardResponse(updated, userId) });
    }
    if (method === "DELETE") {
      boards.delete(id);
      return route.fulfill({ status: 204, body: "" });
    }
    return route.continue();
  });

  await page.goto("/");
};

test("edits a card's priority and due date, flagging an overdue date", async ({ page }) => {
  await mockBackend(page);
  await page.getByRole("button", { name: "Sign in" }).click();
  const card = page.getByTestId("card-card-1");

  await card.getByLabel(/priority for align roadmap themes/i).selectOption("high");
  await expect(card.getByLabel(/priority for align roadmap themes/i)).toHaveValue("high");

  const dueDateInput = card.getByLabel(/due date for align roadmap themes/i);
  await expect(dueDateInput).not.toHaveClass(/text-red-600/);
  await dueDateInput.fill("2020-01-01");
  await dueDateInput.blur();
  await expect(dueDateInput).toHaveClass(/text-red-600/);
});

test("filters cards by search query", async ({ page }) => {
  await mockBackend(page);
  await page.getByRole("button", { name: "Sign in" }).click();
  const firstColumn = page.locator('[data-testid^="column-"]').first();

  await expect(firstColumn.getByText("Align roadmap themes")).toBeVisible();
  await expect(firstColumn.getByText("Gather customer signals")).toBeVisible();

  await page.getByLabel("Search cards").fill("roadmap");

  await expect(firstColumn.getByText("Align roadmap themes")).toBeVisible();
  await expect(firstColumn.getByText("Gather customer signals")).not.toBeVisible();
});

test("changes the account password", async ({ page }) => {
  await mockBackend(page);
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.getByRole("button", { name: "Change password" }).click();
  await page.getByLabel("Current password").fill("password");
  await page.getByLabel("New password").fill("new-password123");
  await page.getByRole("button", { name: "Update" }).click();

  await expect(page.getByText("Password updated.")).toBeVisible();
});

test("shows an error when the current password is wrong", async ({ page }) => {
  await mockBackend(page);
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.getByRole("button", { name: "Change password" }).click();
  await page.getByLabel("Current password").fill("wrong-password");
  await page.getByLabel("New password").fill("new-password123");
  await page.getByRole("button", { name: "Update" }).click();

  await expect(page.getByText("Current password is incorrect")).toBeVisible();
});

test("loads the kanban board", async ({ page }) => {
  await mockBackend(page);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
});

test("adds a card to a column", async ({ page }) => {
  await mockBackend(page);
  await page.getByRole("button", { name: "Sign in" }).click();
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill("Playwright card");
  await firstColumn.getByPlaceholder("Details").fill("Added via e2e.");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await expect(firstColumn.getByText("Playwright card")).toBeVisible();
});

test("deletes a card from a column", async ({ page }) => {
  await mockBackend(page);
  await page.getByRole("button", { name: "Sign in" }).click();
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await expect(firstColumn.getByText("Align roadmap themes")).toBeVisible();

  await firstColumn
    .getByRole("button", { name: "Delete Align roadmap themes", exact: true })
    .click();

  await expect(firstColumn.getByText("Align roadmap themes")).not.toBeVisible();
});

test("moves a card between columns", async ({ page }) => {
  await mockBackend(page);
  await page.getByRole("button", { name: "Sign in" }).click();
  const card = page.getByTestId("card-card-1");
  const targetColumn = page.getByTestId("column-col-review");
  const cardBox = await card.boundingBox();
  const columnBox = await targetColumn.boundingBox();
  if (!cardBox || !columnBox) {
    throw new Error("Unable to resolve drag coordinates.");
  }

  await page.mouse.move(
    cardBox.x + cardBox.width / 2,
    cardBox.y + cardBox.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    columnBox.x + columnBox.width / 2,
    columnBox.y + 120,
    { steps: 12 }
  );
  await page.mouse.up();
  await expect(targetColumn.getByTestId("card-card-1")).toBeVisible();
});

test("registering with no boards shows the empty state and creates a first board", async ({
  page,
}) => {
  await mockBackend(page, []);
  await page.getByText(/need an account\? register/i).click();
  await page.getByLabel("Username").fill("brand-new-user");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("Create your first board")).toBeVisible();
  await page.getByPlaceholder(/product roadmap/i).fill("My New Board");
  await page.getByRole("button", { name: "Create board" }).click();

  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
  await expect(page.getByLabel("Board title")).toHaveValue("My New Board");
});

test("switches between multiple boards", async ({ page }) => {
  await mockBackend(page, [seedBoard, secondBoard]);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByLabel("Board title")).toHaveValue("Product Roadmap");
  await page.getByRole("button", { name: "Marketing Launch", exact: true }).click();
  await expect(page.getByLabel("Board title")).toHaveValue("Marketing Launch");
});

test("deletes a board", async ({ page }) => {
  await mockBackend(page, [seedBoard, secondBoard]);
  await page.getByRole("button", { name: "Sign in" }).click();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByLabel("Delete board Marketing Launch").click();

  await expect(page.getByRole("button", { name: "Marketing Launch" })).toHaveCount(0);
  await expect(page.getByLabel("Board title")).toHaveValue("Product Roadmap");
});

test("shares a board with another user, who can then see and edit it but not delete or share it", async ({
  page,
}) => {
  await mockBackend(page, [seedBoard]);

  // Register the collaborator account first so the owner can share by username, then log out.
  await page.getByText(/need an account\? register/i).click();
  await page.getByLabel("Username").fill("collaborator");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Create your first board")).toBeVisible();
  await page.getByRole("button", { name: "Logout" }).click();

  // Log in as the seeded board owner and share the board.
  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByLabel("Board title")).toHaveValue("Product Roadmap");

  await page.getByRole("button", { name: "Share board" }).click();
  await page.getByLabel("Share with username").fill("collaborator");
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByLabel("Remove collaborator from this board")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByText("Share board (1)")).toBeVisible();
  await page.getByRole("button", { name: "Logout" }).click();

  // Log back in as the collaborator and confirm access.
  await page.getByLabel("Username").fill("collaborator");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("button", { name: "Product Roadmap", exact: true })).toBeVisible();
  await expect(page.getByLabel("Board title")).toHaveValue("Product Roadmap");
  await expect(page.getByText("Shared by user")).toBeVisible();
  await expect(page.getByLabel("Delete board Product Roadmap")).toHaveCount(0);

  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill("Added by collaborator");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await expect(firstColumn.getByText("Added by collaborator")).toBeVisible();
});

test("does not let a non-owner share or delete a board they were not granted access to", async ({
  page,
}) => {
  await mockBackend(page, [seedBoard]);
  await page.getByText(/need an account\? register/i).click();
  await page.getByLabel("Username").fill("outsider");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("Create your first board")).toBeVisible();
  await expect(page.getByRole("button", { name: "Product Roadmap" })).toHaveCount(0);
});
