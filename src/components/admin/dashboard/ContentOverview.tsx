"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface OverviewProps {
  projects: {
    total: number;
    published: number;
    draft: number;
    hidden: number;
  };
  technologies: number;
  timeline: number;
  education: number;
  experience: number;
  media: number;
}

export default function ContentOverview({
  projects,
  technologies,
  timeline,
  education,
  experience,
  media,
}: OverviewProps) {
  const sections = [
    {
      label: "Projects",
      href: "/admin/projects",
      stats: `${projects.total} total &middot; ${projects.published} published &middot; ${projects.draft} draft &middot; ${projects.hidden} hidden`,
    },
    {
      label: "Technologies",
      href: "/admin/technologies",
      stats: `${technologies} mapped technologies in stack`,
    },
    {
      label: "Timeline",
      href: "/admin/timeline",
      stats: `${timeline} milestones & project events`,
    },
    {
      label: "Education",
      href: "/admin/education",
      stats: `${education} degrees or courses`,
    },
    {
      label: "Experience",
      href: "/admin/experience",
      stats: `${experience} professional experiences`,
    },
    {
      label: "Media Library",
      href: "/admin/media",
      stats: `${media} assets uploaded`,
    },
  ];

  return (
    <div className="bg-[var(--a-surface)] border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] p-6 space-y-4" style={{ boxShadow: "var(--a-shadow)" }}>
      <h2 className="text-sm font-bold text-[var(--a-ink)] uppercase tracking-wider">
        Content Overview
      </h2>

      <div className="divide-y divide-[var(--a-line)]">
        {sections.map((sec, i) => (
          <Link
            key={i}
            href={sec.href}
            className="flex items-center justify-between py-3 group hover:bg-[var(--a-bg)] px-2 -mx-2 rounded transition-colors"
          >
            <div>
              <p className="text-xs font-bold text-[var(--a-ink)] group-hover:text-[var(--a-primary)] transition-colors">
                {sec.label}
              </p>
              <p
                className="text-[10px] text-[var(--a-soft)] mt-0.5"
                dangerouslySetInnerHTML={{ __html: sec.stats }}
              />
            </div>
            <ArrowUpRight size={14} className="text-[var(--a-faint)] group-hover:text-[var(--a-primary)] transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
