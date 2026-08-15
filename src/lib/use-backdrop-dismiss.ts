"use client";

import { useCallback, useRef } from "react";
import type React from "react";

/**
 * Click-outside-to-dismiss for modal backdrops, based on a *complete* pointer
 * gesture rather than a lone release.
 *
 * Why this exists: the obvious implementations are both wrong in the same way.
 * A `click` event is dispatched on the nearest common ancestor of the mousedown
 * and mouseup targets — so when a modal's content is nested inside its backdrop
 * and the user presses inside the content (e.g. selecting text in an input) then
 * releases outside it, the browser fires `click` on the *backdrop*. That means:
 *
 *   - `onClick={close}` on the backdrop fires, because the event is dispatched
 *     directly on the backdrop and never propagates out of the content — so a
 *     `stopPropagation` guard on the content never runs.
 *   - `if (e.target === backdrop) close()` also passes, for the same reason.
 *
 * The practical symptom is a modal closing mid-typing after a stray drag-out
 * release, discarding whatever the user had entered.
 *
 * A release alone is not evidence that the user clicked the backdrop. This hook
 * dismisses only when the press *and* the release both land on the backdrop
 * element itself, which is the only sequence that actually means "clicked
 * outside the modal".
 *
 * Usage — spread onto the backdrop element (the one with the dimmed overlay):
 *
 *   const backdrop = useBackdropDismiss(onCancel);
 *   <div className="fixed inset-0 ..." {...backdrop}>
 *     <div>…modal content…</div>
 *   </div>
 *
 * The content no longer needs a `stopPropagation` guard.
 *
 * Note: for modals where an accidental dismissal would lose user input (the
 * login dialog), prefer no backdrop dismissal at all — close via an explicit
 * control instead of using this hook.
 */
export function useBackdropDismiss(onDismiss: () => void) {
  // Whether the press that is currently in flight began on the backdrop itself
  // rather than on any modal content inside it.
  const pressBeganOnBackdrop = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    pressBeganOnBackdrop.current = e.target === e.currentTarget;
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      // Both ends of the gesture must be the backdrop. A release here whose
      // press started inside the modal is ignored, and so is a release inside
      // the modal whose press started on the backdrop.
      const isCompleteBackdropClick =
        pressBeganOnBackdrop.current && e.target === e.currentTarget;
      pressBeganOnBackdrop.current = false;
      if (isCompleteBackdropClick) onDismiss();
    },
    [onDismiss]
  );

  // If the browser takes over the gesture (system gesture, focus loss), the
  // press is void — it must not count toward a later release.
  const onPointerCancel = useCallback(() => {
    pressBeganOnBackdrop.current = false;
  }, []);

  return { onPointerDown, onPointerUp, onPointerCancel };
}
