# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A local, Dockerized Project Management MVP: dummy-auth login, a single Kanban board per user, and an AI chat sidebar that can read/modify the board via structured responses from an LLM. See `AGENTS.md` (root) for full business requirements and `docs/PLAN.md` for the phased build plan.

- Frontend: Next.js 16 (App Router), React 19, Tailwind CSS v4, `@dnd-kit` for drag-and-drop. Built as a **static export** (`output: "export"` in `frontend/next.config.ts`) — there is no Next.js server at runtime.
- Backend: FastAPI (Python 3.12), serves the exported frontend as static files AND the JSON API, all from one process/port.
- Database: a single JSON file (`backend/kanban.db`) read/written directly by `backend/db.py` — not SQL despite the name. It auto-creates with seed data (`DEFAULT_BOARD`) on first read if missing.
- AI: OpenRouter (`openai/gpt-oss-120b`), called directly via `httpx` from `backend/ai_client.py`. `OPENROUTER_API_KEY` lives in root `.env`.
- Auth: hardcoded `user`/`password` → a fixed dummy bearer token (`dummy-token`). No real session/JWT logic.

## Commands

### Backend (from `backend/`, or `-C backend` in repo root)
```bash
uv sync                      # install deps (uv is the package manager, per project convention)
uv run uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000   # run from repo root
uv run pytest                        # run all tests
uv run pytest tests/test_main.py::test_login_returns_dummy_token  # single test
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
scripts/start.sh   # docker-compose up --build -d ; app at http://localhost:8000
scripts/stop.sh
```
The `Dockerfile` multi-stage builds the frontend (`npm run build` → static `out/`) and copies that output into `backend/frontend_out/` inside the Python image; FastAPI mounts it at `/`. Locally (outside Docker), `backend/main.py` falls back to `frontend/out` (the `alternate_frontend_dir`) if `backend/frontend_out` doesn't exist, and falls back further to `backend/static/index.html` if neither export exists.

## Architecture notes

### Request flow
The frontend is a static SPA — no server-side rendering or API routes. All persistence and AI logic live in FastAPI. The frontend calls the backend directly via relative paths (`/api/...`), which works both in dev (if backend is proxied/running on the expected origin) and in the packaged Docker image (same origin, since FastAPI serves both static files and API).

- `frontend/src/lib/api.ts` — the only place that calls the backend (`login`, `getKanban`, `saveKanban`, `sendAIQuery`). All authenticated calls attach `Authorization: Bearer <token>`.
- `frontend/src/app/page.tsx` — top-level auth/board state machine: reads token from `localStorage` (`pm-token`), fetches the board once authenticated, renders `LoginForm` or `KanbanBoard` accordingly.
- Backend auth (`get_current_user` in `backend/main.py`) only checks for the literal string `Bearer dummy-token` — there is no real per-user session.

### Board data model (must stay in sync across 3 places)
The `BoardData` shape (`columns: Column[]`, `cards: Record<string, Card>`, columns hold `cardIds: string[]`) is duplicated in:
1. `frontend/src/lib/kanban.ts` (TS types + `moveCard` logic + `initialData`)
2. `backend/schemas.py` (Pydantic models)
3. `backend/db.py` (`DEFAULT_BOARD` seed, same shape as JSON on disk)

`moveCard` in `frontend/src/lib/kanban.ts` and the move logic inside `POST /api/kanban/move` in `backend/main.py` are independent reimplementations of the same drag-and-drop reordering algorithm (same-column reorder vs. cross-column move, appending onto a column vs. inserting before a card). Changes to move semantics need updating in both places.

### AI board updates
`backend/ai_client.py` sends the full board JSON + user prompt to OpenRouter with an instruction to return `{"answer": ..., "board": ...}` as raw text (not OpenRouter's native structured-output/tool-calling mode — it's a prompted JSON convention). `_extract_json_object` manually brace-matches the first JSON object out of the model's text response (handles cases where the model wraps JSON in prose or markdown fences). If the model omits `board` or returns unparseable JSON, `ai_query`/`ai_board` endpoints surface a 502 rather than guessing.

### Static serving fallback chain
`backend/main.py` picks exactly one of three serving modes at import time (checked once, not per-request): `backend/frontend_out/` → `frontend/out/` → `backend/static/index.html`. When editing frontend-serving behavior, check which path is actually active in your environment before assuming a change took effect.

## Coding standards (from root `AGENTS.md`)

- Keep it simple — do not over-engineer, do not add unneeded defensive programming, no speculative features.
- Use current, idiomatic library APIs.
- No emojis, anywhere.
- When debugging, find the root cause before applying a fix — don't guess-and-check.
- Color tokens (see `frontend/src/app/globals.css` / Tailwind config for actual usage): Accent Yellow `#ecad0a`, Blue Primary `#209dd7`, Purple Secondary `#753991`, Dark Navy `#032147`, Gray Text `#888888`.
