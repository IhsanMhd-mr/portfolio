"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

/**
 * Submit button that reads its own pending state from the enclosing <form>.
 *
 * `useFormStatus()` reports the status of the nearest parent form, so this
 * needs no props wired from the page — drop it inside any
 * `<form action={serverAction}>` and it just works. It must be rendered as a
 * *child* of the form (a component calling useFormStatus cannot be the same
 * component that renders the <form>).
 *
 * Being disabled while pending also fixes double-submits, which were possible
 * on every admin form before this existed.
 */

type Variant = "primary" | "icon";

interface PendingButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type" | "disabled"> {
  variant?: Variant;
  /** Label swapped in while the form is submitting (primary variant only). */
  pendingLabel?: string;
  /** Disable for reasons unrelated to pending state (e.g. first row can't move up). */
  disabled?: boolean;
  children: React.ReactNode;
}

export default function PendingButton({
  variant = "primary",
  pendingLabel,
  disabled,
  children,
  className = "",
  ...rest
}: PendingButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  if (variant === "icon") {
    // Swap the icon for a spinner of the same footprint so rows don't reflow.
    return (
      <button type="submit" disabled={isDisabled} className={className} {...rest}>
        {pending ? <Loader2 size={14} className="animate-spin" /> : children}
      </button>
    );
  }

  return (
    <button type="submit" disabled={isDisabled} className={className} {...rest}>
      {pending ? (
        <>
          <Loader2 size={14} className="animate-spin" />
          {pendingLabel ?? "Working…"}
        </>
      ) : (
        children
      )}
    </button>
  );
}
