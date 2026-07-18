"use client";

import React from "react";
import Link from "next/link";
import {
  PlusCircle,
  Columns3,
  Upload,
  Cpu,
  Milestone,
  Palette,
  Inbox,
  Shield,
} from "lucide-react";

export default function QuickActions() {
  const actions = [
    { label: "Add Project", href: "/admin/projects/new", icon: PlusCircle, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    { label: "Edit Homepage", href: "/admin/page-builder", icon: Columns3, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    { label: "Upload Media", href: "/admin/media?upload=true", icon: Upload, color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
    { label: "Add Technology", href: "/admin/technologies?create=true", icon: Cpu, color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
    { label: "Add Timeline Entry", href: "/admin/timeline?create=true", icon: Milestone, color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    { label: "Change Template", href: "/admin/templates", icon: Palette, color: "bg-pink-500/10 text-pink-600 border-pink-500/20" },
    { label: "View Messages", href: "/admin/messages", icon: Inbox, color: "bg-teal-500/10 text-teal-600 border-teal-500/20" },
    { label: "Open Security", href: "/admin/settings/security", icon: Shield, color: "bg-red-500/10 text-red-600 border-red-500/20" },
  ];

  return (
    <div className="bg-[var(--a-surface)] border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] p-6 space-y-4" style={{ boxShadow: "var(--a-shadow)" }}>
      <h2 className="text-sm font-bold text-[var(--a-ink)] uppercase tracking-wider">
        Quick Actions
      </h2>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {actions.map((act, i) => {
          const Icon = act.icon;
          return (
            <Link
              key={i}
              href={act.href}
              className={`flex flex-col items-center text-center justify-center p-4 border border-solid rounded-[var(--a-r-sm)] transition-all hover:scale-[1.02] hover:shadow-md ${act.color}`}
            >
              <Icon size={20} className="mb-2" />
              <span className="text-[10px] font-bold uppercase tracking-wide leading-tight">
                {act.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
