import json

import httpx
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def login(username: str = "user", password: str = "password") -> dict:
    response = client.post("/api/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return response.json()


def register(username: str, password: str = "password123") -> dict:
    response = client.post("/api/auth/register", json={"username": username, "password": password})
    assert response.status_code == 201
    return response.json()


def test_health_endpoint_returns_ok():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_hello_endpoint_returns_message():
    response = client.get("/api/hello")
    assert response.status_code == 200
    assert response.json() == {"message": "hello from backend"}


class TestAuth:
    def test_login_with_seeded_credentials_returns_token_and_user(self):
        data = login()
        assert data["user"]["username"] == "user"
        assert isinstance(data["token"], str) and len(data["token"]) > 10

    def test_login_with_wrong_password_is_rejected(self):
        response = client.post("/api/auth/login", json={"username": "user", "password": "nope"})
        assert response.status_code == 401

    def test_login_with_unknown_username_is_rejected(self):
        response = client.post("/api/auth/login", json={"username": "ghost", "password": "password"})
        assert response.status_code == 401

    def test_register_creates_a_new_user_and_logs_them_in(self):
        data = register("new-person")
        assert data["user"]["username"] == "new-person"
        me = client.get("/api/auth/me", headers=auth_headers(data["token"]))
        assert me.status_code == 200
        assert me.json()["username"] == "new-person"

    def test_register_rejects_duplicate_username(self):
        register("duplicate-person")
        response = client.post(
            "/api/auth/register", json={"username": "duplicate-person", "password": "password123"}
        )
        assert response.status_code == 409

    def test_register_rejects_duplicate_username_case_insensitively(self):
        register("CaseUser")
        response = client.post(
            "/api/auth/register", json={"username": "caseuser", "password": "password123"}
        )
        assert response.status_code == 409

    def test_register_rejects_short_password(self):
        response = client.post(
            "/api/auth/register", json={"username": "shortpw", "password": "a"}
        )
        assert response.status_code == 422

    def test_register_rejects_short_username(self):
        response = client.post(
            "/api/auth/register", json={"username": "ab", "password": "password123"}
        )
        assert response.status_code == 422

    def test_me_requires_auth(self):
        response = client.get("/api/auth/me")
        assert response.status_code == 401

    def test_logout_invalidates_token(self):
        token = login()["token"]
        response = client.post("/api/auth/logout", headers=auth_headers(token))
        assert response.status_code == 204

        response = client.get("/api/auth/me", headers=auth_headers(token))
        assert response.status_code == 401

    def test_malformed_authorization_header_is_rejected(self):
        response = client.get("/api/auth/me", headers={"Authorization": "not-bearer token"})
        assert response.status_code == 401


class TestChangePassword:
    def test_change_password_requires_auth(self):
        response = client.post(
            "/api/auth/change-password",
            json={"currentPassword": "password", "newPassword": "new-password123"},
        )
        assert response.status_code == 401

    def test_change_password_with_correct_current_password_succeeds(self):
        token = register("password-changer")["token"]
        response = client.post(
            "/api/auth/change-password",
            headers=auth_headers(token),
            json={"currentPassword": "password123", "newPassword": "new-password456"},
        )
        assert response.status_code == 200

        old_login = client.post(
            "/api/auth/login",
            json={"username": "password-changer", "password": "password123"},
        )
        assert old_login.status_code == 401

        new_login = client.post(
            "/api/auth/login",
            json={"username": "password-changer", "password": "new-password456"},
        )
        assert new_login.status_code == 200

    def test_change_password_with_wrong_current_password_is_rejected(self):
        token = register("wrong-password-changer")["token"]
        response = client.post(
            "/api/auth/change-password",
            headers=auth_headers(token),
            json={"currentPassword": "not-the-password", "newPassword": "new-password456"},
        )
        assert response.status_code == 401

    def test_change_password_rejects_short_new_password(self):
        token = register("short-password-changer")["token"]
        response = client.post(
            "/api/auth/change-password",
            headers=auth_headers(token),
            json={"currentPassword": "password123", "newPassword": "a"},
        )
        assert response.status_code == 422


class TestBoards:
    def test_list_boards_requires_auth(self):
        response = client.get("/api/boards")
        assert response.status_code == 401

    def test_seeded_user_has_one_board(self):
        token = login()["token"]
        response = client.get("/api/boards", headers=auth_headers(token))
        assert response.status_code == 200
        boards = response.json()
        assert len(boards) == 1
        assert boards[0]["title"] == "Product Roadmap"

    def test_new_user_has_no_boards(self):
        token = register("boardless-user")["token"]
        response = client.get("/api/boards", headers=auth_headers(token))
        assert response.status_code == 200
        assert response.json() == []

    def test_create_board_returns_empty_board_with_default_columns(self):
        token = register("board-creator")["token"]
        response = client.post(
            "/api/boards", headers=auth_headers(token), json={"title": "Launch Plan"}
        )
        assert response.status_code == 201
        board = response.json()
        assert board["title"] == "Launch Plan"
        assert board["cards"] == {}
        assert len(board["columns"]) == 5

    def test_create_board_rejects_blank_title(self):
        token = register("blank-title-user")["token"]
        response = client.post("/api/boards", headers=auth_headers(token), json={"title": ""})
        assert response.status_code == 422

    def test_get_board_returns_full_content(self):
        token = login()["token"]
        board_id = client.get("/api/boards", headers=auth_headers(token)).json()[0]["id"]
        response = client.get(f"/api/boards/{board_id}", headers=auth_headers(token))
        assert response.status_code == 200
        assert "columns" in response.json() and "cards" in response.json()

    def test_get_board_404s_for_unknown_board(self):
        token = login()["token"]
        response = client.get("/api/boards/does-not-exist", headers=auth_headers(token))
        assert response.status_code == 404

    def test_get_board_404s_for_board_owned_by_another_user(self):
        owner_token = login()["token"]
        board_id = client.get("/api/boards", headers=auth_headers(owner_token)).json()[0]["id"]

        other_token = register("someone-else")["token"]
        response = client.get(f"/api/boards/{board_id}", headers=auth_headers(other_token))
        assert response.status_code == 404

    def test_update_board_persists_changes(self):
        token = register("update-user")["token"]
        board = client.post(
            "/api/boards", headers=auth_headers(token), json={"title": "Sprint Board"}
        ).json()

        updated = {
            "title": "Sprint Board Renamed",
            "columns": [{"id": "col-a", "title": "A", "cardIds": ["card-1"]}],
            "cards": {"card-1": {"id": "card-1", "title": "T", "details": "D"}},
        }
        response = client.put(
            f"/api/boards/{board['id']}", headers=auth_headers(token), json=updated
        )
        assert response.status_code == 200
        assert response.json()["title"] == "Sprint Board Renamed"

        card = response.json()["cards"]["card-1"]
        assert card["priority"] == "medium"
        assert card["dueDate"] is None

        refetched = client.get(f"/api/boards/{board['id']}", headers=auth_headers(token))
        assert refetched.json()["columns"][0]["title"] == "A"

    def test_update_board_persists_explicit_priority_and_due_date(self):
        token = register("priority-user")["token"]
        board = client.post(
            "/api/boards", headers=auth_headers(token), json={"title": "Board"}
        ).json()

        updated = {
            "title": "Board",
            "columns": [{"id": "col-a", "title": "A", "cardIds": ["card-1"]}],
            "cards": {
                "card-1": {
                    "id": "card-1",
                    "title": "T",
                    "details": "D",
                    "priority": "high",
                    "dueDate": "2026-01-01",
                }
            },
        }
        response = client.put(
            f"/api/boards/{board['id']}", headers=auth_headers(token), json=updated
        )
        assert response.status_code == 200
        card = response.json()["cards"]["card-1"]
        assert card["priority"] == "high"
        assert card["dueDate"] == "2026-01-01"

    def test_update_board_rejects_invalid_priority(self):
        token = register("invalid-priority-user")["token"]
        board = client.post(
            "/api/boards", headers=auth_headers(token), json={"title": "Board"}
        ).json()

        updated = {
            "title": "Board",
            "columns": [{"id": "col-a", "title": "A", "cardIds": ["card-1"]}],
            "cards": {
                "card-1": {"id": "card-1", "title": "T", "details": "D", "priority": "urgent"}
            },
        }
        response = client.put(
            f"/api/boards/{board['id']}", headers=auth_headers(token), json=updated
        )
        assert response.status_code == 422

    def test_update_board_rejects_dangling_card_reference(self):
        token = register("dangling-user")["token"]
        board = client.post(
            "/api/boards", headers=auth_headers(token), json={"title": "Board"}
        ).json()

        response = client.put(
            f"/api/boards/{board['id']}",
            headers=auth_headers(token),
            json={
                "title": "Board",
                "columns": [{"id": "col-a", "title": "A", "cardIds": ["missing-card"]}],
                "cards": {},
            },
        )
        assert response.status_code == 422

    def test_update_board_404s_for_board_owned_by_another_user(self):
        owner_token = login()["token"]
        board_id = client.get("/api/boards", headers=auth_headers(owner_token)).json()[0]["id"]

        other_token = register("intruder")["token"]
        response = client.put(
            f"/api/boards/{board_id}",
            headers=auth_headers(other_token),
            json={"title": "Hijacked", "columns": [], "cards": {}},
        )
        assert response.status_code == 404

    def test_delete_board_removes_it(self):
        token = register("delete-user")["token"]
        board = client.post(
            "/api/boards", headers=auth_headers(token), json={"title": "Temp Board"}
        ).json()

        response = client.delete(f"/api/boards/{board['id']}", headers=auth_headers(token))
        assert response.status_code == 204

        refetched = client.get(f"/api/boards/{board['id']}", headers=auth_headers(token))
        assert refetched.status_code == 404

    def test_delete_board_404s_for_board_owned_by_another_user(self):
        owner_token = login()["token"]
        board_id = client.get("/api/boards", headers=auth_headers(owner_token)).json()[0]["id"]

        other_token = register("another-intruder")["token"]
        response = client.delete(f"/api/boards/{board_id}", headers=auth_headers(other_token))
        assert response.status_code == 404


class TestAIQuery:
    def test_ai_query_requires_auth(self):
        response = client.post("/api/ai/query", json={"prompt": "Say hello."})
        assert response.status_code == 401

    def test_ai_query_with_auth_returns_error_for_missing_key(self, monkeypatch):
        monkeypatch.setenv("OPENROUTER_API_KEY", "")
        token = login()["token"]

        response = client.post(
            "/api/ai/query",
            headers=auth_headers(token),
            json={"prompt": "Say hello."},
        )
        assert response.status_code == 502
        assert "not configured" in response.json()["detail"]

    def test_ai_query_rejects_blank_prompt(self):
        token = login()["token"]
        response = client.post(
            "/api/ai/query", headers=auth_headers(token), json={"prompt": ""}
        )
        assert response.status_code == 422

    def test_ai_query_rejects_prompt_over_max_length(self):
        token = login()["token"]
        response = client.post(
            "/api/ai/query",
            headers=auth_headers(token),
            json={"prompt": "a" * 4001},
        )
        assert response.status_code == 422

    def test_ai_query_returns_502_on_network_error(self, monkeypatch):
        def fake_post(*args, **kwargs):
            raise httpx.ConnectError("connection refused")

        monkeypatch.setattr("backend.ai_client.httpx.post", fake_post)
        monkeypatch.setenv("OPENROUTER_API_KEY", "testkey")
        token = login()["token"]

        response = client.post(
            "/api/ai/query",
            headers=auth_headers(token),
            json={"prompt": "Say hello."},
        )
        assert response.status_code == 502
        assert "AI service error" in response.json()["detail"]


class TestAIBoard:
    def test_ai_board_requires_auth(self):
        response = client.post("/api/ai/board", json={"prompt": "Move a card.", "boardId": "board-1"})
        assert response.status_code == 401

    def test_ai_board_404s_for_unknown_board(self):
        token = login()["token"]
        response = client.post(
            "/api/ai/board",
            headers=auth_headers(token),
            json={"prompt": "Move a card.", "boardId": "does-not-exist"},
        )
        assert response.status_code == 404

    def test_ai_board_returns_502_on_network_error(self, monkeypatch):
        def fake_post(*args, **kwargs):
            raise httpx.TimeoutException("timed out")

        monkeypatch.setattr("backend.ai_client.httpx.post", fake_post)
        monkeypatch.setenv("OPENROUTER_API_KEY", "testkey")

        token = login()["token"]
        board_id = client.get("/api/boards", headers=auth_headers(token)).json()[0]["id"]

        response = client.post(
            "/api/ai/board",
            headers=auth_headers(token),
            json={"prompt": "Move a card.", "boardId": board_id},
        )
        assert response.status_code == 502
        assert "AI service error" in response.json()["detail"]

    def test_ai_board_with_invalid_response(self, monkeypatch):
        class DummyResponse:
            def raise_for_status(self):
                return None

            def json(self):
                return {"choices": [{"message": {"content": "not json"}}]}

        def fake_post(*args, **kwargs):
            return DummyResponse()

        monkeypatch.setattr("backend.ai_client.httpx.post", fake_post)
        monkeypatch.setenv("OPENROUTER_API_KEY", "testkey")

        token = login()["token"]
        board_id = client.get("/api/boards", headers=auth_headers(token)).json()[0]["id"]

        response = client.post(
            "/api/ai/board",
            headers=auth_headers(token),
            json={"prompt": "Move a card.", "boardId": board_id},
        )

        assert response.status_code == 502
        assert "Unexpected OpenRouter response format" in response.json()["detail"]

    def test_ai_board_drops_invalid_suggested_board(self, monkeypatch):
        class DummyResponse:
            def raise_for_status(self):
                return None

            def json(self):
                return {
                    "choices": [
                        {
                            "message": {
                                "content": json.dumps(
                                    {
                                        "answer": "Moved it!",
                                        "board": {
                                            "columns": [
                                                {
                                                    "id": "col-a",
                                                    "title": "A",
                                                    "cardIds": ["missing-card"],
                                                }
                                            ],
                                            "cards": {},
                                        },
                                    }
                                )
                            }
                        }
                    ]
                }

        def fake_post(*args, **kwargs):
            return DummyResponse()

        monkeypatch.setattr("backend.ai_client.httpx.post", fake_post)
        monkeypatch.setenv("OPENROUTER_API_KEY", "testkey")

        token = login()["token"]
        board_id = client.get("/api/boards", headers=auth_headers(token)).json()[0]["id"]

        response = client.post(
            "/api/ai/board",
            headers=auth_headers(token),
            json={"prompt": "Move a card.", "boardId": board_id},
        )

        assert response.status_code == 200
        data = response.json()
        assert data.get("board") is None
        assert "Moved it!" in data["answer"]
        assert "not applied" in data["answer"]

    def test_ai_board_applies_valid_suggested_board(self, monkeypatch):
        class DummyResponse:
            def raise_for_status(self):
                return None

            def json(self):
                return {
                    "choices": [
                        {
                            "message": {
                                "content": json.dumps(
                                    {
                                        "answer": "Added a card.",
                                        "board": {
                                            "columns": [
                                                {"id": "col-a", "title": "A", "cardIds": ["card-1"]}
                                            ],
                                            "cards": {
                                                "card-1": {
                                                    "id": "card-1",
                                                    "title": "New task",
                                                    "details": "Created by AI.",
                                                }
                                            },
                                        },
                                    }
                                )
                            }
                        }
                    ]
                }

        def fake_post(*args, **kwargs):
            return DummyResponse()

        monkeypatch.setattr("backend.ai_client.httpx.post", fake_post)
        monkeypatch.setenv("OPENROUTER_API_KEY", "testkey")

        token = login()["token"]
        board_id = client.get("/api/boards", headers=auth_headers(token)).json()[0]["id"]

        response = client.post(
            "/api/ai/board",
            headers=auth_headers(token),
            json={"prompt": "Add a task.", "boardId": board_id},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["board"]["cards"]["card-1"]["title"] == "New task"
