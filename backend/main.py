from pathlib import Path

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException, Response
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError

from backend import ai_client, db, schemas

app = FastAPI()

base_dir = Path(__file__).resolve().parent
frontend_dir = base_dir / "frontend_out"
alternate_frontend_dir = base_dir.parent / "frontend" / "out"
static_dir = base_dir / "static"

frontend_path = None
if frontend_dir.exists():
    frontend_path = frontend_dir
elif alternate_frontend_dir.exists():
    frontend_path = alternate_frontend_dir


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/hello")
def hello():
    return {"message": "hello from backend"}


def get_current_user(authorization: str | None = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.removeprefix("Bearer ")
    data = db.read_data()
    user = db.get_user_for_token(data, token)
    if user is None:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user


@app.post("/api/auth/register", response_model=schemas.AuthResponse, status_code=201)
def register(request: schemas.RegisterRequest):
    data = db.read_data()
    if db.find_user_by_username(data, request.username) is not None:
        raise HTTPException(status_code=409, detail="Username already taken")
    user = db.create_user(data, request.username.strip(), request.password)
    token = db.create_session(data, user["id"])
    db.write_data(data)
    return {"token": token, "user": {"id": user["id"], "username": user["username"]}}


@app.post("/api/auth/login", response_model=schemas.AuthResponse)
def login(request: schemas.AuthRequest):
    data = db.read_data()
    user = db.find_user_by_username(data, request.username)
    if user is None or not db.verify_password(
        request.password, user["passwordHash"], user["passwordSalt"]
    ):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = db.create_session(data, user["id"])
    db.write_data(data)
    return {"token": token, "user": {"id": user["id"], "username": user["username"]}}


@app.post("/api/auth/logout", status_code=204)
def logout(
    authorization: str | None = Header(None), user: dict = Depends(get_current_user)
):
    data = db.read_data()
    token = authorization.removeprefix("Bearer ") if authorization else ""
    db.delete_session(data, token)
    db.write_data(data)
    return Response(status_code=204)


@app.get("/api/auth/me", response_model=schemas.UserPublic)
def me(user: dict = Depends(get_current_user)):
    return user


@app.post("/api/auth/change-password", response_model=schemas.UserPublic)
def change_password(
    request: schemas.ChangePasswordRequest, user: dict = Depends(get_current_user)
):
    data = db.read_data()
    current_user = data["users"][user["id"]]
    if not db.verify_password(
        request.currentPassword, current_user["passwordHash"], current_user["passwordSalt"]
    ):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    db.set_user_password(current_user, request.newPassword)
    db.write_data(data)
    return current_user


@app.get("/api/boards", response_model=list[schemas.BoardSummary])
def list_boards(user: dict = Depends(get_current_user)):
    data = db.read_data()
    return db.list_boards_for_user(data, user["id"])


@app.post("/api/boards", response_model=schemas.Board, status_code=201)
def create_board(
    request: schemas.BoardCreateRequest, user: dict = Depends(get_current_user)
):
    data = db.read_data()
    board = db.create_board(data, user["id"], request.title.strip())
    db.write_data(data)
    return board


@app.get("/api/boards/{board_id}", response_model=schemas.Board)
def get_board(board_id: str, user: dict = Depends(get_current_user)):
    data = db.read_data()
    board = db.get_owned_board(data, board_id, user["id"])
    if board is None:
        raise HTTPException(status_code=404, detail="Board not found")
    return board


@app.put("/api/boards/{board_id}", response_model=schemas.Board)
def update_board(
    board_id: str,
    request: schemas.BoardUpdateRequest,
    user: dict = Depends(get_current_user),
):
    data = db.read_data()
    board = db.get_owned_board(data, board_id, user["id"])
    if board is None:
        raise HTTPException(status_code=404, detail="Board not found")

    content = {
        "columns": [column.model_dump() for column in request.columns],
        "cards": {card_id: card.model_dump() for card_id, card in request.cards.items()},
    }
    try:
        db.validate_board_content(content)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    board["title"] = request.title.strip()
    board["columns"] = content["columns"]
    board["cards"] = content["cards"]
    db.write_data(data)
    return board


@app.delete("/api/boards/{board_id}", status_code=204)
def delete_board(board_id: str, user: dict = Depends(get_current_user)):
    data = db.read_data()
    board = db.get_owned_board(data, board_id, user["id"])
    if board is None:
        raise HTTPException(status_code=404, detail="Board not found")
    del data["boards"][board_id]
    db.write_data(data)
    return Response(status_code=204)


@app.post("/api/ai/query", response_model=schemas.AIResponse)
def ai_query(request: schemas.AIRequest, user: dict = Depends(get_current_user)):
    try:
        answer = ai_client.fetch_openrouter_response(request.prompt)
        return {"answer": answer}
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"AI service error: {exc.response.text}")
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"AI service error: {exc}")


@app.post("/api/ai/board", response_model=schemas.AIResponse)
def ai_board(request: schemas.AIBoardRequest, user: dict = Depends(get_current_user)):
    data = db.read_data()
    board = db.get_owned_board(data, request.boardId, user["id"])
    if board is None:
        raise HTTPException(status_code=404, detail="Board not found")

    board_content = {"columns": board["columns"], "cards": board["cards"]}
    try:
        answer, new_board = ai_client.fetch_openrouter_structured_response(
            request.prompt, board_content
        )
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"AI service error: {exc.response.text}")
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"AI service error: {exc}")

    if new_board is None:
        return {"answer": answer}

    try:
        validated_board = schemas.BoardContent(**new_board)
        db.validate_board_content(new_board)
    except (ValidationError, ValueError):
        return {
            "answer": f"{answer}\n\n(The suggested board update was invalid and was not applied.)"
        }

    return {"answer": answer, "board": validated_board}


if frontend_path is not None:
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
else:
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

    @app.get("/", response_class=HTMLResponse)
    def read_root():
        return static_dir.joinpath("index.html").read_text(encoding="utf-8")
