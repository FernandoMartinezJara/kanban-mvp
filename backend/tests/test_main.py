import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend import db
from backend.main import app

client = TestClient(app)


def test_health_endpoint_returns_ok():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_hello_endpoint_returns_message():
    response = client.get("/api/hello")
    assert response.status_code == 200
    assert response.json() == {"message": "hello from backend"}


def test_login_returns_dummy_token():
    response = client.post("/api/auth/login", json={"username": "user", "password": "password"})
    assert response.status_code == 200
    assert response.json() == {"token": "dummy-token"}


def test_get_kanban_requires_auth():
    response = client.get("/api/kanban")
    assert response.status_code == 401


def test_put_kanban_updates_board(tmp_path, monkeypatch):
    test_db = tmp_path / "test-kanban.db"
    monkeypatch.setattr(db, "DB_PATH", test_db)
    monkeypatch.setattr(db, "DEFAULT_BOARD", {"columns": [], "cards": {}})

    response = client.put(
        "/api/kanban",
        headers={"Authorization": "Bearer dummy-token"},
        json={"columns": [], "cards": {}},
    )
    assert response.status_code == 200
    assert response.json() == {"columns": [], "cards": {}}

    saved = json.loads(test_db.read_text(encoding="utf-8"))
    assert saved == {"columns": [], "cards": {}}


def test_ai_query_requires_auth():
    response = client.post("/api/ai/query", json={"prompt": "Say hello."})
    assert response.status_code == 401


def test_ai_query_with_auth_returns_error_for_missing_key(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "")

    response = client.post(
        "/api/ai/query",
        headers={"Authorization": "Bearer dummy-token"},
        json={"prompt": "Say hello."},
    )
    assert response.status_code == 502
    assert "not configured" in response.json()["detail"]


def test_ai_board_requires_auth():
    response = client.post("/api/ai/board", json={"prompt": "Move a card."})
    assert response.status_code == 401


def test_ai_board_with_invalid_response(monkeypatch):
    class DummyResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"choices": [{"message": {"content": "not json"}}]}

    def fake_post(*args, **kwargs):
        return DummyResponse()

    monkeypatch.setattr("backend.ai_client.httpx.post", fake_post)
    monkeypatch.setenv("OPENROUTER_API_KEY", "testkey")

    response = client.post(
        "/api/ai/board",
        headers={"Authorization": "Bearer dummy-token"},
        json={"prompt": "Move a card.", "board": {"columns": [], "cards": {}}},
    )

    assert response.status_code == 502
    assert "Unexpected OpenRouter response format" in response.json()["detail"]
