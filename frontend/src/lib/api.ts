import type { Board, BoardData, BoardSummary } from "./kanban";

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

const apiFetch = async (
  path: string,
  token: string | null,
  options: ApiRequestOptions = {}
) => {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || response.statusText || "Request failed");
  }

  if (response.status === 204) {
    return undefined;
  }

  return response.json();
};

export type AuthUser = {
  id: string;
  username: string;
};

export type AuthResult = {
  token: string;
  user: AuthUser;
};

export const login = (username: string, password: string): Promise<AuthResult> =>
  apiFetch("/api/auth/login", null, { method: "POST", body: { username, password } });

export const register = (username: string, password: string): Promise<AuthResult> =>
  apiFetch("/api/auth/register", null, { method: "POST", body: { username, password } });

export const logout = (token: string): Promise<void> =>
  apiFetch("/api/auth/logout", token, { method: "POST" });

export const getCurrentUser = (token: string): Promise<AuthUser> =>
  apiFetch("/api/auth/me", token, { method: "GET" });

export const changePassword = (
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<AuthUser> =>
  apiFetch("/api/auth/change-password", token, {
    method: "POST",
    body: { currentPassword, newPassword },
  });

export const listBoards = (token: string): Promise<BoardSummary[]> =>
  apiFetch("/api/boards", token, { method: "GET" });

export const createBoard = (token: string, title: string): Promise<Board> =>
  apiFetch("/api/boards", token, { method: "POST", body: { title } });

export const getBoard = (token: string, boardId: string): Promise<Board> =>
  apiFetch(`/api/boards/${boardId}`, token, { method: "GET" });

export const saveBoard = (
  token: string,
  boardId: string,
  board: { title: string } & BoardData
): Promise<Board> =>
  apiFetch(`/api/boards/${boardId}`, token, { method: "PUT", body: board });

export const deleteBoard = (token: string, boardId: string): Promise<void> =>
  apiFetch(`/api/boards/${boardId}`, token, { method: "DELETE" });

export const sendAIBoardQuery = (
  token: string,
  boardId: string,
  prompt: string
): Promise<{ answer: string; board?: BoardData }> =>
  apiFetch("/api/ai/board", token, { method: "POST", body: { prompt, boardId } });
