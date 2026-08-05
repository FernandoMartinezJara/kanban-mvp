from pathlib import Path

import httpx
from fastapi import Depends, FastAPI, HTTPException, Header
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

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


def get_current_user(authorization: str | None = Header(None)) -> str:
    if authorization != "Bearer dummy-token":
        raise HTTPException(status_code=401, detail="Unauthorized")
    return "user"


@app.post("/api/auth/login", response_model=schemas.AuthResponse)
def login(request: schemas.AuthRequest):
    if request.username == "user" and request.password == "password":
        return {"token": "dummy-token"}
    raise HTTPException(status_code=401, detail="Invalid credentials")


@app.get("/api/kanban", response_model=schemas.BoardData)
def get_kanban(user: str = Depends(get_current_user)):
    return db.read_board()


@app.put("/api/kanban", response_model=schemas.BoardData)
def update_kanban(board: schemas.BoardData, user: str = Depends(get_current_user)):
    db.write_board(board.model_dump())
    return board


@app.post("/api/kanban/move", response_model=schemas.BoardData)
def move_card(payload: schemas.MoveCardRequest, user: str = Depends(get_current_user)):
    board = db.read_board()
    columns = board["columns"]
    active_id = payload.activeId
    over_id = payload.overId

    def find_column_id(columns_list, identifier):
        if any(column["id"] == identifier for column in columns_list):
            return identifier
        for column in columns_list:
            if identifier in column["cardIds"]:
                return column["id"]
        return None

    active_column_id = find_column_id(columns, active_id)
    over_column_id = find_column_id(columns, over_id)

    if not active_column_id or not over_column_id:
        raise HTTPException(status_code=400, detail="Invalid card or column id")

    active_column = next(column for column in columns if column["id"] == active_column_id)
    over_column = next(column for column in columns if column["id"] == over_column_id)

    is_over_column = active_column_id != over_column_id and over_id == over_column_id

    if active_column_id == over_column_id:
        if is_over_column:
            return {"columns": columns, "cards": board["cards"]}

        old_index = active_column["cardIds"].index(active_id)
        new_index = active_column["cardIds"].index(over_id)
        if old_index == new_index:
            return {"columns": columns, "cards": board["cards"]}

        next_card_ids = active_column["cardIds"].copy()
        next_card_ids.pop(old_index)
        next_card_ids.insert(new_index, active_id)
        active_column["cardIds"] = next_card_ids
    else:
        active_column["cardIds"].remove(active_id)
        if is_over_column:
            over_column["cardIds"].append(active_id)
        else:
            insert_index = over_column["cardIds"].index(over_id) if over_id in over_column["cardIds"] else len(over_column["cardIds"])
            over_column["cardIds"].insert(insert_index, active_id)

    db.write_board(board)
    return board


@app.post("/api/kanban/card", response_model=schemas.BoardData)
def add_card(request: schemas.AddCardRequest, user: str = Depends(get_current_user)):
    board = db.read_board()
    new_id = f"card-{len(board['cards']) + 1}"
    board["cards"][new_id] = {"id": new_id, "title": request.title, "details": request.details}
    for column in board["columns"]:
        if column["id"] == request.columnId:
            column["cardIds"].append(new_id)
            break
    db.write_board(board)
    return board


@app.post("/api/ai/query", response_model=schemas.AIResponse)
def ai_query(request: schemas.AIRequest, user: str = Depends(get_current_user)):
    try:
        answer = ai_client.fetch_openrouter_response(request.prompt)
        return {"answer": answer}
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"AI service error: {exc.response.text}")


@app.post("/api/ai/board", response_model=schemas.AIResponse)
def ai_board(request: schemas.AIBoardRequest, user: str = Depends(get_current_user)):
    board = request.board.model_dump() if request.board else db.read_board()
    try:
        answer, new_board = ai_client.fetch_openrouter_structured_response(request.prompt, board)
        if new_board is not None:
            return {"answer": answer, "board": new_board}
        return {"answer": answer}
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"AI service error: {exc.response.text}")


if frontend_path is not None:
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
else:
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

    @app.get("/", response_class=HTMLResponse)
    def read_root():
        return static_dir.joinpath("index.html").read_text(encoding="utf-8")
