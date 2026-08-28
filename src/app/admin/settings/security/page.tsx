"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { Shield, Key, Link2, Link2Off, Monitor, Clock, LogOut, RefreshCw } from "lucide-react";
import { formatDateTime } from "@/lib/format-date";

interface LinkedAccount {
  id: string;
  email: string | null;
  providerAccountId: string;
}

interface TrackedSession {
  id: string;
  sid: string;
  loginMethod: string;
  loginIdentity: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt: string | null;
  revokeReason: string | null;
  isCurrent: boolean;
}

export default function SecuritySettingsPage() {
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [sessions, setSessions] = useState<TrackedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwStatus, setPwStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  async function load() {
    setLoading(true);
    const [accRes, sesRes] = await Promise.all([
      fetch("/api/auth/link-google"),
      fetch("/api/auth/sessions"),
    ]);
    if (accRes.ok) setAccounts(await accRes.json());
    if (sesRes.ok) setSessions(await sesRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwStatus(null);
    if (newPw !== confirmPw) {
      setPwStatus({ type: "error", msg: "New passwords do not match." });
      return;
    }
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: googleRecovery ? undefined : currentPw,
        newPassword: newPw,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setPwStatus({
        type: "success",
        msg: googleRecovery
          ? "Local password reset. Other sessions have been revoked."
          : "Password changed. Other sessions have been revoked.",
      });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      load();
    } else {
      setPwStatus({ type: "error", msg: data.error ?? "Failed to change password." });
    }
  }

  async function revokeSession(sid: string) {
    setRevoking(sid);
    const res = await fetch("/api/auth/sessions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sid }),
    });
    setRevoking(null);
    if (res.ok) load();
  }

  async function linkGoogle() {
    setLinking(true);
    try {
      // Proper CSRF-protected sign-in flow (matches LoginForm.tsx). The current
      // admin session cookie survives this whole redirect round trip, which is
      // what lets auth.ts's signIn callback recognize this as a link attempt —
      // a plain <a href="/api/auth/signin/google"> link does not go through the
      // required CSRF POST and never actually reaches Google.
      await signIn("google", { callbackUrl: "/admin/settings/security" });
    } catch {
      setLinking(false);
    }
  }

  async function unlinkGoogle(accountId: string) {
    if (!confirm("Are you sure you want to unlink this Google account?")) return;
    setUnlinking(accountId);
    const res = await fetch("/api/auth/unlink-google", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });
    setUnlinking(null);
    if (res.ok) load();
    else {
      const data = await res.json();
      alert(data.error ?? "Failed to unlink account.");
    }
  }

  const activeSessions = sessions.filter((s) => !s.revokedAt && new Date(s.expiresAt) > new Date());
  const revokedSessions = sessions.filter((s) => s.revokedAt);
  const googleRecovery = sessions.some((s) => s.isCurrent && s.loginMethod === "GOOGLE");

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--a-ink)] flex items-center gap-2">
          <Shield size={22} /> Security Settings
        </h1>
        <p className="text-sm text-[var(--a-soft)] mt-1">
          Manage login methods, active sessions, and your password.
        </p>
      </div>

      {/* ── Change Password ─────────────────────────────────────── */}
      <section className="bg-[var(--a-surface)] border border-[var(--a-line)] rounded-[var(--a-r-md)] p-6 space-y-4">
        <h2 className="font-semibold text-[var(--a-ink)] flex items-center gap-2"><Key size={16} /> Local Password</h2>
        {googleRecovery && (
          <p className="text-sm text-[var(--a-soft)]">
            Signed in with Google. You can reset the local password without the current password.
          </p>
        )}
        <form onSubmit={changePassword} className="space-y-3">
          <div className={`grid gap-3 ${googleRecovery ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
            {!googleRecovery && (
              <div>
                <label className="block text-xs font-medium text-[var(--a-soft)] mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  required
                  className="w-full text-sm px-3 py-2 bg-[var(--a-bg)] border border-[var(--a-line)] rounded-[var(--a-r-sm)] text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-[var(--a-soft)] mb-1">New Password</label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                minLength={12}
                className="w-full text-sm px-3 py-2 bg-[var(--a-bg)] border border-[var(--a-line)] rounded-[var(--a-r-sm)] text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--a-soft)] mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
                className="w-full text-sm px-3 py-2 bg-[var(--a-bg)] border border-[var(--a-line)] rounded-[var(--a-r-sm)] text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
              />
            </div>
          </div>
          {pwStatus && (
            <p className={`text-sm ${pwStatus.type === "success" ? "text-[var(--a-success-ink)]" : "text-[var(--a-danger-ink)]"}`}>
              {pwStatus.msg}
            </p>
          )}
          <button
            type="submit"
            className="text-sm font-semibold px-4 py-2 bg-[var(--a-primary)] text-white rounded-[var(--a-r-sm)] hover:bg-[var(--a-primary-hover)] transition-colors border-none cursor-pointer"
          >
            {googleRecovery ? "Reset Local Password" : "Change Password"}
          </button>
        </form>
      </section>

      {/* ── Linked Google Accounts ──────────────────────────────── */}
      <section className="bg-[var(--a-surface)] border border-[var(--a-line)] rounded-[var(--a-r-md)] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[var(--a-ink)] flex items-center gap-2"><Link2 size={16} /> Linked Google Accounts</h2>
          <button
            onClick={linkGoogle}
            disabled={linking}
            className="text-xs font-semibold px-3 py-1.5 border border-[var(--a-line)] rounded-[var(--a-r-sm)] text-[var(--a-soft)] hover:text-[var(--a-ink)] hover:border-[var(--a-ink)] transition-colors disabled:opacity-50 bg-transparent cursor-pointer"
          >
            {linking ? "Redirecting…" : "+ Link Google Account"}
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-[var(--a-faint)]">Loading…</p>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-[var(--a-faint)]">No Google accounts linked yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--a-line)]">
            {accounts.map((acc) => (
              <li key={acc.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-[var(--a-ink)]">{acc.email ?? acc.providerAccountId}</p>
                  <p className="text-xs text-[var(--a-faint)]">ID: {acc.providerAccountId}</p>
                </div>
                <button
                  onClick={() => unlinkGoogle(acc.id)}
                  disabled={unlinking === acc.id}
                  className="flex items-center gap-1 text-xs text-[var(--a-danger-ink)] hover:text-[var(--a-danger-ink)] font-medium transition-colors disabled:opacity-50 bg-transparent border-none cursor-pointer"
                >
                  <Link2Off size={13} />
                  {unlinking === acc.id ? "Unlinking…" : "Unlink"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Active Sessions ─────────────────────────────────────── */}
      <section className="bg-[var(--a-surface)] border border-[var(--a-line)] rounded-[var(--a-r-md)] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[var(--a-ink)] flex items-center gap-2"><Monitor size={16} /> Active Sessions</h2>
          <button onClick={load} className="text-xs text-[var(--a-soft)] flex items-center gap-1 hover:text-[var(--a-ink)] bg-transparent border-none cursor-pointer">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-[var(--a-faint)]">Loading…</p>
        ) : activeSessions.length === 0 ? (
          <p className="text-sm text-[var(--a-faint)]">No active sessions.</p>
        ) : (
          <ul className="divide-y divide-[var(--a-line)]">
            {activeSessions.map((s) => (
              <li key={s.sid} className="py-3 flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--a-ink)]">
                      {s.loginMethod === "LOCAL" ? "Credentials" : "Google"} — by {s.loginIdentity}
                    </span>
                    {s.isCurrent && (
                      <span className="text-xs px-1.5 py-0.5 bg-[var(--a-success-bg)] text-[var(--a-success-ink)] rounded font-medium">Current</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--a-soft)]">IP: {s.ipAddress ?? "unknown"}</p>
                  <p className="text-xs text-[var(--a-faint)] flex items-center gap-1">
                    <Clock size={11} /> Last seen {formatDateTime(s.lastSeenAt)}
                  </p>
                </div>
                {!s.isCurrent && (
                  <button
                    onClick={() => revokeSession(s.sid)}
                    disabled={revoking === s.sid}
                    className="flex items-center gap-1 text-xs text-[var(--a-danger-ink)] hover:text-[var(--a-danger-ink)] font-medium transition-colors disabled:opacity-50 shrink-0 bg-transparent border-none cursor-pointer"
                  >
                    <LogOut size={13} />
                    {revoking === s.sid ? "Revoking…" : "Revoke"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Revoked Session History */}
        {revokedSessions.length > 0 && (
          <details className="mt-2">
            <summary className="text-xs text-[var(--a-faint)] cursor-pointer hover:text-[var(--a-soft)]">
              Show {revokedSessions.length} revoked session{revokedSessions.length !== 1 ? "s" : ""}
            </summary>
            <ul className="mt-2 divide-y divide-[var(--a-line)] opacity-60">
              {revokedSessions.map((s) => (
                <li key={s.sid} className="py-2 space-y-0.5">
                  <p className="text-xs text-[var(--a-ink)]">
                    {s.loginMethod === "LOCAL" ? "Credentials" : "Google"} — by {s.loginIdentity} — {s.ipAddress ?? "unknown"} — Revoked: {formatDateTime(s.revokedAt!)}
                    {s.revokeReason ? ` (${s.revokeReason})` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </div>
  );
}
