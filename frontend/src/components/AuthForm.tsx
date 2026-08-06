import { useState } from "react";

type AuthFormProps = {
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (username: string, password: string) => Promise<void>;
  error: string | null;
};

export const AuthForm = ({ onLogin, onRegister, error }: AuthFormProps) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("user");
  const [password, setPassword] = useState("password");

  const isLogin = mode === "login";

  const switchMode = () => {
    setMode(isLogin ? "register" : "login");
    setUsername("");
    setPassword("");
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-6 py-16">
      <div className="w-full rounded-[32px] border border-[var(--stroke)] bg-white/90 p-10 shadow-[var(--shadow)]">
        <h1 className="text-3xl font-semibold text-[var(--navy-dark)]">
          {isLogin ? "Sign in" : "Create an account"}
        </h1>
        <p className="mt-3 text-sm text-[var(--gray-text)]">
          {isLogin
            ? "Use user / password to explore the demo, or your own account."
            : "Pick a username and password to set up a new account."}
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void (isLogin ? onLogin(username, password) : onRegister(username, password));
          }}
          className="mt-8 space-y-4"
        >
          <label className="block text-sm font-medium text-[var(--navy-dark)]">
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--primary-blue)]"
              autoComplete="username"
              required
            />
          </label>
          <label className="block text-sm font-medium text-[var(--navy-dark)]">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--primary-blue)]"
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-2xl bg-[var(--primary-blue)] px-4 py-3 text-sm font-semibold text-white"
          >
            {isLogin ? "Sign in" : "Create account"}
          </button>
        </form>
        <button
          type="button"
          onClick={switchMode}
          className="mt-6 w-full text-center text-sm font-semibold text-[var(--secondary-purple)] transition hover:brightness-110"
        >
          {isLogin ? "Need an account? Register" : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
};
