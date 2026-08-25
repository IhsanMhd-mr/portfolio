"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

/**
 * Checkbox that submits its parent <form action={...}> when toggled.
 * Needed because Server Components cannot pass onChange handlers to inputs.
 *
 * While that submit is in flight, `useFormStatus()` (read from the enclosing
 * form) swaps the box for a spinner and blocks further toggling — otherwise
 * the checkbox visibly snaps back to its old value until the server responds,
 * which reads as the click having failed.
 */
export default function AutoSubmitCheckbox({
  checked,
  label,
}: {
  checked: boolean;
  label: string;
}) {
  const { pending } = useFormStatus();

  return (
    <label className={`flex items-center gap-1.5 ${pending ? "cursor-wait" : "cursor-pointer"}`}>
      {pending ? (
        <Loader2 size={13} className="animate-spin text-[var(--a-soft)]" />
      ) : (
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => e.target.form?.requestSubmit()}
          className="cursor-pointer"
        />
      )}
      <span className="text-[10px] font-bold text-[var(--a-soft)] uppercase font-mono">
        {label}
      </span>
    </label>
  );
}
