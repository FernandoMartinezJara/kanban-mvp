import { useState } from "react";

type LoginFormProps = {
  onLogin: (username: string, password: string) => Promise<void>;
  error: string | null;
};

export const LoginForm = ({ onLogin, error }: LoginFormProps) => {
  const [username, setUsername] = useState("user");
  const [password, setPassword] = useState("password");

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-6 py-16">
      <div className="w-full rounded-[32px] border border-[var(--stroke)] bg-white/90 p-10 shadow-[var(--shadow)]">
        <h1 className="text-3xl font-semibold text-[var(--navy-dark)]">Sign in</h1>
        <p className="mt-3 text-sm text-[var(--gray-text)]">Use user / password to access the Kanban board.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onLogin(username, password);
          }}
          className="mt-8 space-y-4"
        >
          <label className="block text-sm font-medium text-[var(--navy-dark)]">
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--primary-blue)]"
            />
          </label>
          <label className="block text-sm font-medium text-[var(--navy-dark)]">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--primary-blue)]"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="w-full rounded-2xl bg-[var(--primary-blue)] px-4 py-3 text-sm font-semibold text-white">
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
};
