"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useBackdropDismiss } from "@/lib/use-backdrop-dismiss";

/**
 * Wraps an "Add new X" form so it is not mounted (and its media pickers,
 * checklists, etc. are not rendered/fetched) until the user actually opens
 * it. The form itself is passed as `children` — it's already-rendered RSC
 * output from the parent Server Component, so server actions on it keep
 * working unchanged; this component only owns the open/closed UI state.
 */
export default function AddItemModal({
  triggerLabel,
  title,
  children,
  dismissOnOutsideClick = false,
}: {
  triggerLabel: string;
  title: string;
  children: React.ReactNode;
  /**
   * Opt-in only. This form holds user input, so an accidental outside release
   * discarding it is worse than requiring an explicit close. Defaults off.
   */
  dismissOnOutsideClick?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const backdrop = useBackdropDismiss(() => setOpen(false));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 w-full py-2 bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white text-xs font-semibold rounded-[var(--a-r-sm)] transition-colors cursor-pointer border-none"
      >
        <Plus size={14} />
        {triggerLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          {...(dismissOnOutsideClick ? backdrop : {})}
        >
          <div
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-[var(--a-surface)] border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] p-6 space-y-6"
            style={{ boxShadow: "var(--a-shadow-lg)" }}
          >
            <div className="flex items-center justify-between border-b border-solid border-[var(--a-line)] pb-3">
              <h3 className="font-bold text-sm text-[var(--a-ink)] flex items-center gap-2">
                <Plus size={16} className="text-[var(--a-primary)]" />
                {title}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 text-[var(--a-soft)] hover:text-[var(--a-ink)] cursor-pointer border-none bg-transparent"
              >
                <X size={16} />
              </button>
            </div>
            {children}
          </div>
        </div>
      )}
    </>
  );
}
