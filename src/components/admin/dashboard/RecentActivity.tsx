"use client";

import React from "react";
import Link from "next/link";
import { History, ArrowRight } from "lucide-react";
import { formatDateTime } from "@/lib/format-date";

interface LogEntry {
  id: string;
  action: string;
  entityType: string;
  summary: string | null;
  loginMethod: string | null;
  createdAt: string | Date;
}

interface RecentActivityProps {
  logs: LogEntry[];
}

export default function RecentActivity({ logs }: RecentActivityProps) {
  return (
    <div className="bg-[var(--a-surface)] border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] p-6 space-y-4 flex flex-col justify-between" style={{ boxShadow: "var(--a-shadow)" }}>
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-[var(--a-ink)] uppercase tracking-wider flex items-center gap-2">
          <History size={16} /> Recent Activity
        </h2>

        {logs.length === 0 ? (
          <p className="text-center text-xs text-[var(--a-faint)] font-mono py-8">
            // No recent activity has been recorded.
          </p>
        ) : (
          <div className="space-y-3 font-mono">
            {logs.map((log) => (
              <div
                key={log.id}
                className="text-[11px] leading-relaxed border-b border-solid border-[var(--a-line)] pb-3 last:border-0 last:pb-0"
              >
                <div className="flex items-center justify-between text-[10px] text-[var(--a-faint)] mb-1">
                  <span suppressHydrationWarning>{formatDateTime(log.createdAt)}</span>
                  <span className="font-semibold text-[var(--a-primary)]">
                    {log.action}
                  </span>
                </div>
                <p className="text-[var(--a-ink)] font-sans text-xs">
                  {log.summary || `Performed ${log.action} on ${log.entityType}`}
                </p>
                {log.loginMethod && (
                  <p className="text-[9px] text-[var(--a-faint)] mt-0.5">
                    Session Identity: {log.loginMethod}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-solid border-[var(--a-line)] mt-2">
        <Link
          href="/admin/audit-log"
          className="text-xs font-bold text-[var(--a-primary)] hover:text-[var(--a-primary-hover)] flex items-center justify-center gap-1.5 transition-colors"
        >
          View Full Audit Log <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
