# The Project Management MVP web app

## Business Requirements

This project is building a Project Management App. Key features:
- A user can sign in
- When signed in, the user sees a Kanban board representing their project
- The Kanban board has fixed columns that can be renamed
- The cards on the Kanban board can be moved with drag and drop, and edited
- There is an AI chat feature in a sidebar; the AI is able to create / edit / move one or more cards

## Limitations

The original MVP scope below has since been expanded: the app now supports real user registration/login (not just the hardcoded `user`/`password`, though that account still exists as a seeded demo user) and multiple Kanban boards per user, with a board switcher to create/rename/delete/select among them. See `docs/PLAN.md` Phase 2 and `CLAUDE.md` for the current architecture.

This still runs locally (in a docker container); there is no real session expiry, multi-tenant isolation beyond per-user ownership checks, or production-grade auth (no JWT, no password reset, no email verification).

## Technical Decisions

- NextJS frontend
- Python FastAPI backend, including serving the static NextJS site at /
- Everything packaged into a Docker container
- Use "uv" as the package manager for python in the Docker container
- Use OpenRouter for the AI calls. An OPENROUTER_API_KEY is in .env in the project root
- Use `openai/gpt-oss-120b` as the model
- Persistence: a single JSON file (`backend/kanban.db`) read/written wholesale by `backend/db.py`, creating a new db with seed data if it doesn't exist (see `CLAUDE.md` for the current schema — users/sessions/boards)
- Start and Stop server scripts for Mac, PC, Linux in scripts/

## Starting Point

A working MVP of the frontend has been built and is already in frontend. This is not yet designed for the Docker setup. It's a pure frontend-only demo.

## Color Scheme

- Accent Yellow: `#ecad0a` - accent lines, highlights
- Blue Primary: `#209dd7` - links, key sections
- Purple Secondary: `#753991` - submit buttons, important actions
- Dark Navy: `#032147` - main headings
- Gray Text: `#888888` - supporting text, labels

## Coding standards

1. Use latest versions of libraries and idiomatic approaches as of today
2. Keep it simple - NEVER over-engineer, ALWAYS simplify, NO unnecessary defensive programming. No extra features - focus on simplicity.
3. Be concise. Keep README minimal. IMPORTANT: no emojis ever
4. When hitting issues, always identify root cause before trying a fix. Do not guess. Prove with evidence, then fix the root cause.

## Working documentation

All documents for planning and executing this project will be in the docs/ directory.
Please review the docs/PLAN.md document before proceeding.