from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).resolve().parent / "kanban.db"

DEFAULT_BOARD = {
    "columns": [
        {"id": "col-backlog", "title": "Backlog", "cardIds": ["card-1", "card-2"]},
        {"id": "col-discovery", "title": "Discovery", "cardIds": ["card-3"]},
        {"id": "col-progress", "title": "In Progress", "cardIds": ["card-4", "card-5"]},
        {"id": "col-review", "title": "Review", "cardIds": ["card-6"]},
        {"id": "col-done", "title": "Done", "cardIds": ["card-7", "card-8"]},
    ],
    "cards": {
        "card-1": {
            "id": "card-1",
            "title": "Align roadmap themes",
            "details": "Draft quarterly themes with impact statements and metrics.",
        },
        "card-2": {
            "id": "card-2",
            "title": "Gather customer signals",
            "details": "Review support tags, sales notes, and churn feedback.",
        },
        "card-3": {
            "id": "card-3",
            "title": "Prototype analytics view",
            "details": "Sketch initial dashboard layout and key drill-downs.",
        },
        "card-4": {
            "id": "card-4",
            "title": "Refine status language",
            "details": "Standardize column labels and tone across the board.",
        },
        "card-5": {
            "id": "card-5",
            "title": "Design card layout",
            "details": "Add hierarchy and spacing for scanning dense lists.",
        },
        "card-6": {
            "id": "card-6",
            "title": "QA micro-interactions",
            "details": "Verify hover, focus, and loading states.",
        },
        "card-7": {
            "id": "card-7",
            "title": "Ship marketing page",
            "details": "Final copy approved and asset pack delivered.",
        },
        "card-8": {
            "id": "card-8",
            "title": "Close onboarding sprint",
            "details": "Document release notes and share internally.",
        },
    },
}


def validate_board(board: dict[str, Any]) -> None:
    """Raise ValueError if any column references a card that doesn't exist,
    or the same card is referenced by more than one column."""
    seen: set[str] = set()
    cards = board.get("cards", {})
    for column in board.get("columns", []):
        for card_id in column.get("cardIds", []):
            if card_id not in cards:
                raise ValueError(
                    f"Column '{column.get('id')}' references unknown card '{card_id}'"
                )
            if card_id in seen:
                raise ValueError(
                    f"Card '{card_id}' is referenced by more than one column"
                )
            seen.add(card_id)


def ensure_db_exists() -> None:
    if not DB_PATH.exists():
        write_board(DEFAULT_BOARD)


def read_board() -> dict[str, Any]:
    ensure_db_exists()
    with DB_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_board(board: dict[str, Any]) -> None:
    validate_board(board)
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(dir=DB_PATH.parent, prefix=".kanban-", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(board, handle, indent=2)
        os.replace(tmp_path, DB_PATH)
    except BaseException:
        os.unlink(tmp_path)
        raise
