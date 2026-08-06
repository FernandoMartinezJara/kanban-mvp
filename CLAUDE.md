# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A local, Dockerized Project Management app: real (if lightweight) user accounts, multiple Kanban boards per user, and an AI chat sidebar that can read/modify the active board via structured responses from an LLM. See `AGENTS.md` (root) for the original MVP business requirements and `docs/PLAN.md` for the phased build plan (Phase 2 there covers the multi-user/multi-board expansion).

- Frontend: Next.js 16 (App Router), React 19, Tailwind CSS v4, `@dnd-kit` for drag-and-drop. Built as a **static export** (`output: "export"` in `frontend/next.config.ts`) — there is no Next.js server at runtime.
- Backend: FastAPI (Python 3.12), serves the exported frontend as static files AND the JSON API, all from one process/port.
- Database: a single JSON file (`backend/kanban.db`) read/written wholesale by `backend/db.py` — not SQL despite the name. It holds `users`, `sessions`, and `boards` (each board owns `ownerId`, `title`, `createdAt`, `columns`, `cards`) and auto-creates with seed data (`db.default_data()`: one seed user `user`/`password` and one seed board) on first read if missing.
- AI: OpenRouter (`openai/gpt-oss-120b`), called directly via `httpx` from `backend/ai_client.py`. `OPENROUTER_API_KEY` lives in root `.env`.
- Auth: real accounts — `POST /api/auth/register` and `POST /api/auth/login` hash passwords with PBKDF2-HMAC-SHA256 (`db.hash_password`/`db.verify_password`, 200k iterations, random 16-byte salt per user) and issue a random per-session bearer token (`secrets.token_urlsafe(32)`) stored server-side in the JSON file's `sessions` map. `POST /api/auth/logout` deletes the session; `GET /api/auth/me` returns the current user. Still no JWT/expiry — sessions live until logout or the DB file is reset.

## Commands

### Backend (from `backend/`, or `-C backend` in repo root)
```bash
uv sync                      # install deps (uv is the package manager, per project convention)
uv run uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000   # run from repo root
uv run pytest                        # run all tests
uv run pytest tests/test_main.py::TestAuth::test_login_with_seeded_credentials_returns_token_and_user  # single test
```
Tests use FastAPI's `TestClient` and monkeypatch `backend.db.DB_PATH` / `os.environ` / `httpx.post` rather than hitting the real filesystem or OpenRouter — follow that pattern for new backend tests (see `backend/tests/test_main.py`).

### Frontend (from `frontend/`)
```bash
npm install
npm run dev              # dev server at :3000, proxies nothing — talks to backend only when exported/served by FastAPI
npm run build             # next build + static export (output dir: frontend/out)
npm run lint
npm run test:unit          # vitest run
npm run test:unit:watch    # vitest watch mode
npm run test:e2e           # playwright
npm run test:all           # unit + e2e
```
To run a single vitest file/test: `npx vitest run src/lib/kanban.test.ts -t "test name"`.

### Full stack (Docker)
```bash
scripts/start.sh   # docker compose up --build -d ; app at http://localhost:8000
scripts/stop.sh
```
The `Dockerfile` multi-stage builds the frontend (`npm run build` → static `out/`) and copies that output into `backend/frontend_out/` inside the Python image; FastAPI mounts it at `/`. The backend stage installs dependencies via `uv` directly from `backend/pyproject.toml` (`uv pip install --system -r backend/pyproject.toml`) — there is no separate hardcoded dependency list to keep in sync. Locally (outside Docker), `backend/main.py` falls back to `frontend/out` (the `alternate_frontend_dir`) if `backend/frontend_out` doesn't exist, and falls back further to `backend/static/index.html` if neither export exists.

## Architecture notes

### Request flow
The frontend is a static SPA — no server-side rendering or API routes. All persistence and AI logic live in FastAPI. The frontend calls the backend directly via relative paths (`/api/...`), which works both in dev (if backend is proxied/running on the expected origin) and in the packaged Docker image (same origin, since FastAPI serves both static files and API).

- `frontend/src/lib/api.ts` — the only place that calls the backend (`login`, `register`, `logout`, `getCurrentUser`, `listBoards`, `createBoard`, `getBoard`, `saveBoard`, `deleteBoard`, `sendAIBoardQuery`). All authenticated calls attach `Authorization: Bearer <token>`.
- `frontend/src/app/page.tsx` — top-level state machine: reads token from `localStorage` (`pm-token`); once authenticated, loads the user (`/api/auth/me`) and their board list (`/api/boards`), fetches the first board's full content, and renders `AuthForm` or the authenticated shell (`AppHeader` + `KanbanBoard`, or `EmptyBoardsState` if the user has no boards yet) accordingly.
- Backend auth (`get_current_user` in `backend/main.py`) resolves `Authorization: Bearer <token>` against `data["sessions"]` in the JSON DB to find the owning user — see `db.create_session`/`db.get_user_for_token`/`db.delete_session`.

