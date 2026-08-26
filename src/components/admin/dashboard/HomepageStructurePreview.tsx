"use client";

import React from "react";
import Link from "next/link";
import { List } from "lucide-react";

interface HomeSection {
  id: string;
  type: string;
  internalLabel: string;
  visible: boolean;
  order: number;
}

interface StructureProps {
  sections: HomeSection[];
}

export default function HomepageStructurePreview({ sections }: StructureProps) {
  return (
    <div className="bg-[var(--a-surface)] border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] p-6 space-y-4" style={{ boxShadow: "var(--a-shadow)" }}>
      <h2 className="text-sm font-bold text-[var(--a-ink)] uppercase tracking-wider flex items-center gap-2">
        <List size={16} /> Homepage Structure Preview
      </h2>

      {sections.length === 0 ? (
        <p className="text-center text-xs text-[var(--a-faint)] py-6">
          No homepage sections found. Add some in the Page Builder.
        </p>
      ) : (
        <div className="grid gap-2 text-xs">
          {sections.map((sec, i) => (
            <div
              key={sec.id}
              className="flex items-center justify-between p-2.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] bg-[var(--a-bg)]"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[var(--a-faint)]">#{i + 1}</span>
                <span className="font-bold text-[var(--a-ink)]">{sec.internalLabel}</span>
                <span className="text-[10px] text-[var(--a-soft)] font-mono">({sec.type})</span>
              </div>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  sec.visible
                    ? "bg-[var(--a-success-bg)] text-[var(--a-success-ink)]"
                    : "bg-[var(--a-danger-bg)] text-[var(--a-danger-ink)]"
                }`}
              >
                {sec.visible ? "Visible" : "Hidden"}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-solid border-[var(--a-line)]">
        <Link
          href="/admin/page-builder"
          className="flex-1 text-center text-xs font-semibold px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-[var(--a-soft)] hover:text-[var(--a-ink)] transition-colors bg-[var(--a-surface)]"
        >
          Edit Homepage
        </Link>
      </div>
    </div>
  );
}
