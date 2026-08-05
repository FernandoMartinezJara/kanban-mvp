# Code Review — Kanban MVP

Date: 2026-08-05
Scope: entire repository (`backend/`, `frontend/`, Docker/infra, scripts, docs) at commit `fd2aa8f`.
Method: manual read-through of every source file, plus targeted `grep` verification of each claim below (no automated scanner used). All findings are things I confirmed in the code, not guesses.

## Summary

The MVP works end-to-end (verified separately by running the full test suite and a live smoke test) and is appropriately simple for its stated scope. The most important issues are:

1. A **dangling card-reference crash** in the AI/board-update path (highest impact — the AI feature is the one most likely to produce this exact shape of bad data).
2. **Two backend endpoints (`/api/kanban/move`, `/api/kanban/card`) are dead code** — the frontend never calls them — and each has its own latent bug that would surface the moment anything calls them.
3. The **board schema and move/reorder logic are duplicated three times** (frontend types, Pydantic schemas, and two independent reimplementations of drag-and-drop reordering), which is how #2's bugs went unnoticed.
4. The **Dockerfile's dependency list has drifted from `pyproject.toml`** and doesn't use `uv`, contradicting the documented technical decision.

Nothing here blocks the MVP as a local single-user demo. The list below is ordered by what would actually bite a user first.

---

## Findings

### 1. [High] Dangling card references crash the entire board render
**Files:** `frontend/src/components/KanbanBoard.tsx:189`, `frontend/src/components/KanbanCard.tsx:36-46`, `frontend/src/components/KanbanCardPreview.tsx`

`KanbanBoard` builds each column's card list with:
```ts
cards={column.cardIds.map((cardId) => board.cards[cardId])}
```
If any `cardId` in `columns[].cardIds` doesn't exist in `cards{}`, this yields `undefined` in the array. `KanbanColumn` renders that straight into `<KanbanCard card={card} .../>`, which unconditionally destructures `card.title` / `card.details` — an unguarded `TypeError` that crashes the whole board (not just one card), with no error boundary to catch it.

This isn't just a theoretical edge case: the AI chat feature (`backend/ai_client.py`) asks an LLM to return a `board` object matching the schema, and neither the backend (`ai_board` in `main.py:133`) nor the frontend validates that every `cardIds` entry actually has a matching `cards` entry before applying it. An LLM hallucinating or renaming a card id (very plausible) will crash the board on the very next render, and the bad board gets persisted via `saveKanban` before anyone notices.

**Recommendation:** validate referential integrity server-side before persisting any board (reject a `PUT /api/kanban` or an AI-suggested board if a `cardIds` entry has no matching card, or a card is referenced by zero/multiple columns), and/or guard the frontend render (`cards={column.cardIds.map(...).filter(Boolean)}`) as a defense-in-depth backstop.

### 2. [Medium] `/api/kanban/move` and `/api/kanban/card` are unreachable dead code, and untested
**Files:** `frontend/src/lib/api.ts`, `backend/main.py:58-119`

Grepping the entire frontend for `api/kanban/move` and `api/kanban/card` returns nothing. Every board mutation in the UI — drag-and-drop, rename, add card, delete card — goes through the same generic `saveKanban()` → `PUT /api/kanban`, which overwrites the whole board with a client-computed copy (`moveCard()` from `frontend/src/lib/kanban.ts` for drag-and-drop, inline object spreads for the rest).

That leaves two backend endpoints that exist, are documented by their route decorators, and are never exercised by the app or by any test in `backend/tests/test_main.py`. Dead, untested code is exactly where bugs hide — see #3 and #4 below, both found inside these two endpoints.

**Recommendation:** either delete `move_card`/`add_card` from `main.py` (and their schemas) since the frontend doesn't need them, or wire the frontend to actually use them (they're the more efficient, intention-revealing option vs. full-board PUTs — see #6) and add test coverage before doing so.

### 3. [Medium] `move_card` crashes when a card is dropped onto its own column's container
**File:** `backend/main.py:82`

```python
is_over_column = active_column_id != over_column_id and over_id == over_column_id
```
This is only `True` when the active and target columns *differ*. But dnd-kit fires the same "dropped on the column, not on a card" event when a card is dragged and released onto empty space **within its own column** — the exact case `frontend/src/lib/kanban.ts`'s `moveCard()` explicitly handles (it appends the card to the end of its own column). Here, because `active_column_id == over_column_id`, `is_over_column` evaluates `False`, so execution falls into the reorder branch:
```python
new_index = active_column["cardIds"].index(over_id)
```
`over_id` in this scenario is the **column id** (e.g. `"col-review"`), not a card id — it's never a member of `cardIds`, so `.index()` raises an unhandled `ValueError`, which FastAPI turns into an unhandled 500.

