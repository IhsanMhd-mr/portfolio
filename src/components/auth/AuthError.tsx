import React from "react";

export interface AuthErrorProps {
  errorType: string | null;
  countdown?: number | null; // For rate-limiting countdown
}

export default function AuthError({ errorType, countdown }: AuthErrorProps) {
  if (!errorType) return null;

  let message = "";

  switch (errorType) {
    case "CredentialsSignin":
    case "INVALID_CREDENTIALS":
      message = "The username/email or password is incorrect.";
      break;
    case "ACCOUNT_LOCKED":
      message = "Your account is temporarily locked. Try again later.";
      break;
    case "RATE_LIMITED":
      const min = countdown ? Math.floor(countdown / 60) : 15;
      const sec = countdown ? countdown % 60 : 0;
      const secStr = sec < 10 ? `0${sec}` : `${sec}`;
      message = `Too many login attempts. Try again in ${min}:${secStr}.`;
      break;
    case "OAUTH_REFUSED":
    case "AccessDenied":
      message = "This account isn't authorized for admin access.";
      break;
    case "SESSION_EXPIRED":
      message = "Your session expired. Please sign in again.";
      break;
    default:
      message = "An unexpected authentication error occurred.";
  }

  // Inset banner, not a nested card — no border, just a tinted background and
  // a left accent bar, so it reads as part of the surrounding card rather than
  // a third stacked box.
  return (
    <div
      className="px-3 py-2.5 mb-4 text-xs font-medium border-l-2 border-solid animate-fade-in"
      style={{
        backgroundColor: "rgba(239, 68, 68, 0.08)",
        borderColor: "var(--danger, #ef4444)",
        color: "var(--danger, #ef4444)",
      }}
      role="alert"
    >
      {message}
    </div>
  );
}
