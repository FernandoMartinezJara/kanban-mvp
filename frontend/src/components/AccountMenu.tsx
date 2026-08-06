import { useState, type FormEvent } from "react";

type AccountMenuProps = {
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
};

export const AccountMenu = ({ onChangePassword }: AccountMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const close = () => {
    setIsOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setError(null);
    setStatus(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setStatus(null);
    try {
      await onChangePassword(currentPassword, newPassword);
      setStatus("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setError(String(err));
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--primary-blue)] transition hover:brightness-110"
      >
        Change password
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap items-center gap-2">
      <input
        type="password"
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
        placeholder="Current password"
        aria-label="Current password"
        className="w-40 rounded-full border border-[var(--stroke)] bg-white px-3 py-2 text-xs outline-none focus:border-[var(--primary-blue)]"
        required
      />
      <input
        type="password"
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
        placeholder="New password"
        aria-label="New password"
        minLength={4}
        className="w-40 rounded-full border border-[var(--stroke)] bg-white px-3 py-2 text-xs outline-none focus:border-[var(--primary-blue)]"
        required
      />
      <button
        type="submit"
        className="rounded-full bg-[var(--secondary-purple)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
      >
        Update
      </button>
      <button
        type="button"
        onClick={close}
        className="rounded-full border border-[var(--stroke)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
      >
        Cancel
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
      {status && <p className="w-full text-xs text-green-700">{status}</p>}
    </form>
  );
};
