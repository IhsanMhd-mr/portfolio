"use client";

import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";

/**
 * Spinner that appears while the enclosing <Link>'s route is loading.
 *
 * `useLinkStatus()` reports the pending state of the nearest parent Link, so
 * this must be rendered as a *child* of that <Link>. It targets the feedback
 * at exactly what the user clicked, which is why this is used instead of a
 * global top-progress bar: the App Router's native pairing is
 * `loading.tsx` + `useLinkStatus`, and it needs no extra dependency.
 *
 * Matters here because every admin sidebar link sets `prefetch={false}`, so
 * navigation genuinely waits on the server and previously showed nothing.
 */
export default function NavPendingIndicator({ className = "" }: { className?: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <Loader2 size={12} className={`animate-spin shrink-0 ${className}`} aria-hidden />;
}
