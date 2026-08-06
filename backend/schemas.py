from typing import Dict, List, Literal

from pydantic import BaseModel, Field

Priority = Literal["low", "medium", "high"]


class Card(BaseModel):
    id: str
    title: str
    details: str
    priority: Priority = "medium"
    dueDate: str | None = None


class Column(BaseModel):
    id: str
    title: str
    cardIds: List[str]


class BoardContent(BaseModel):
    columns: List[Column]
    cards: Dict[str, Card]


class UserPublic(BaseModel):
    id: str
    username: str


class Board(BoardContent):
    id: str
    title: str
    createdAt: str
    isOwner: bool
    ownerUsername: str
    members: List[UserPublic] = []


class BoardSummary(BaseModel):
    id: str
    title: str
    createdAt: str
    isOwner: bool
    ownerUsername: str


class BoardCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=100)


class BoardUpdateRequest(BoardContent):
    title: str = Field(min_length=1, max_length=100)


class ShareBoardRequest(BaseModel):
    username: str = Field(min_length=1, max_length=50)


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=4, max_length=200)


class AuthRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user: UserPublic


class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str = Field(min_length=4, max_length=200)


class AIRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)


class AIBoardRequest(BaseModel):
    boardId: str
    prompt: str = Field(min_length=1, max_length=4000)


class AIResponse(BaseModel):
    answer: str
    board: BoardContent | None = None
