"use client";

import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PasswordInput from "./PasswordInput";
import AuthError from "./AuthError";

interface LoginFormProps {
  onSuccess?: () => void;
  standalone?: boolean;
}

const DEFAULT_NEXT = "/admin/dashboard";

/**
 * Constrains the post-login destination to a same-origin rooted path.
 *
 * `?next=` is attacker-controllable, and this value is handed to
 * `window.location.assign()` below. Without this guard,
 * `/admin/login?next=https://evil.com` would be a post-authentication open
 * redirect — the worst kind, because the user has just proven they trust this
 * site and will carry that trust to wherever they land. This form is also
 * mounted in AuthDialog, which Navbar opens on `?login=1`, so the hostile URL
 * works on every public page too, not just the admin login route.
 *
 * Returns null for "no usable destination". A rejected hostile value is
 * therefore indistinguishable from an absent one, which is deliberate: an
 * attacker-supplied `next` should produce no navigation at all rather than a
 * consolation redirect.
 *
 * proxy.ts only ever sets `next` to an internal `pathname`, so nothing
 * legitimate is rejected here.
 */
function safeNextTarget(raw: string | null): string | null {
  if (!raw) return null;
  // Must be a rooted path. This rejects absolute URLs ("https://evil.com") and
  // scheme-like values ("javascript:...") outright.
  if (!raw.startsWith("/")) return null;
  // "//evil.com" is protocol-relative, and browsers normalise the backslash
  // forms ("/\evil.com", "/\\evil.com") to the same thing. Both leave the origin.
  if (raw.startsWith("//") || raw.startsWith("/\\")) return null;
  return raw;
}

