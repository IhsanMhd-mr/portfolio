import type { Metadata } from "next";
import db from "@/lib/database";
import { PublicContentService } from "@/services/public-content.service";
import Link from "next/link";
import { Calendar, MapPin, Link2 } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const profile = await PublicContentService.getSiteProfile();
  const fullName = profile?.fullName || "Jane Doe";
  const description = `Career and project timeline for ${fullName} — milestones, roles, and journey over time.`;

  return {
    title: `Timeline — ${fullName}`,
    description,
    openGraph: { title: `Timeline — ${fullName}`, description, type: "website" },
  };
}

export default async function TimelinePage() {
  const timelineEntriesRaw = await db.timelineEntry.findMany({
    where: { deletedAt: null },
    include: {
      versions: { where: { state: "PUBLISHED", visible: true } },
      linkedProject: {
        include: {
          versions: { where: { state: "PUBLISHED", visible: true }, take: 1 }
        }
      }
    },
  });

  const timelineEntries = timelineEntriesRaw
    .map((entry) => {
      const published = entry.versions[0];
      const projectTitle = entry.linkedProject?.versions[0]?.title || entry.linkedProject?.slug || "";
      const projectSlug = entry.linkedProject?.slug;

      return {
        ...entry,
        published,
        projectTitle,
        projectSlug,
      };
    })
    .filter((e) => e.published);

  // Sort by manual published order or newest first if order is identical
  timelineEntries.sort((a, b) => {
    const oDiff = (a.published?.order || 0) - (b.published?.order || 0);
    if (oDiff !== 0) return oDiff;
    return new Date(b.published?.startDate || 0).getTime() - new Date(a.published?.startDate || 0).getTime();
  });

  function formatDate(date: Date) {
    return new Date(date).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  return (
    <div
      className="flex-1 w-full px-[var(--gutter)] py-16 transition-colors duration-300 animate-fadeIn"
      style={{
        backgroundColor: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--font-body)",
      }}
    >
      <div className="max-w-[var(--w-prose)] mx-auto">
        <h1
          className="text-h1 mb-10"
          style={{ fontFamily: "var(--font-display)" }}
        >
          My Timeline
        </h1>

        <div className="relative border-l border-solid border-[var(--line)] ml-4 pl-8 space-y-12">
          {timelineEntries.map((entry) => {
            const pub = entry.published!;
            const startDateStr = formatDate(pub.startDate);
            const endDateStr = pub.endDate ? formatDate(pub.endDate) : "Present";
            const dateDisplay = pub.entryType === "MILESTONE" || !pub.endDate ? startDateStr : `${startDateStr} - ${endDateStr}`;

            return (
              <div key={entry.id} className="relative">
                {/* Dot on the line */}
                <span
                  className="absolute -left-[41px] top-1.5 h-4 w-4 rounded-full border-2 border-solid border-[var(--bg)] bg-[var(--accent)]"
                  style={{ boxShadow: "0 0 0 2px var(--line)" }}
                />

                <div className="flex flex-col gap-1">
                  <span className="text-mono-label text-[var(--ink-faint)]">
                    {dateDisplay} • {pub.entryType.replace("_", " ")}
                  </span>
                  <h3
                    className="text-h3 text-[var(--ink)]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {pub.title}
                  </h3>
                  
                  {pub.description && (
                    <p className="text-body text-[var(--ink-soft)] mt-2">
                      {pub.description}
                    </p>
                  )}

                  {entry.projectSlug && (
                    <div className="mt-3 flex">
                      <Link
                        href={`/projects/${entry.projectSlug}`}
                        className="flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)]"
                      >
                        <Link2 size={12} />
                        View related project case study: {entry.projectTitle}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {timelineEntries.length === 0 && (
            <div className="text-[var(--ink-faint)] font-mono py-6">
              No timeline entries yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