Currently unreachable per #2, but this is exactly the kind of divergence that happens when the same logic is written twice (see #5).

**Recommendation:** if this endpoint is kept, fix the condition to `is_over_column = over_id == over_column_id` (drop `active_column_id != over_column_id`), matching the frontend's actual semantics, and add a test for "drop on same column, no card under cursor."

### 4. [Low] `add_card`'s generated id can collide with an existing card
**File:** `backend/main.py:112`

```python
new_id = f"card-{len(board['cards']) + 1}"
```
This assumes card ids are dense and sequential. They aren't guaranteed to be once any card has been deleted: with 8 cards and one deleted, `len(cards) + 1` can reproduce an id that still exists (e.g. `card-8`), silently colliding with — and effectively overwriting the column membership of — an unrelated card. The frontend's own id generator (`createId()` in `frontend/src/lib/kanban.ts:164`, random + timestamp) doesn't have this problem, which is presumably why nobody has hit this in practice — this endpoint is dead code (#2).

**Recommendation:** use the same collision-resistant id scheme as the frontend (or `uuid4()`) if this endpoint is kept.

### 5. [Medium] Board schema and move/reorder logic are duplicated across 3+ places
**Files:** `frontend/src/lib/kanban.ts`, `backend/schemas.py`, `backend/db.py` (`DEFAULT_BOARD`), `backend/main.py:58-106`

The `{columns, cards, cardIds}` shape is defined independently in TypeScript types, Pydantic models, and the JSON seed data, and the drag/reorder algorithm itself is hand-written twice (frontend `moveCard()`, backend `move_card()`) with subtly different logic, which is how #3 diverged from the frontend's actual behavior undetected.

**Recommendation:** now that #2 will likely remove the backend reimplementation, this mostly resolves itself. If dedicated move/add endpoints are kept instead, treat one implementation as the source of truth and cover both with contract tests using identical fixtures.

### 6. [Low-Medium] No file locking or atomic writes for `kanban.db`
**File:** `backend/db.py:73-76`

