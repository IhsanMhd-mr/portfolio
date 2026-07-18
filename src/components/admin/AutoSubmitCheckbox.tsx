"use client";

/**
 * Checkbox that submits its parent <form action={...}> when toggled.
 * Needed because Server Components cannot pass onChange handlers to inputs.
 */
export default function AutoSubmitCheckbox({
  checked,
  label,
}: {
  checked: boolean;
  label: string;
}) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => e.target.form?.requestSubmit()}
        className="cursor-pointer"
      />
      <span className="text-[10px] font-bold text-[var(--a-soft)] uppercase font-mono">
        {label}
      </span>
    </label>
  );
}
