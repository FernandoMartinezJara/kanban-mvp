import pytest

from backend import db


def test_validate_board_content_accepts_valid_board():
    board = {
        "columns": [{"id": "col-a", "title": "A", "cardIds": ["card-1"]}],
        "cards": {"card-1": {"id": "card-1", "title": "T", "details": "D"}},
    }
    db.validate_board_content(board)


def test_validate_board_content_rejects_dangling_reference():
    board = {
        "columns": [{"id": "col-a", "title": "A", "cardIds": ["missing-card"]}],
        "cards": {},
    }
    with pytest.raises(ValueError):
        db.validate_board_content(board)


def test_validate_board_content_rejects_duplicate_reference():
    board = {
        "columns": [
            {"id": "col-a", "title": "A", "cardIds": ["card-1"]},
            {"id": "col-b", "title": "B", "cardIds": ["card-1"]},
        ],
        "cards": {"card-1": {"id": "card-1", "title": "T", "details": "D"}},
    }
    with pytest.raises(ValueError):
        db.validate_board_content(board)


def test_write_data_then_read_data_round_trips():
    data = db.default_data()
    db.write_data(data)
    assert db.read_data() == data


def test_ensure_db_exists_seeds_default_data():
    assert not db.DB_PATH.exists()
    data = db.read_data()
    assert db.DB_PATH.exists()
    assert list(data["users"].values())[0]["username"] == "user"
    assert len(data["boards"]) == 1


def test_hash_password_produces_verifiable_hash():
    password_hash, salt = db.hash_password("secret123")
    assert db.verify_password("secret123", password_hash, salt)
    assert not db.verify_password("wrong-password", password_hash, salt)


def test_hash_password_uses_random_salt_by_default():
    hash_a, salt_a = db.hash_password("same-password")
    hash_b, salt_b = db.hash_password("same-password")
    assert salt_a != salt_b
    assert hash_a != hash_b


def test_set_user_password_changes_the_stored_hash():
    data = db.default_data()
    user = next(iter(data["users"].values()))
    old_hash = user["passwordHash"]

    db.set_user_password(user, "brand-new-password")

    assert user["passwordHash"] != old_hash
    assert db.verify_password("brand-new-password", user["passwordHash"], user["passwordSalt"])
    assert not db.verify_password("password", user["passwordHash"], user["passwordSalt"])


def test_default_data_seeds_cards_with_priority_and_due_dates():
    data = db.default_data()
    board = next(iter(data["boards"].values()))
    priorities = {card["priority"] for card in board["cards"].values()}
    assert priorities <= {"low", "medium", "high"}
    assert any(card["dueDate"] is not None for card in board["cards"].values())


def test_find_user_by_username_is_case_insensitive():
    data = db.default_data()
    user = db.find_user_by_username(data, "USER")
    assert user is not None
    assert user["username"] == "user"


def test_find_user_by_username_returns_none_when_missing():
    data = db.default_data()
    assert db.find_user_by_username(data, "nobody") is None


def test_create_user_adds_a_new_user_with_hashed_password():
    data = db.default_data()
    user = db.create_user(data, "alice", "hunter2")
    assert user["username"] == "alice"
    assert user["passwordHash"] != "hunter2"
    assert db.verify_password("hunter2", user["passwordHash"], user["passwordSalt"])
    assert data["users"][user["id"]] == user


def test_create_session_and_get_user_for_token():
    data = db.default_data()
    user_id = next(iter(data["users"]))
    token = db.create_session(data, user_id)
    resolved = db.get_user_for_token(data, token)
    assert resolved is not None
    assert resolved["id"] == user_id


def test_get_user_for_token_returns_none_for_unknown_token():
    data = db.default_data()
    assert db.get_user_for_token(data, "not-a-real-token") is None


def test_delete_session_invalidates_token():
    data = db.default_data()
    user_id = next(iter(data["users"]))
    token = db.create_session(data, user_id)
    db.delete_session(data, token)
    assert db.get_user_for_token(data, token) is None


def test_list_boards_for_user_only_returns_owned_boards():
    data = db.default_data()
    owner_id = next(iter(data["users"]))
    other = db.create_user(data, "other-user", "password123")
    db.create_board(data, other["id"], "Someone else's board")

    boards = db.list_boards_for_user(data, owner_id)
    assert len(boards) == 1
    assert boards[0]["ownerId"] == owner_id


def test_create_board_starts_with_empty_default_columns():
    data = db.default_data()
    user_id = next(iter(data["users"]))
    board = db.create_board(data, user_id, "New Board")
    assert board["title"] == "New Board"
    assert board["cards"] == {}
    assert [column["title"] for column in board["columns"]] == [
        "Backlog",
        "Discovery",
        "In Progress",
        "Review",
        "Done",
    ]
    assert all(column["cardIds"] == [] for column in board["columns"])


def test_get_owned_board_rejects_non_owner():
    data = db.default_data()
    owner_id = next(iter(data["users"]))
    board_id = next(iter(data["boards"]))
    other = db.create_user(data, "other-user", "password123")

    assert db.get_owned_board(data, board_id, owner_id) is not None
    assert db.get_owned_board(data, board_id, other["id"]) is None


def test_get_owned_board_returns_none_for_unknown_board():
    data = db.default_data()
    owner_id = next(iter(data["users"]))
    assert db.get_owned_board(data, "does-not-exist", owner_id) is None
