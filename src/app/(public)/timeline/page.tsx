import type { Metadata } from "next";
import { PublicContentService } from "@/services/public-content.service";
import Link from "next/link";
import { Calendar, MapPin, Link2 } from "lucide-react";
import { formatMonthYear } from "@/lib/format-date";
import { text } from "@/lib/text";

export async function generateMetadata(): Promise<Metadata> {
  const profile = await PublicContentService.getSiteProfile();
  const fullName = text(profile?.fullName);
  const heading = fullName ? `Timeline — ${fullName}` : "Timeline";
  const description = fullName
    ? `Career and project timeline for ${fullName} — milestones, roles, and journey over time.`
    : "Career and project timeline — milestones, roles, and journey over time.";

  return {
    title: heading,
    description,
    openGraph: { title: heading, description, type: "website" },
  };
}

export default async function TimelinePage() {
  const { entries: timelineEntries } =
    await PublicContentService.getTimelinePageData();

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
            const startDateStr = formatMonthYear(pub.startDate);
            const endDateStr = pub.endDate ? formatMonthYear(pub.endDate) : "Present";
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
