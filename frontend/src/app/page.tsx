"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AuthForm } from "@/components/AuthForm";
import { EmptyBoardsState } from "@/components/EmptyBoardsState";
import { KanbanBoard } from "@/components/KanbanBoard";
import {
  changePassword as changePasswordApi,
  createBoard as createBoardApi,
  deleteBoard as deleteBoardApi,
  getBoard,
  getCurrentUser,
  listBoards,
  login as loginApi,
  logout as logoutApi,
  register as registerApi,
  saveBoard as saveBoardApi,
} from "@/lib/api";
import type { AuthUser } from "@/lib/api";
import type { Board, BoardSummary } from "@/lib/kanban";

const STORAGE_KEY = "pm-token";

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [board, setBoard] = useState<Board | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setToken(stored);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setBoards([]);
      setBoard(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const [me, boardList] = await Promise.all([
          getCurrentUser(token),
          listBoards(token),
        ]);
        if (cancelled) return;

        setUser(me);
        setBoards(boardList);
        setSessionError(null);

        if (boardList.length > 0) {
          const firstBoard = await getBoard(token, boardList[0].id);
          if (cancelled) return;
          setBoard(firstBoard);
        } else {
          setBoard(null);
        }
      } catch (err) {
        if (cancelled) return;
        setSessionError(String(err));
        setToken(null);
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleLogin = async (username: string, password: string) => {
    try {
      setLoading(true);
      const result = await loginApi(username, password);
      window.localStorage.setItem(STORAGE_KEY, result.token);
      setToken(result.token);
      setAuthError(null);
    } catch (err) {
      setAuthError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (username: string, password: string) => {
    try {
      setLoading(true);
      const result = await registerApi(username, password);
      window.localStorage.setItem(STORAGE_KEY, result.token);
      setToken(result.token);
      setAuthError(null);
    } catch (err) {
      setAuthError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (token) {
      void logoutApi(token).catch(() => {});
    }
    window.localStorage.removeItem(STORAGE_KEY);
    setToken(null);
  };

  const persistBoard = async (nextBoard: Board) => {
    if (!token) return;
    setBoard(nextBoard);
    setSaving(true);
    setSaveError(null);

    try {
      const saved = await saveBoardApi(token, nextBoard.id, {
        title: nextBoard.title,
        columns: nextBoard.columns,
        cards: nextBoard.cards,
      });
      setBoard(saved);
      setBoards((prev) =>
        prev.map((summary) =>
          summary.id === saved.id ? { ...summary, title: saved.title } : summary
        )
      );
    } catch (err) {
      setSaveError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSelectBoard = async (boardId: string) => {
    if (!token || boardId === board?.id) return;
    try {
      const selected = await getBoard(token, boardId);
      setBoard(selected);
      setSaveError(null);
    } catch (err) {
      setSaveError(String(err));
    }
  };

  const handleCreateBoard = async (title: string) => {
    if (!token) return;
    try {
      const created = await createBoardApi(token, title);
      setBoards((prev) => [
        ...prev,
        { id: created.id, title: created.title, createdAt: created.createdAt },
      ]);
      setBoard(created);
      setSaveError(null);
    } catch (err) {
      setSaveError(String(err));
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!token) return;
    try {
      await deleteBoardApi(token, boardId);
      const remaining = boards.filter((summary) => summary.id !== boardId);
      setBoards(remaining);

      if (boardId === board?.id) {
        if (remaining.length > 0) {
          const nextBoard = await getBoard(token, remaining[0].id);
          setBoard(nextBoard);
        } else {
          setBoard(null);
        }
      }
    } catch (err) {
      setSaveError(String(err));
    }
  };

  const handleRenameBoard = (title: string) => {
    if (!board) return;
    void persistBoard({ ...board, title });
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    if (!token) return;
    await changePasswordApi(token, currentPassword, newPassword);
  };

  if (loading) {
    return <p className="p-8 text-center text-sm text-[var(--gray-text)]">Loading...</p>;
  }

  if (!token || !user) {
    return (
      <AuthForm
        onLogin={handleLogin}
        onRegister={handleRegister}
        error={authError || sessionError}
      />
    );
  }

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />

      <main className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col gap-10 px-6 pb-16 pt-12">
        <AppHeader
          username={user.username}
          board={board}
          boards={boards}
          saving={saving}
          error={saveError}
          onSelectBoard={handleSelectBoard}
          onCreateBoard={handleCreateBoard}
          onDeleteBoard={handleDeleteBoard}
          onRenameBoard={handleRenameBoard}
          onChangePassword={handleChangePassword}
          onLogout={handleLogout}
        />

        {board ? (
          <KanbanBoard board={board} onSave={persistBoard} token={token} />
        ) : (
          <EmptyBoardsState onCreate={handleCreateBoard} />
        )}
      </main>
    </div>
  );
}
