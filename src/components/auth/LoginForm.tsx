"use client";

import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import PasswordInput from "./PasswordInput";
import AuthError from "./AuthError";

interface LoginFormProps {
  onSuccess?: () => void;
  standalone?: boolean;
}

export default function LoginForm({ onSuccess, standalone = false }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextTarget = searchParams.get("next") || "/admin/dashboard";

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
        if (onSuccess) onSuccess();
        router.push(nextTarget);
        router.refresh();
      }
    } catch {
      setErrorType("INVALID_CREDENTIALS");
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsRedirectingOAuth(true);
    try {
      await signIn("google", { callbackUrl: nextTarget });
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

        {/* Google sign-in (only previously linked Google accounts are accepted) */}
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
