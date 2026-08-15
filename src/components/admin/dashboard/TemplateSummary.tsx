"use client";

import React from "react";
import Link from "next/link";
import { Palette } from "lucide-react";

interface TemplateProps {
  activeTemplate: { name: string; key: string } | null;
  draftTemplate: { name: string; key: string } | null;
}

const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  PROFESSIONAL_MINIMAL: "Paper, ink, one viridian accent. Clean layout designed for recruiters.",
  MODERN_GLASS: "Midnight control room. Neon auroras and glassmorphic panels.",
  INTERACTIVE_3D: "Dark playable void with solar amber and wireframe icosahedrons.",
};

export default function TemplateSummary({
  activeTemplate,
  draftTemplate,
}: TemplateProps) {
  const activeKey = activeTemplate?.key || "MODERN_GLASS";
  const name = activeTemplate?.name || "Modern Glass";
  const desc = TEMPLATE_DESCRIPTIONS[activeKey] || "Standard styling skin";

  return (
    <div className="bg-[var(--a-surface)] border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] p-6 space-y-4" style={{ boxShadow: "var(--a-shadow)" }}>
      <h2 className="text-sm font-bold text-[var(--a-ink)] uppercase tracking-wider flex items-center gap-2">
        <Palette size={16} /> Active Template
      </h2>

      <div className="space-y-3">
        <div>
          <p className="text-lg font-extrabold text-[var(--a-ink)] uppercase">
            {name}
          </p>
          <p className="text-xs text-[var(--a-soft)] mt-1.5 leading-relaxed">
            {desc}
          </p>
        </div>

        {draftTemplate && draftTemplate.key !== activeKey && (
          <div className="text-[10px] bg-[var(--a-warn-bg)] border border-solid border-[var(--a-warn-ink)]/20 rounded p-2.5">
            <span className="font-semibold text-[var(--a-warn-ink)] block">Draft Template Pending:</span>
            <span className="text-[var(--a-soft)] mt-0.5 block">{draftTemplate.name}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2 border-t border-solid border-[var(--a-line)]">
        <Link
          href="/admin/preview"
          className="flex-1 text-center text-xs font-semibold px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-[var(--a-soft)] hover:text-[var(--a-ink)] transition-colors bg-[var(--a-surface)]"
        >
          Preview Template
        </Link>
        <Link
          href="/admin/templates"
          className="flex-1 text-center text-xs font-semibold px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-[var(--a-soft)] hover:text-[var(--a-ink)] transition-colors bg-[var(--a-surface)]"
        >
          Change Template
        </Link>
      </div>
    </div>
  );
}
