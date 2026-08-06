import { expect, test, type Page } from "@playwright/test";

type MockColumn = { id: string; title: string; cardIds: string[] };
type MockCard = { id: string; title: string; details: string };
type MockBoard = {
  id: string;
  title: string;
  createdAt: string;
  columns: MockColumn[];
  cards: Record<string, MockCard>;
};

const seedBoard: MockBoard = {
  id: "board-1",
  title: "Product Roadmap",
  createdAt: "2024-01-01T00:00:00.000Z",
  columns: [
    { id: "col-backlog", title: "Backlog", cardIds: ["card-1", "card-2"] },
    { id: "col-discovery", title: "Discovery", cardIds: ["card-3"] },
    { id: "col-progress", title: "In Progress", cardIds: ["card-4"] },
    { id: "col-review", title: "Review", cardIds: ["card-5"] },
    { id: "col-done", title: "Done", cardIds: ["card-6"] },
  ],
  cards: {
    "card-1": { id: "card-1", title: "Align roadmap themes", details: "Draft quarterly themes." },
    "card-2": { id: "card-2", title: "Gather customer signals", details: "Review feedback." },
    "card-3": { id: "card-3", title: "Prototype analytics view", details: "Sketch dashboard." },
    "card-4": { id: "card-4", title: "Refine status language", details: "Standardize labels." },
    "card-5": { id: "card-5", title: "QA micro-interactions", details: "Verify hover states." },
    "card-6": { id: "card-6", title: "Ship marketing page", details: "Approve final copy." },
  },
};

const secondBoard: MockBoard = {
  id: "board-2",
  title: "Marketing Launch",
  createdAt: "2024-01-02T00:00:00.000Z",
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
  let nextId = boards.size + 1;

  await page.route("**/api/auth/login", (route) =>
    route.fulfill({ json: { token: "test-token", user: { id: "user-1", username: "user" } } })
  );
  await page.route("**/api/auth/register", (route) =>
    route.fulfill({
      status: 201,
      json: { token: "test-token", user: { id: "user-1", username: "new-user" } },
    })
  );
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({ json: { id: "user-1", username: "user" } })
  );
  await page.route("**/api/auth/logout", (route) => route.fulfill({ status: 204, body: "" }));

  await page.route("**/api/boards", (route) => {
    const method = route.request().method();
    if (method === "GET") {
      return route.fulfill({
        json: Array.from(boards.values()).map(({ id, title, createdAt }) => ({
          id,
          title,
          createdAt,
        })),
      });
    }
    if (method === "POST") {
      const body = route.request().postDataJSON();
      const id = `board-${nextId++}`;
      const created: MockBoard = {
        id,
        title: body.title,
        createdAt: new Date().toISOString(),
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
      return route.fulfill({ status: 201, json: created });
    }
    return route.continue();
  });

  await page.route("**/api/boards/*", (route) => {
    const url = new URL(route.request().url());
    const id = url.pathname.split("/").pop() as string;
    const method = route.request().method();

    if (method === "GET") {
      const found = boards.get(id);
      if (!found) return route.fulfill({ status: 404, json: { detail: "Board not found" } });
      return route.fulfill({ json: found });
    }
    if (method === "PUT") {
      const body = route.request().postDataJSON();
      const updated = { ...boards.get(id), ...body, id };
      boards.set(id, updated as MockBoard);
      return route.fulfill({ json: updated });
    }
    if (method === "DELETE") {
      boards.delete(id);
      return route.fulfill({ status: 204, body: "" });
    }
    return route.continue();
  });

  await page.goto("/");
};

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
