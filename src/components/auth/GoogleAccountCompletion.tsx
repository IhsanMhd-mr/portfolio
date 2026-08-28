"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { PASSWORD_POLICY_MESSAGE } from "@/lib/account-identity";

type Mode = "NEW_ACCOUNT" | "EXISTING_ACCOUNT";

export default function GoogleAccountCompletion({ mode }: { mode: Mode }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/google/intent")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || data.state !== mode) throw new Error(data.error || "This request is invalid or expired.");
        setEmail(data.email || "");
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "This request is invalid or expired."))
      .finally(() => setLoading(false));
  }, [mode]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (mode === "NEW_ACCOUNT" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    const endpoint = mode === "NEW_ACCOUNT"
      ? "/api/auth/google/complete-account"
      : "/api/auth/google/confirm-link";
    const body = mode === "NEW_ACCOUNT"
      ? { username, password, confirmPassword }
      : { currentPassword: password };
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to complete Google sign-in.");
      await signIn("google", { callbackUrl: data.callbackUrl || "/" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to complete Google sign-in.");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-[var(--bg)]">
      <div className="w-full max-w-md bg-[var(--bg-raised)] border border-[var(--line)] rounded-[var(--radius-md)] p-7 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ink)]">
            {mode === "NEW_ACCOUNT" ? "Complete Account Setup" : "Confirm Account Ownership"}
          </h1>
          <p className="text-sm text-[var(--ink-soft)] mt-2">
            {mode === "NEW_ACCOUNT"
              ? "Create credentials for the same account you will use with Google."
              : "A canonical account already owns this verified email. Confirm its current password before Google is linked."}
          </p>
        </div>

        {loading ? <p className="text-sm text-[var(--ink-soft)]">Checking Google sign-in…</p> : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-soft)] mb-1">Verified Google email</label>
              <input value={email} readOnly className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--line)] rounded-[var(--radius-sm)] text-sm text-[var(--ink-soft)]" />
            </div>
            {mode === "NEW_ACCOUNT" && (
              <div>
                <label htmlFor="username" className="block text-xs font-semibold text-[var(--ink-soft)] mb-1">Username</label>
                <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--line)] rounded-[var(--radius-sm)] text-sm text-[var(--ink)]" />
              </div>
            )}
            <div>
              <label htmlFor="setup-password" className="block text-xs font-semibold text-[var(--ink-soft)] mb-1">
                {mode === "NEW_ACCOUNT" ? "Password" : "Current password"}
              </label>
              <input id="setup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={mode === "NEW_ACCOUNT" ? "new-password" : "current-password"} className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--line)] rounded-[var(--radius-sm)] text-sm text-[var(--ink)]" />
              {mode === "NEW_ACCOUNT" && <p className="text-xs text-[var(--ink-faint)] mt-1">{PASSWORD_POLICY_MESSAGE}</p>}
            </div>
            {mode === "NEW_ACCOUNT" && (
              <div>
                <label htmlFor="confirm-password" className="block text-xs font-semibold text-[var(--ink-soft)] mb-1">Confirm password</label>
                <input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--line)] rounded-[var(--radius-sm)] text-sm text-[var(--ink)]" />
              </div>
            )}
            {mode === "EXISTING_ACCOUNT" && (
              <p className="text-xs text-[var(--ink-faint)]">OTP confirmation is planned but unavailable until email or SMS delivery is integrated.</p>
            )}
            {error && <p role="alert" className="text-sm text-[var(--danger,#ef4444)]">{error}</p>}
            <button type="submit" disabled={submitting || !!error && !email} className="w-full py-2.5 bg-[var(--accent)] text-[var(--bg)] rounded-[var(--radius-sm)] text-sm font-semibold disabled:opacity-50">
              {submitting ? "Finishing…" : mode === "NEW_ACCOUNT" ? "Create Account" : "Link Google Account"}
            </button>
          </form>
        )}
        <Link href="/" className="block text-center text-xs text-[var(--accent)]">Cancel and return home</Link>
      </div>
    </main>
  );
}
