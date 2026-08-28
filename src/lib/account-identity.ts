export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 12 characters and contain at least 3 of: uppercase, lowercase, digits, special characters.";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return PASSWORD_POLICY_MESSAGE;

  const classes = [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((rule) =>
    rule.test(password)
  ).length;
  return classes >= 3 ? null : PASSWORD_POLICY_MESSAGE;
}

export function validatePasswordConfirmation(password: string, confirmation: string): string | null {
  if (password !== confirmation) return "Passwords do not match.";
  return validatePassword(password);
}

export function validateUsername(username: string): string | null {
  if (!/^[A-Za-z0-9_-]{3,32}$/.test(username)) {
    return "Username must be 3-32 characters and use only letters, numbers, underscores, or hyphens.";
  }
  return null;
}

/** Prevents OAuth completion from becoming an open redirect. */
export function safeInternalPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
