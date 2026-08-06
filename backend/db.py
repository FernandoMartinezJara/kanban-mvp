from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).resolve().parent / "kanban.db"

PBKDF2_ITERATIONS = 200_000


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), bytes.fromhex(salt), PBKDF2_ITERATIONS
    )
    return digest.hex(), salt


def verify_password(password: str, password_hash: str, salt: str) -> bool:
    candidate, _ = hash_password(password, salt)
    return hmac.compare_digest(candidate, password_hash)


def default_columns() -> list[dict[str, Any]]:
    return [
        {"id": "col-backlog", "title": "Backlog", "cardIds": []},
        {"id": "col-discovery", "title": "Discovery", "cardIds": []},
        {"id": "col-progress", "title": "In Progress", "cardIds": []},
        {"id": "col-review", "title": "Review", "cardIds": []},
        {"id": "col-done", "title": "Done", "cardIds": []},
    ]


def default_data() -> dict[str, Any]:
    user_id = "user-1"
    board_id = "board-1"
    password_hash, salt = hash_password("password")
    now_dt = datetime.now(timezone.utc)
    now = now_dt.isoformat()
    overdue_date = (now_dt - timedelta(days=2)).date().isoformat()
    upcoming_date = (now_dt + timedelta(days=5)).date().isoformat()
    return {
        "users": {
            user_id: {
                "id": user_id,
                "username": "user",
                "passwordHash": password_hash,
                "passwordSalt": salt,
                "createdAt": now,
            }
        },
        "sessions": {},
        "boards": {
            board_id: {
                "id": board_id,
                "ownerId": user_id,
                "memberIds": [],
                "title": "Product Roadmap",
                "createdAt": now,
                "columns": [
                    {"id": "col-backlog", "title": "Backlog", "cardIds": ["card-1", "card-2"]},
                    {"id": "col-discovery", "title": "Discovery", "cardIds": ["card-3"]},
                    {
                        "id": "col-progress",
                        "title": "In Progress",
                        "cardIds": ["card-4", "card-5"],
                    },
                    {"id": "col-review", "title": "Review", "cardIds": ["card-6"]},
                    {"id": "col-done", "title": "Done", "cardIds": ["card-7", "card-8"]},
                ],
                "cards": {
                    "card-1": {
                        "id": "card-1",
                        "title": "Align roadmap themes",
                        "details": "Draft quarterly themes with impact statements and metrics.",
                        "priority": "medium",
                        "dueDate": None,
                    },
                    "card-2": {
                        "id": "card-2",
                        "title": "Gather customer signals",
                        "details": "Review support tags, sales notes, and churn feedback.",
                        "priority": "low",
                        "dueDate": None,
                    },
                    "card-3": {
                        "id": "card-3",
                        "title": "Prototype analytics view",
                        "details": "Sketch initial dashboard layout and key drill-downs.",
                        "priority": "medium",
                        "dueDate": upcoming_date,
                    },
                    "card-4": {
                        "id": "card-4",
                        "title": "Refine status language",
                        "details": "Standardize column labels and tone across the board.",
                        "priority": "high",
                        "dueDate": overdue_date,
                    },
                    "card-5": {
                        "id": "card-5",
                        "title": "Design card layout",
                        "details": "Add hierarchy and spacing for scanning dense lists.",
                        "priority": "medium",
                        "dueDate": None,
                    },
                    "card-6": {
                        "id": "card-6",
                        "title": "QA micro-interactions",
                        "details": "Verify hover, focus, and loading states.",
                        "priority": "low",
                        "dueDate": None,
                    },
                    "card-7": {
                        "id": "card-7",
                        "title": "Ship marketing page",
                        "details": "Final copy approved and asset pack delivered.",
                        "priority": "high",
                        "dueDate": None,
                    },
                    "card-8": {
                        "id": "card-8",
                        "title": "Close onboarding sprint",
                        "details": "Document release notes and share internally.",
                        "priority": "low",
                        "dueDate": None,
                    },
                },
            }
        },
    }


