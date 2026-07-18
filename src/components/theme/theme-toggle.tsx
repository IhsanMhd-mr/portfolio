"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

/**
 * Three-state theme toggle (Light / Dark / System) backed by next-themes.
 * Renders a neutral placeholder until mounted to avoid hydration mismatch.
 */
export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        aria-hidden
        className="flex items-center gap-1 rounded-lg border border-solid border-[var(--a-line,var(--line))] p-1"
      >
        <span className="rounded-md p-2 opacity-0">
          <Sun className="h-4 w-4" />
        </span>
        <span className="rounded-md p-2 opacity-0">
          <Moon className="h-4 w-4" />
        </span>
        <span className="rounded-md p-2 opacity-0">
          <Monitor className="h-4 w-4" />
        </span>
      </div>
    );
  }

  const currentTheme = theme === "system" ? `System (${resolvedTheme})` : theme;

  const options: { value: "light" | "dark" | "system"; label: string; Icon: typeof Sun }[] = [
    { value: "light", label: "Use light theme", Icon: Sun },
    { value: "dark", label: "Use dark theme", Icon: Moon },
    { value: "system", label: "Use system theme", Icon: Monitor },
  ];

  return (
    <div className="flex items-center gap-1 rounded-lg border border-solid border-[var(--a-line,var(--line))] bg-[var(--a-surface,var(--bg-raised))] p-1">
      {options.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-label={label}
            aria-pressed={active}
            title={label}
            className="rounded-md p-2 transition-colors cursor-pointer border-none"
            style={{
              backgroundColor: active ? "var(--a-primary-tint, var(--accent-tint))" : "transparent",
              color: active
                ? "var(--a-primary, var(--accent))"
                : "var(--a-soft, var(--ink-soft))",
            }}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </button>
        );
      })}
      <span className="sr-only">Current theme: {currentTheme}</span>
    </div>
  );
}

export default ThemeToggle;
