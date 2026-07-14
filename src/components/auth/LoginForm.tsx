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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [shake, setShake] = useState(false);

  // Re-read url parameter for errors (like session expired)
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setErrorType(errorParam);
    }
  }, [searchParams]);

  const validate = () => {
    const errors: { email?: string; password?: string } = {};
    if (!email) {
      errors.email = "Email is required.";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = "Please enter a valid email.";
    }
    if (!password) {
      errors.password = "Password is required.";
    }
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
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        // Map common errors or fallback to default
        if (res.error.includes("AccessDenied")) {
          setErrorType("OAUTH_REFUSED");
        } else if (res.error.includes("ACCOUNT_LOCKED")) {
          setErrorType("ACCOUNT_LOCKED");
        } else {
          setErrorType("INVALID_CREDENTIALS");
        }
        triggerShake();
      } else {
        if (onSuccess) onSuccess();
        router.push(nextTarget);
        router.refresh();
      }
    } catch (err) {
      setErrorType("INVALID_CREDENTIALS");
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "github" | "google") => {
    setIsLoading(true);
    try {
      await signIn(provider, { callbackUrl: nextTarget });
    } catch (err) {
      setErrorType("OAUTH_REFUSED");
      triggerShake();
      setIsLoading(false);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 120);
  };

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
            Welcome back
          </h2>
          <p className="text-small text-[var(--ink-soft)]">
            Sign in to unlock editor mode
          </p>
        </div>

        {/* OAuth Buttons */}
        <div className="flex flex-col gap-2.5 mb-6">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleOAuthSignIn("github")}
            className="flex items-center justify-center gap-3 w-full py-2.5 border border-solid border-[var(--line)] bg-[var(--bg)] rounded-[var(--radius-sm)] text-xs font-semibold text-[var(--ink)] hover:border-[var(--accent)] transition-all disabled:opacity-50"
          >
            {/* GitHub Logo */}
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Continue with GitHub
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleOAuthSignIn("google")}
            className="flex items-center justify-center gap-3 w-full py-2.5 border border-solid border-[var(--line)] bg-[var(--bg)] rounded-[var(--radius-sm)] text-xs font-semibold text-[var(--ink)] hover:border-[var(--accent)] transition-all disabled:opacity-50"
          >
            {/* Google Logo */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.187 4.114-3.466 0-6.277-2.812-6.277-6.277 0-3.466 2.811-6.277 6.277-6.277 1.572 0 3.011.579 4.118 1.543l3.053-3.053C19.1 2.378 15.845 1 12.24 1 5.656 1 .323 6.333.323 12.917c0 6.583 5.333 11.916 11.917 11.916 6.84 0 12.203-4.81 12.203-12.203 0-.693-.082-1.354-.22-1.986H12.24z"/>
            </svg>
            Continue with Google
          </button>
        </div>

        <div className="relative flex items-center justify-center my-5">
          <div className="absolute inset-0 border-t border-solid border-[var(--line)]"></div>
          <span className="relative px-3 bg-[var(--bg-raised)] text-[10px] font-bold tracking-wider text-[var(--ink-faint)] uppercase">
            or
          </span>
        </div>

        {/* Auth Error Banner */}
        <AuthError errorType={errorType} />

        {/* Credentials Form */}
        <form onSubmit={handleCredentialsSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 w-full">
            <label htmlFor="email" className="text-xs font-semibold text-[var(--ink-soft)]">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              disabled={isLoading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-solid border-[var(--line)] bg-[var(--bg)] rounded-[var(--radius-sm)] text-small text-[var(--ink)] focus-visible:outline-[var(--accent)]"
              placeholder="name@domain.com"
            />
            {fieldErrors.email && (
              <span className="text-xs text-[var(--danger, #ef4444)] mt-0.5">{fieldErrors.email}</span>
            )}
          </div>

          <PasswordInput
            id="password"
            disabled={isLoading}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
          />

          <div className="flex items-center justify-between text-xs mt-1">
            <label className="flex items-center gap-2 text-[var(--ink-soft)] cursor-pointer select-none">
              <input
                type="checkbox"
                disabled={isLoading}
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="accent-[var(--accent)] rounded border-[var(--line)]"
              />
              Remember me
            </label>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => router.push("/admin/forgot-password")}
              className="text-[var(--accent)] hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-[var(--accent)] text-[var(--bg)] font-semibold rounded-[var(--radius-sm)] text-xs mt-2 transition-all hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {isLoading ? "Signing in..." : "Log in"}
          </button>
        </form>
      </div>
    </div>
  );
}
