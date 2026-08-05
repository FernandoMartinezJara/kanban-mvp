import pytest

from backend import db


def test_validate_board_accepts_valid_board():
    board = {
        "columns": [{"id": "col-a", "title": "A", "cardIds": ["card-1"]}],
        "cards": {"card-1": {"id": "card-1", "title": "T", "details": "D"}},
    }
    db.validate_board(board)


def test_validate_board_rejects_dangling_reference():
    board = {
        "columns": [{"id": "col-a", "title": "A", "cardIds": ["missing-card"]}],
        "cards": {},
    }
    with pytest.raises(ValueError):
        db.validate_board(board)


def test_validate_board_rejects_duplicate_reference():
    board = {
        "columns": [
            {"id": "col-a", "title": "A", "cardIds": ["card-1"]},
            {"id": "col-b", "title": "B", "cardIds": ["card-1"]},
        ],
        "cards": {"card-1": {"id": "card-1", "title": "T", "details": "D"}},
    }
    with pytest.raises(ValueError):
        db.validate_board(board)


def test_write_board_rejects_invalid_board_without_writing(tmp_path, monkeypatch):
    test_db = tmp_path / "test-kanban.db"
    monkeypatch.setattr(db, "DB_PATH", test_db)

    invalid_board = {
        "columns": [{"id": "col-a", "title": "A", "cardIds": ["missing-card"]}],
        "cards": {},
    }
    with pytest.raises(ValueError):
        db.write_board(invalid_board)

    assert not test_db.exists()
    assert list(tmp_path.iterdir()) == []


def test_write_board_then_read_board_round_trips(tmp_path, monkeypatch):
    test_db = tmp_path / "test-kanban.db"
    monkeypatch.setattr(db, "DB_PATH", test_db)

    board = {
        "columns": [{"id": "col-a", "title": "A", "cardIds": ["card-1"]}],
        "cards": {"card-1": {"id": "card-1", "title": "T", "details": "D"}},
    }
    db.write_board(board)
    assert db.read_board() == board
    assert list(tmp_path.iterdir()) == [test_db]
