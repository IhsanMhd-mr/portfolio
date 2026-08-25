"use client";

import React from "react";
import Link from "next/link";
import { Shield } from "lucide-react";
import { formatDateTime } from "@/lib/format-date";

interface SecurityProps {
  loginMethod: string;
  loginIdentity: string;
  activeSessionCount: number;
  linkedGoogleAccountCount: number;
  lastLoginAt: string | Date | null;
}

export default function SecuritySummary({
  loginMethod,
  loginIdentity,
  activeSessionCount,
  linkedGoogleAccountCount,
  lastLoginAt,
}: SecurityProps) {
  return (
    <div className="bg-[var(--a-surface)] border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] p-6 space-y-4" style={{ boxShadow: "var(--a-shadow)" }}>
      <h2 className="text-sm font-bold text-[var(--a-ink)] uppercase tracking-wider flex items-center gap-2">
        <Shield size={16} /> Security Summary
      </h2>

      <div className="space-y-4 text-xs">
        <div>
          <p className="text-[var(--a-faint)] uppercase font-semibold">Current Login</p>
          <p className="mt-1 font-bold text-[var(--a-ink)]">
            <span className="capitalize">{loginMethod.toLowerCase()}</span> &middot; {loginIdentity}
          </p>
        </div>

        <div className="grid gap-3 grid-cols-2">
          <div className="p-3 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] bg-[var(--a-bg)]">
            <span className="text-[10px] text-[var(--a-soft)] uppercase font-semibold">Active Sessions</span>
            <p className="mt-1 text-lg font-extrabold text-[var(--a-ink)]">{activeSessionCount}</p>
          </div>
          <div className="p-3 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] bg-[var(--a-bg)]">
            <span className="text-[10px] text-[var(--a-soft)] uppercase font-semibold">Linked Google</span>
            <p className="mt-1 text-lg font-extrabold text-[var(--a-ink)]">{linkedGoogleAccountCount}</p>
          </div>
        </div>

        {lastLoginAt && (
          <div>
            <p className="text-[var(--a-faint)] uppercase font-semibold">Last Successful Login</p>
            <p className="mt-1 font-medium text-[var(--a-ink)]" suppressHydrationWarning>
              {formatDateTime(lastLoginAt)}
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2 border-t border-solid border-[var(--a-line)]">
        <Link
          href="/admin/settings/security"
          className="flex-1 text-center text-xs font-semibold px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-[var(--a-soft)] hover:text-[var(--a-ink)] transition-colors bg-[var(--a-surface)]"
        >
          Manage Security
        </Link>
        <Link
          href="/admin/settings/security#sessions"
          className="flex-1 text-center text-xs font-semibold px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-[var(--a-soft)] hover:text-[var(--a-ink)] transition-colors bg-[var(--a-surface)]"
        >
          Active Sessions
        </Link>
      </div>
    </div>
  );
}
