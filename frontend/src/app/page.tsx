"use client";

import { useEffect, useState } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LoginForm } from "@/components/LoginForm";
import { getKanban, login } from "@/lib/api";
import type { BoardData } from "@/lib/kanban";

const STORAGE_KEY = "pm-token";

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [board, setBoard] = useState<BoardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setToken(stored);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setBoard(null);
      return;
    }

    setLoading(true);
    getKanban(token)
      .then((response) => setBoard(response))
      .catch((err) => {
        setError(String(err));
        setToken(null);
        window.localStorage.removeItem(STORAGE_KEY);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleLogin = async (username: string, password: string) => {
    try {
      setLoading(true);
      const result = await login(username, password);
      window.localStorage.setItem(STORAGE_KEY, result.token);
      setToken(result.token);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setBoard(null);
  };

  if (loading) {
    return <p className="p-8 text-center text-sm text-[var(--gray-text)]">Loading...</p>;
  }

  if (!token) {
    return <LoginForm onLogin={handleLogin} error={error} />;
  }

  if (!board) {
    return <p className="p-8 text-center text-sm text-[var(--gray-text)]">Loading board...</p>;
  }

  return (
    <KanbanBoard board={board} setBoard={setBoard} token={token} onLogout={handleLogout} />
  );
}
