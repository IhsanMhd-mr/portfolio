"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordForm() {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    });
    const data = await response.json().catch(() => ({}));
    setMessage(data.error || "Password recovery is temporarily unavailable.");
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg)]">
      <div className="w-full max-w-md bg-[var(--bg-raised)] border border-[var(--line)] rounded-[var(--radius-md)] p-7 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ink)]">Forgot password</h1>
          <p className="text-sm text-[var(--ink-soft)] mt-2">Password recovery requires a verified one-time code. Email and SMS delivery are not connected yet.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="recovery-identifier" className="block text-xs font-semibold text-[var(--ink-soft)] mb-1">Username or email</label>
            <input id="recovery-identifier" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required autoComplete="username" className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--line)] rounded-[var(--radius-sm)] text-sm text-[var(--ink)]" />
          </div>
          {message && <p role="status" className="text-sm text-[var(--ink-soft)]">{message}</p>}
          <button type="submit" disabled={loading} className="w-full py-2.5 bg-[var(--accent)] text-[var(--bg)] rounded-[var(--radius-sm)] text-sm font-semibold disabled:opacity-50">{loading ? "Checking…" : "Request OTP"}</button>
        </form>
        <Link href="/admin/login" className="block text-center text-xs text-[var(--accent)]">Return to sign in</Link>
      </div>
    </main>
  );
}
