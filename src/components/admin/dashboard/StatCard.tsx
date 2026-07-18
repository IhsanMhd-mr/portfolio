"use client";

import React from "react";
import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  href: string;
  highlight?: boolean;
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  href,
  highlight = false,
}: StatCardProps) {
  return (
    <Link
      href={href}
      className={`block p-6 border border-solid rounded-[var(--a-r-md)] bg-[var(--a-surface)] transition-all hover:border-[var(--a-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--a-primary)] ${
        highlight
          ? "border-amber-500 bg-amber-500/5 hover:bg-amber-500/10"
          : "border-[var(--a-line)] hover:bg-[var(--a-bg)]"
      }`}
      style={{ boxShadow: "var(--a-shadow)" }}
      aria-label={`${label}: ${value}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--a-soft)] uppercase tracking-wider">
          {label}
        </span>
        <Icon size={18} className={highlight ? "text-amber-500" : "text-[var(--a-faint)]"} aria-hidden="true" />
      </div>
      <p className="mt-4 text-4xl font-extrabold text-[var(--a-ink)] tracking-tight">
        {value}
      </p>
    </Link>
  );
}
