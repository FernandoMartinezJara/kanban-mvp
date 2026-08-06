from typing import Dict, List

from pydantic import BaseModel, Field


class Card(BaseModel):
    id: str
    title: str
    details: str


class Column(BaseModel):
    id: str
    title: str
    cardIds: List[str]


class BoardContent(BaseModel):
    columns: List[Column]
    cards: Dict[str, Card]


class Board(BoardContent):
    id: str
    title: str
    createdAt: str


class BoardSummary(BaseModel):
    id: str
    title: str
    createdAt: str


class BoardCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=100)


class BoardUpdateRequest(BoardContent):
    title: str = Field(min_length=1, max_length=100)


class UserPublic(BaseModel):
    id: str
    username: str


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=4, max_length=200)


class AuthRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user: UserPublic


class AIRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)


class AIBoardRequest(BaseModel):
    boardId: str
    prompt: str = Field(min_length=1, max_length=4000)


class AIResponse(BaseModel):
    answer: str
    board: BoardContent | None = None