### Users and boards (ownership model)
`backend/db.py` stores three top-level maps in the JSON file: `users` (id, username, `passwordHash`/`passwordSalt`, `createdAt`), `sessions` (token → `{userId, createdAt}`), and `boards` (id, `ownerId`, `title`, `createdAt`, `columns`, `cards`). A board only appears in `GET /api/boards` (list) or is reachable via `GET/PUT/DELETE /api/boards/{id}` for its `ownerId` — `db.get_owned_board` returns `None` for both "board doesn't exist" and "board belongs to someone else", and `backend/main.py` turns that into a 404 in both cases (deliberately, to avoid leaking board existence to non-owners). `POST /api/boards` creates a board with the standard five empty columns (`db.default_columns()`) and no cards; there is no minimum-boards constraint, so a user can delete all of their boards (the frontend then shows `EmptyBoardsState`).

### Board data model (must stay in sync across 3 places)
The board *content* shape (`columns: Column[]`, `cards: Record<string, Card>`, columns hold `cardIds: string[]`) is duplicated in:
1. `frontend/src/lib/kanban.ts` (TS types — `BoardData` for content, `Board` adds `id`/`title`/`createdAt`, `BoardSummary` is the list-view shape — plus `moveCard` logic and `initialData`)
2. `backend/schemas.py` (Pydantic models — `BoardContent`, `Board`, `BoardSummary`, `BoardCreateRequest`, `BoardUpdateRequest`)
3. `backend/db.py` (`default_data()` seed board, `default_columns()` for new boards — same shape as JSON on disk)

There is only one drag/reorder implementation (`moveCard` in `frontend/src/lib/kanban.ts`) — the frontend computes the full next-board state client-side for every mutation (rename column, add/delete card, move, board rename) and persists it via a single generic `PUT /api/boards/{id}` carrying `{title, columns, cards}`. There are no dedicated per-mutation endpoints (e.g. `/api/boards/{id}/move` or `/card`); an earlier version of this project had them, they were never wired up to the frontend, and were removed after a code review found them to be untested dead code with latent bugs — don't re-add per-mutation endpoints without also wiring the frontend to use them and adding tests.

Every board persisted via `PUT /api/boards/{id}` is validated by `db.validate_board_content()`, which rejects (raises `ValueError` → HTTP 422) any board where a column's `cardIds` references a card id that doesn't exist in `cards`, or where a card is referenced by more than one column. `backend/main.py`'s `ai_board` endpoint independently re-validates any AI-suggested board (via `schemas.BoardContent(**new_board)` + `db.validate_board_content`) before ever including it in the response — an invalid AI suggestion is dropped (the chat answer is still returned, with a note appended) rather than sent to the frontend, since an unvalidated dangling card reference will crash the board render (`KanbanCard` unconditionally destructures `card.title`). The frontend also filters out any `undefined` card lookups in `KanbanBoard.tsx` as a defense-in-depth backstop. `db.write_data()` writes the whole JSON file atomically (temp file + `os.replace`) to avoid a partially-written `kanban.db` if the process is interrupted mid-write; every mutating endpoint does a full `db.read_data()` → mutate → `db.write_data()` round trip (no partial updates, no locking — acceptable for this single-process local app).

### AI board updates
The frontend sends `{prompt, boardId}` to `POST /api/ai/board`; the backend loads that board fresh from the DB (ownership-checked, 404 otherwise) rather than trusting client-supplied board content. `backend/ai_client.py` sends that board's JSON (`columns`/`cards` only) + the user prompt to OpenRouter with an instruction to return `{"answer": ..., "board": ...}` as raw text (not OpenRouter's native structured-output/tool-calling mode — it's a prompted JSON convention). `_extract_json_object` manually brace-matches the first JSON object out of the model's text response (handles cases where the model wraps JSON in prose or markdown fences). If the model omits `board` or returns unparseable JSON, or if the OpenRouter request itself fails (HTTP error status *or* a network/timeout error — both `httpx.HTTPStatusError` and `httpx.RequestError` are caught), `ai_query`/`ai_board` surface a 502 rather than guessing; if the model returns a structurally invalid or referentially broken `board`, `ai_board` silently drops it (see above) instead of surfacing an error. `ai_board` never persists the suggestion itself — same as before, the frontend applies it via the normal `PUT /api/boards/{id}` save path (`AIChatSidebar` calls `onSave`), so an AI-suggested change goes through the same validation and board-list sync as any other edit. `AIRequest.prompt`/`AIBoardRequest.prompt` are capped at 4000 characters (`Field(max_length=4000)`) as a cheap guard against unbounded OpenRouter spend from a single request.

### Static serving fallback chain
`backend/main.py` picks exactly one of three serving modes at import time (checked once, not per-request): `backend/frontend_out/` → `frontend/out/` → `backend/static/index.html`. When editing frontend-serving behavior, check which path is actually active in your environment before assuming a change took effect.

## Coding standards (from root `AGENTS.md`)

- Keep it simple — do not over-engineer, do not add unneeded defensive programming, no speculative features.
- Use current, idiomatic library APIs.
- No emojis, anywhere.
- When debugging, find the root cause before applying a fix — don't guess-and-check.
- Color tokens (see `frontend/src/app/globals.css` / Tailwind config for actual usage): Accent Yellow `#ecad0a`, Blue Primary `#209dd7`, Purple Secondary `#753991`, Dark Navy `#032147`, Gray Text `#888888`.