def validate_board_content(board: dict[str, Any]) -> None:
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
        write_data(default_data())


def read_data() -> dict[str, Any]:
    ensure_db_exists()
    with DB_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_data(data: dict[str, Any]) -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(dir=DB_PATH.parent, prefix=".kanban-", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(data, handle, indent=2)
        os.replace(tmp_path, DB_PATH)
    except BaseException:
        os.unlink(tmp_path)
        raise


def find_user_by_username(data: dict[str, Any], username: str) -> dict[str, Any] | None:
    normalized = username.strip().lower()
    for user in data["users"].values():
        if user["username"].lower() == normalized:
            return user
    return None


def create_user(data: dict[str, Any], username: str, password: str) -> dict[str, Any]:
    password_hash, salt = hash_password(password)
    user_id = f"user-{secrets.token_hex(8)}"
    user = {
        "id": user_id,
        "username": username,
        "passwordHash": password_hash,
        "passwordSalt": salt,
        "createdAt": _now(),
    }
    data["users"][user_id] = user
    return user


def set_user_password(user: dict[str, Any], new_password: str) -> None:
    password_hash, salt = hash_password(new_password)
    user["passwordHash"] = password_hash
    user["passwordSalt"] = salt


def create_session(data: dict[str, Any], user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    data["sessions"][token] = {"userId": user_id, "createdAt": _now()}
    return token


def get_user_for_token(data: dict[str, Any], token: str) -> dict[str, Any] | None:
    session = data["sessions"].get(token)
    if not session:
        return None
    return data["users"].get(session["userId"])


def delete_session(data: dict[str, Any], token: str) -> None:
    data["sessions"].pop(token, None)


def list_boards_for_user(data: dict[str, Any], user_id: str) -> list[dict[str, Any]]:
    boards = [
        board
        for board in data["boards"].values()
        if board["ownerId"] == user_id or user_id in board.get("memberIds", [])
    ]
    return sorted(boards, key=lambda board: board["createdAt"])


def get_owned_board(data: dict[str, Any], board_id: str, user_id: str) -> dict[str, Any] | None:
    """Return the board only if user_id is its owner (for owner-only actions like delete/share)."""
    board = data["boards"].get(board_id)
    if not board or board["ownerId"] != user_id:
        return None
    return board


def get_accessible_board(data: dict[str, Any], board_id: str, user_id: str) -> dict[str, Any] | None:
    """Return the board if user_id is its owner or a member it's been shared with."""
    board = data["boards"].get(board_id)
    if not board:
        return None
    if board["ownerId"] == user_id or user_id in board.get("memberIds", []):
        return board
    return None


def create_board(data: dict[str, Any], user_id: str, title: str) -> dict[str, Any]:
    board_id = f"board-{secrets.token_hex(8)}"
    board = {
        "id": board_id,
        "ownerId": user_id,
        "memberIds": [],
        "title": title,
        "createdAt": _now(),
        "columns": default_columns(),
        "cards": {},
    }
    data["boards"][board_id] = board
    return board


def add_board_member(board: dict[str, Any], user_id: str) -> None:
    members = board.setdefault("memberIds", [])
    if user_id not in members:
        members.append(user_id)


def remove_board_member(board: dict[str, Any], user_id: str) -> None:
    board["memberIds"] = [member_id for member_id in board.get("memberIds", []) if member_id != user_id]


def board_response(data: dict[str, Any], board: dict[str, Any], user_id: str) -> dict[str, Any]:
    """Augment a raw board dict with the viewer-relative fields the API response needs."""
    owner = data["users"].get(board["ownerId"])
    members = [
        {"id": member_id, "username": data["users"][member_id]["username"]}
        for member_id in board.get("memberIds", [])
        if member_id in data["users"]
    ]
    return {
        **board,
        "isOwner": board["ownerId"] == user_id,
        "ownerUsername": owner["username"] if owner else "unknown",
        "members": members,
    }
