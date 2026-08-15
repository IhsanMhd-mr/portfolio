"use client";

import React from "react";
import Link from "next/link";
import { Globe, FileEdit, CheckCircle2 } from "lucide-react";

interface PanelProps {
  liveTemplate: string;
  draftTemplate: string;
  pendingChangeCount: number;
  lastDraftSave: string;
  lastPublished: string;
}

export default function WebsiteStatusCard({
  liveTemplate,
  draftTemplate,
  pendingChangeCount,
  lastDraftSave,
  lastPublished,
}: PanelProps) {
  const hasChanges = pendingChangeCount > 0;

  return (
    <div className="bg-[var(--a-surface)] border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] p-6 space-y-6" style={{ boxShadow: "var(--a-shadow)" }}>
      <h2 className="text-sm font-bold text-[var(--a-ink)] uppercase tracking-wider flex items-center gap-2">
        <Globe size={16} /> Website Status
      </h2>

      <div className="grid gap-4 grid-cols-2 text-xs">
        <div>
          <p className="text-[var(--a-faint)] uppercase font-semibold">Live Template</p>
          <p className="mt-1 font-bold text-[var(--a-ink)]">{liveTemplate || "None"}</p>
        </div>
        <div>
          <p className="text-[var(--a-faint)] uppercase font-semibold">Draft Template</p>
          <p className="mt-1 font-bold text-[var(--a-ink)]">{draftTemplate || "None"}</p>
        </div>
      </div>

      <div className="pt-4 border-t border-solid border-[var(--a-line)] space-y-3">
        {hasChanges ? (
          <div className="flex items-start gap-2.5 text-xs text-[var(--a-warn-ink)] bg-[var(--a-warn-bg)] p-3 rounded-[var(--a-r-sm)] border border-dashed border-[var(--a-warn-ink)]/30">
            <FileEdit size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">{pendingChangeCount} Unpublished Changes</p>
              <p className="text-[10px] text-[var(--a-soft)] mt-0.5">Last saved: {lastDraftSave}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 text-xs text-[var(--a-success-ink)] bg-[var(--a-success-bg)] p-3 rounded-[var(--a-r-sm)] border border-solid border-[var(--a-success-ink)]/10">
            <CheckCircle2 size={16} className="shrink-0" />
            <div>
              <p className="font-semibold">Your live portfolio is up to date.</p>
              <p className="text-[10px] text-[var(--a-soft)] mt-0.5">Last published: {lastPublished}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <Link
          href="/admin/preview"
          className="flex-1 text-center text-xs font-semibold px-4 py-2 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-[var(--a-soft)] hover:text-[var(--a-ink)] hover:border-[var(--a-ink)] transition-colors bg-[var(--a-surface)]"
        >
          Preview Draft
        </Link>
        <Link
          href="/admin/publish-confirmation"
          className={`flex-1 text-center text-xs font-semibold px-4 py-2 rounded-[var(--a-r-sm)] transition-colors ${
            hasChanges
              ? "bg-[var(--a-primary)] text-white hover:bg-[var(--a-primary-hover)] cursor-pointer"
              : "bg-[var(--a-line)] text-[var(--a-faint)] pointer-events-none"
          }`}
          aria-disabled={!hasChanges}
        >
          Review and Publish
        </Link>
      </div>
    </div>
  );
}