export default function LoginForm({ onSuccess, standalone = false }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextTarget = safeNextTarget(searchParams.get("next"));

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isRedirectingOAuth, setIsRedirectingOAuth] = useState(false);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [shake, setShake] = useState(false);

  // Surface errors passed back via URL (?error=... from Auth.js, ?reason=... from requireAdmin)
  useEffect(() => {
    const errorParam = searchParams.get("error");
    const reasonParam = searchParams.get("reason");
    if (errorParam) {
      setErrorType(errorParam === "AccessDenied" ? "OAUTH_REFUSED" : errorParam);
    } else if (reasonParam) {
      if (reasonParam.startsWith("session-")) setErrorType("SESSION_EXPIRED");
    }
  }, [searchParams]);

  const validate = () => {
    const errors: { identifier?: string; password?: string } = {};
    if (!identifier.trim()) errors.identifier = "Username or email is required.";
    if (!password) errors.password = "Password is required.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorType(null);

    if (!validate()) {
      triggerShake();
      return;
    }

    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        email: identifier.trim(),
        password,
        redirect: false,
      });

      if (res?.error) {
        const code = (res as any).code as string | undefined;
        if (code === "account_locked") {
          setErrorType("ACCOUNT_LOCKED");
        } else if (code === "rate_limited") {
          setErrorType("RATE_LIMITED");
        } else {
          setErrorType("INVALID_CREDENTIALS");
        }
        triggerShake();
      } else {
        // Where to go depends on WHICH mount this is.
        //
        // standalone === true is the /admin/login page: the user came here to
        // reach the admin, so always leave, defaulting to the dashboard.
        // Otherwise this is AuthDialog, opened over a public page by Navbar on
        // `?login=1`. They asked to sign in, not to be taken somewhere — so we
        // only leave when an explicit, validated `next` says to.
        const destination = standalone ? nextTarget ?? DEFAULT_NEXT : nextTarget;

        if (destination) {
          // NOTE: onSuccess() is deliberately NOT called on this path. In the
          // dialog it is onClose, and closing runs AuthDialog's sync effect,
          // which calls router.replace() to strip `?login=1`. That client-side
          // navigation raced with — and cancelled — the assign() below, leaving
          // the user authenticated but still sitting on the original page.
          // We are leaving anyway, so the dialog goes with the document.
          //
          // A real browser navigation, NOT router.push().
          //
          // /admin/login and every other admin route share
          // src/app/admin/layout.tsx, and that layout branches its whole shell
          // on isLoginPage. The App Router does not re-render shared layouts on
          // client-side navigation (partial rendering swaps only the page slot),
          // so router.push() left the dashboard mounted inside the narrow,
          // sidebar-less login shell until a manual refresh. A full load
          // re-renders the layout with the correct x-pathname.
          //
          // It is also the right thing after authenticating: it discards any
          // client router cache still holding logged-out state.
          window.location.assign(destination);
          // Deliberately stay in the loading state. assign() only *schedules*
          // the navigation, so clearing it here would flash the button back to
          // "Sign in" while the browser is still leaving the page, and briefly
          // invite a second submit.
          return;
        }

        // Staying put: close the dialog (AuthDialog's own effect then strips
        // `?login=1`). The navbar re-reads useSession and flips itself;
        // refresh() is only for the server-rendered tree below it.
        if (onSuccess) onSuccess();
        router.refresh();
      }
    } catch {
      setErrorType("INVALID_CREDENTIALS");
      triggerShake();
    }
    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setIsRedirectingOAuth(true);
    try {
      // OAuth always leaves the page, so "stay put" has to mean "come back
      // here" rather than "don't navigate". From the dialog that is the current
      // path — deliberately without the query string, since `?login=1` would
      // just reopen the dialog on arrival.
      const callbackUrl =
        nextTarget ?? (standalone ? DEFAULT_NEXT : window.location.pathname);
      const start = await fetch("/api/auth/google/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "LOGIN", callbackUrl }),
      });
      if (!start.ok) throw new Error("Unable to start Google sign-in");
      await signIn("google", { callbackUrl });
    } catch {
      setErrorType("OAUTH_REFUSED");
      triggerShake();
      setIsRedirectingOAuth(false);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 120);
  };

  const busy = isLoading || isRedirectingOAuth;

  return (
    <div className={`w-full max-w-[400px] ${shake ? "shake-card" : ""}`}>
      {/* Self-contained Shake Animation Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .shake-card {
          animation: shake 120ms ease-in-out;
        }
      `}} />

      {standalone && (
        <div className="mb-6">
          <button
            onClick={() => router.push("/")}
            className="text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            &larr; Back to Portfolio
          </button>
        </div>
      )}

      <div
        className="w-full bg-[var(--bg-raised)] border border-solid border-[var(--line)] rounded-[var(--radius-md)] p-8"
        style={{
          boxShadow: "0 20px 40px -15px rgba(0,0,0,0.08)",
        }}
      >
        <div className="text-center mb-6">
          <h2
            className="text-h3 text-[var(--ink)] mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Portfolio Admin
          </h2>
          <p className="text-small text-[var(--ink-soft)]">
            Sign in to manage your portfolio
          </p>
        </div>

        {/* Auth Error Banner */}
        <AuthError errorType={errorType} />

        {/* Credentials Form */}
        <form onSubmit={handleCredentialsSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 w-full">
            <label htmlFor="identifier" className="text-xs font-semibold text-[var(--ink-soft)]">
              Username or Email
            </label>
            <input
              id="identifier"
              type="text"
              autoComplete="username"
              disabled={busy}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-3 py-2 border border-solid border-[var(--line)] bg-[var(--bg)] rounded-[var(--radius-sm)] text-small text-[var(--ink)] focus-visible:outline-[var(--accent)]"
              placeholder="username or name@domain.com"
            />
            {fieldErrors.identifier && (
              <span className="text-xs text-[var(--danger,#ef4444)] mt-0.5">{fieldErrors.identifier}</span>
            )}
          </div>

          <PasswordInput
            id="password"
            disabled={busy}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
          />

          <Link
            href="/auth/forgot-password"
            aria-disabled={busy}
            className="self-end text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] disabled:opacity-50"
          >
            Forgot password?
          </Link>

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 bg-[var(--accent)] text-[var(--bg)] font-semibold rounded-[var(--radius-sm)] text-xs mt-2 transition-all hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="relative flex items-center justify-center my-5">
          <div className="absolute inset-0 border-t border-solid border-[var(--line)]"></div>
          <span className="relative px-3 bg-[var(--bg-raised)] text-[10px] font-bold tracking-wider text-[var(--ink-faint)] uppercase">
            or
          </span>
        </div>

        {/* Google sign-in supports linked accounts and secure account completion. */}
        <button
          type="button"
          disabled={busy}
          onClick={handleGoogleSignIn}
          className="flex items-center justify-center gap-3 w-full py-2.5 border border-solid border-[var(--line)] bg-[var(--bg)] rounded-[var(--radius-sm)] text-xs font-semibold text-[var(--ink)] hover:border-[var(--accent)] transition-all disabled:opacity-50"
        >
          {/* Google Logo */}
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.187 4.114-3.466 0-6.277-2.812-6.277-6.277 0-3.466 2.811-6.277 6.277-6.277 1.572 0 3.011.579 4.118 1.543l3.053-3.053C19.1 2.378 15.845 1 12.24 1 5.656 1 .323 6.333.323 12.917c0 6.583 5.333 11.916 11.917 11.916 6.84 0 12.203-4.81 12.203-12.203 0-.693-.082-1.354-.22-1.986H12.24z"/>
          </svg>
          {isRedirectingOAuth ? "Redirecting to Google..." : "Continue with Google"}
        </button>
      </div>
    </div>
  );
}
