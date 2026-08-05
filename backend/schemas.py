from pydantic import BaseModel
from typing import Dict, List


class Card(BaseModel):
    id: str
    title: str
    details: str


class Column(BaseModel):
    id: str
    title: str
    cardIds: List[str]


class BoardData(BaseModel):
    columns: List[Column]
    cards: Dict[str, Card]


class AuthRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    token: str


class AIRequest(BaseModel):
    prompt: str


class AIBoardRequest(BaseModel):
    prompt: str
    board: BoardData | None = None


class AIResponse(BaseModel):
    answer: str
    board: BoardData | None = None