```python
def write_board(board: dict[str, Any]) -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with DB_PATH.open("w", encoding="utf-8") as handle:
        json.dump(board, handle, indent=2)
```
Every UI mutation does a full-board `PUT` (see #2), and this write is neither atomic (no write-to-temp-then-rename) nor lock-protected. Two concurrent writes (two browser tabs, or a drag-and-drop landing while an AI-suggested board is being saved) can interleave, and a process interruption mid-write leaves `kanban.db` truncated — which then makes `read_board()`'s `json.load()` raise on every subsequent request until the file is manually removed. There's also no optimistic concurrency check, so concurrent edits are silently last-write-wins with no conflict signal to the user.

**Recommendation:** write to a temp file and `os.replace()` into place; for the MVP's single-user local scope this is likely low priority, but worth fixing before any multi-tab or multi-user use.

### 7. [Medium] `Dockerfile` dependency list has drifted from `pyproject.toml` and doesn't use `uv`
**Files:** `Dockerfile:12`, `backend/pyproject.toml`, `AGENTS.md`

```dockerfile
RUN python -m pip install --no-cache-dir uvicorn fastapi python-dotenv httpx
```
`AGENTS.md`'s Technical Decisions explicitly state: *"Use 'uv' as the package manager for python in the Docker container."* The `Dockerfile` uses plain `pip` with a hand-typed dependency list instead of installing from `backend/pyproject.toml`. Today the two lists happen to match, but they're two independent sources of truth — the next dependency added to `pyproject.toml` (e.g. for a new feature) silently won't reach the Docker image until someone remembers to update the `Dockerfile` too.

**Recommendation:** install via `uv sync`/`uv pip install -e backend` (or `pip install -e backend`) from `pyproject.toml` in the Docker build, per the documented decision.

### 8. [Low] `schemas.py` uses `typing.List`/`Dict` instead of built-in generics
**File:** `backend/schemas.py:2,14,18,19`

```python
from typing import Dict, List
...
cardIds: List[str]
columns: List[Column]
cards: Dict[str, Card]
```
The project targets Python ≥3.12 (`pyproject.toml`), which supports built-in generic syntax (`list[str]`, `dict[str, Card]`) natively — already used in `db.py`. `AGENTS.md` asks for "latest versions of libraries and idiomatic approaches." Purely cosmetic, but worth aligning for consistency between the two backend files.

### 9. [Low] No documented way to run frontend dev server against a real backend
**Files:** `frontend/next.config.ts`, `frontend/playwright.config.ts`

`next.config.ts` only sets `output: "export"` — no `rewrites()`/proxy. In `npm run dev` (port 3000), every relative `/api/...` fetch resolves against the Next.js dev server itself, which has no such routes, so login/board fetches 404 in dev mode. The only way to exercise the full stack today is a full Docker build (or manually running both servers with the frontend on a *different* origin, which the frontend's relative-path fetches don't support anyway). This also explains why `frontend/tests/kanban.spec.ts`'s Playwright config only spins up `npm run dev` and had to mock the backend at the network layer rather than hit a real one.

**Recommendation:** add a `rewrites()` entry proxying `/api/*` to `http://localhost:8000/api/*` for local dev, or document the "build + run backend" workflow explicitly in `frontend/AGENTS.md`.

### 10. [Info] `.env`/`.git` not excluded in `.dockerignore`
**File:** `.dockerignore`

Currently harmless — `Dockerfile` only ever `COPY`s `backend/` and `frontend/`, never the repo root — but if a future change adds a broader `COPY . .`, nothing here stops `.env` (with the live `OPENROUTER_API_KEY`) or `.git` from landing in an image layer.

**Recommendation:** add `.env`, `.git`, and `*.db` to `.dockerignore` as a cheap defensive measure.

### 11. [Info] Multi-user claim isn't structurally backed yet
**Files:** `AGENTS.md`, `backend/db.py`, `backend/schemas.py`, `backend/main.py:34-37`

`AGENTS.md`'s Limitations section states *"the database will support multiple users for future"*, but `get_current_user()` always returns the literal string `"user"`, `kanban.db` is a single global JSON file with no user identifier anywhere in it, and no schema (`schemas.py`) has a `user_id`/username field. This is consistent with the stated MVP scope (single hardcoded user), just noting that "will support multiple users" isn't yet true of any part of the current implementation — it would require adding a user key to the storage layer and schema, not just swapping the auth check.

### 12. [Info] Upstream AI error text passed straight through to the client
**File:** `backend/main.py:127-130,141-144`

```python
except httpx.HTTPStatusError as exc:
    raise HTTPException(status_code=502, detail=f"AI service error: {exc.response.text}")
```
Fine for a local single-user MVP; flagging only so it isn't forgotten if this ever sits behind a shared/multi-user deployment, since it forwards OpenRouter's raw error body to any authenticated caller.

---

## Test coverage gaps

| Area | Status |
|---|---|
| Backend CRUD (health, login, get/put kanban, AI error paths) | Covered (`backend/tests/test_main.py`, 9 tests) |
| `POST /api/kanban/move` | **No coverage** — also the one endpoint with a confirmed bug (#3) |
| `POST /api/kanban/card` | **No coverage** — also the one endpoint with a confirmed bug (#4) |
| Frontend `moveCard()` reducer logic | Covered (`frontend/src/lib/kanban.test.ts`) |
| `KanbanBoard` rename/add/delete | Covered (`frontend/src/components/KanbanBoard.test.tsx`) |
| `LoginForm` | **No dedicated test** |
| `AIChatSidebar` (prompt submission, applying an AI-suggested board update) | **No dedicated test** |
| "AI returns a board with a dangling/duplicate card id" (finding #1) | **No test** — the highest-impact failure mode in the app has no regression coverage |
| E2E (Playwright) | Covers load, add-card, drag-and-drop against a mocked backend — no login-failure or AI-chat e2e path |

---

## Action items (prioritized)

1. **Fix or remove the dangling-card-reference crash risk** (#1) — add referential-integrity validation before persisting any board, especially AI-suggested ones; add a regression test.
2. **Delete `move_card`/`add_card` from `backend/main.py`**, or wire the frontend to use them and fix their bugs first (#2, #3, #4) — don't leave untested, unreachable endpoints with known bugs in the codebase.
3. **Point the Dockerfile at `pyproject.toml` via `uv`** (#7), matching the documented technical decision.
4. **Add tests for `LoginForm` and `AIChatSidebar`** (test coverage gaps table) — currently the two most user-facing flows (login, AI board edits) have zero dedicated tests.
5. **Make `kanban.db` writes atomic** (#6) if the app will ever run with more than one concurrent tab/user.
6. Minor cleanups when convenient: `List`/`Dict` → built-in generics (#8), document/fix the frontend dev-against-real-backend workflow (#9), tighten `.dockerignore` (#10).

## Remediation log (2026-08-05)

All **High** and **Medium** severity findings above have been fixed. Low/Info findings were left as-is (not requested for this pass).

| Finding | Fix |
|---|---|
| #1 Dangling card references crash the board | Added `db.validate_board()`, enforced in `db.write_board()` (used by `PUT /api/kanban`) and independently re-checked in `ai_board` before an AI-suggested board is ever returned to the client (invalid suggestions are dropped, with a note appended to the chat answer instead of a board update). Added a frontend defense-in-depth filter in `KanbanBoard.tsx` that drops any `cardId` with no matching card before rendering. |
| #2 Dead `/api/kanban/move` and `/api/kanban/card` endpoints | Deleted both routes from `backend/main.py` and their now-unused `MoveCardRequest`/`AddCardRequest` schemas. The frontend already did all mutations through `PUT /api/kanban`, so nothing else changed. |
| #3 `move_card` crash on same-column drop-on-container | Resolved by deleting the endpoint (#2) rather than patching dead code. |
| #4 `add_card` id-collision bug | Resolved by deleting the endpoint (#2). |
| #5 Duplicated board schema / reorder logic | The backend's independent reimplementation of drag/reorder logic is gone (#2); `frontend/src/lib/kanban.ts`'s `moveCard()` is now the only reorder implementation. The TS-types-vs-Pydantic-schema duplication is normal for a client/server app and was left as-is. |
| #6 No atomic writes / file locking for `kanban.db` | `db.write_board()` now writes to a temp file in the same directory and `os.replace()`s it into place, so a crash or concurrent write can no longer leave a truncated/corrupt file. |
| #7 `Dockerfile` dependency list drifted from `pyproject.toml`, didn't use `uv` | `Dockerfile` now copies the `uv` binary (`ghcr.io/astral-sh/uv:latest`) and installs backend dependencies via `uv pip install --system -r backend/pyproject.toml` — one source of truth for backend dependencies, matching the documented decision in `AGENTS.md`. |

### New test coverage added
- `backend/tests/test_db.py` (new file): `validate_board` accepts valid boards, rejects dangling references, rejects duplicate references; `write_board` refuses to write an invalid board and leaves no partial file behind; a valid write/read round-trips and leaves no stray temp file.
- `backend/tests/test_main.py`: `PUT /api/kanban` returns 422 for a board with a dangling card reference; `ai_board` drops an AI-suggested board with a dangling reference and still returns the chat answer (with a note) instead of crashing or 500ing.
- `frontend/src/components/KanbanBoard.test.tsx`: renders without crashing when a column references a card id that doesn't exist in `cards`.

### Retest results (after remediation)
- Backend: `pytest` — **16/16 passed** (was 9; +7 new).
- Frontend unit: `vitest` — **7/7 passed** (was 6; +1 new).
- Frontend e2e: `playwright` — **3/3 passed**, unchanged.
- Full-stack smoke test (real `uvicorn` server + built frontend): static site, auth gate, login, and `/api/kanban` all verified working; server brought up and down cleanly.
- Docker build: `docker-compose build` / `up` / `down` against the updated `Dockerfile` — verified the `uv`-based install works and the container serves the app correctly end to end.

## Out of scope / accepted by design (not findings)

These are explicit, documented MVP simplifications per `AGENTS.md` and were **not** flagged above:
- Single hardcoded `user`/`password` login and static bearer token — explicitly the intended MVP auth.
- No HTTPS, no CORS hardening, no rate limiting — explicitly local-only, single-user scope.
- SQLite-free "database" (a single JSON file) — explicitly the documented decision (`AGENTS.md`: "Use SQLite local database" — note: the current implementation is actually a flat JSON file, not SQLite, despite the filename `kanban.db` and the AGENTS.md decision saying SQLite; this is a documentation/implementation mismatch worth being aware of, though functionally it satisfies "local database, auto-created if missing").
