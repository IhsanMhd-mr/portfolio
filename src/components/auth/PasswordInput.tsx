import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function PasswordInput({ label = "Password", error, id, ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || "password-input";

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-[var(--ink-soft)]">
          {label}
        </label>
      )}
      <div className="relative w-full">
        <input
          {...props}
          id={inputId}
          type={showPassword ? "text" : "password"}
          className="w-full px-3 py-2 border border-solid border-[var(--line)] bg-[var(--bg)] rounded-[var(--radius-sm)] text-small text-[var(--ink)] focus-visible:outline-[var(--accent)] pr-10"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          aria-pressed={showPassword}
          aria-label={showPassword ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)] hover:text-[var(--accent)] transition-colors focus-visible:outline-none"
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <span className="text-xs text-[var(--danger,#ef4444)] mt-0.5">{error}</span>}
    </div>
  );
}
