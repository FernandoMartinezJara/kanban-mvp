from pathlib import Path

import httpx
from fastapi import Depends, FastAPI, HTTPException, Header
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
    try:
        db.write_board(board.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
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
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"AI service error: {exc.response.text}")

    if new_board is None:
        return {"answer": answer}

    try:
        validated_board = schemas.BoardData(**new_board)
        db.validate_board(new_board)
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
