"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangePasswordForm({ googleRecovery = false }: { googleRecovery?: boolean }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLoading) return;
    setError(null);

    if (newPassword.length < 12) {
      setError("New password must be at least 12 characters long.");
      return;
    }
    const classes = [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) =>
      r.test(newPassword)
    ).length;
    if (classes < 3) {
      setError(
        "New password must contain at least 3 of: uppercase, lowercase, digits, special characters."
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (!googleRecovery && newPassword === currentPassword) {
      setError("New password must be different from the current password.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: googleRecovery ? undefined : currentPassword,
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to change password. Please try again.");
        return;
      }
      setSuccess(true);
      router.push("/admin/dashboard");
    } catch {
      setError("Server error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2 border border-solid border-[var(--a-line)] bg-[var(--a-surface)] rounded-[var(--a-r-sm)] text-sm text-[var(--a-ink)] focus-visible:outline-[var(--a-primary)]";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 bg-[var(--a-surface)] border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] p-6"
    >
      {error && (
        <div
          role="alert"
          className="text-sm text-[var(--a-danger)] bg-red-500/10 border border-solid border-red-500/30 rounded-[var(--a-r-sm)] px-3 py-2"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          role="status"
          className="text-sm text-[var(--a-success)] bg-emerald-500/10 border border-solid border-emerald-500/30 rounded-[var(--a-r-sm)] px-3 py-2"
        >
          Password changed. Redirecting to dashboard…
        </div>
      )}

      {googleRecovery ? (
        <p className="text-sm text-[var(--a-soft)]">
          Your linked Google account verified this recovery. Set a new local password below.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="current-password" className="text-xs font-semibold text-[var(--a-soft)]">
            Current password
          </label>
          <input
            id="current-password"
            type={showPasswords ? "text" : "password"}
            autoComplete="current-password"
            required
            disabled={isLoading}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="new-password" className="text-xs font-semibold text-[var(--a-soft)]">
          New password
        </label>
        <input
          id="new-password"
          type={showPasswords ? "text" : "password"}
          autoComplete="new-password"
          required
          disabled={isLoading}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={inputClass}
        />
        <span className="text-xs text-[var(--a-faint)]">
          At least 12 characters, with 3 of: uppercase, lowercase, digits, special characters.
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm-password" className="text-xs font-semibold text-[var(--a-soft)]">
          Confirm new password
        </label>
        <input
          id="confirm-password"
          type={showPasswords ? "text" : "password"}
          autoComplete="new-password"
          required
          disabled={isLoading}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={inputClass}
        />
      </div>

      <label className="flex items-center gap-2 text-xs text-[var(--a-soft)] cursor-pointer select-none">
        <input
          type="checkbox"
          checked={showPasswords}
          onChange={(e) => setShowPasswords(e.target.checked)}
          className="accent-[var(--a-primary)]"
        />
        Show passwords
      </label>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2.5 bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white font-semibold rounded-[var(--a-r-sm)] text-sm transition-colors disabled:opacity-50 border-none cursor-pointer"
      >
        {isLoading
          ? googleRecovery ? "Resetting password…" : "Changing password…"
          : googleRecovery ? "Reset Local Password" : "Change Password"}
      </button>
    </form>
  );
}
