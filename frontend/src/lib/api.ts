import type { BoardData } from "./kanban";

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

const apiFetch = async (path: string, token: string, options: ApiRequestOptions = {}) => {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || response.statusText || "Request failed");
  }

  return response.json();
};

export type LoginResult = {
  token: string;
};

export const login = async (username: string, password: string): Promise<LoginResult> => {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || "Login failed");
  }

  return response.json();
};

export const getKanban = async (token: string): Promise<BoardData> => {
  return apiFetch("/api/kanban", token, { method: "GET" });
};

export const saveKanban = async (token: string, board: BoardData): Promise<BoardData> => {
  return apiFetch("/api/kanban", token, { method: "PUT", body: board });
};

export const sendAIQuery = async (
  token: string,
  prompt: string,
  board: BoardData
): Promise<{ answer: string; board?: BoardData }> => {
  return apiFetch("/api/ai/board", token, { method: "POST", body: { prompt, board } });
};
