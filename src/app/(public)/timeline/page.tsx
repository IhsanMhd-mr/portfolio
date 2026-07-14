import db from "@/lib/database";
import Link from "next/link";
import { Calendar, MapPin, Link2 } from "lucide-react";

export default async function TimelinePage() {
  const timelineEntries = await db.timelineEntry.findMany({
    where: { visible: true, deletedAt: null },
    include: { linkedProject: true },
    orderBy: { startDate: "desc" }, // Newest first
  });

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  return (
    <div
      className="flex-1 w-full px-[var(--gutter)] py-16 transition-colors duration-300"
      style={{
        backgroundColor: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--font-body)",
      }}
    >
      <div className="max-w-[var(--w-prose)] mx-auto">
        <p className="text-mono-label mb-2 text-[var(--accent)]">// TIMELINE JOURNEY</p>
        <h1
          className="text-h1 mb-10"
          style={{ fontFamily: "var(--font-display)" }}
        >
          My Timeline
        </h1>

        <div className="relative border-l border-solid border-[var(--line)] ml-4 pl-8 space-y-12">
          {timelineEntries.map((entry) => {
            const startDateStr = formatDate(entry.startDate.toISOString());
            const endDateStr = entry.endDate ? formatDate(entry.endDate.toISOString()) : "Present";
            const dateDisplay = entry.entryType === "MILESTONE" || !entry.endDate ? startDateStr : `${startDateStr} - ${endDateStr}`;

            return (
              <div key={entry.id} className="relative">
                {/* Dot on the line */}
                <span
                  className="absolute -left-[41px] top-1.5 h-4 w-4 rounded-full border-2 border-solid border-[var(--bg)] bg-[var(--accent)]"
                  style={{ boxShadow: "0 0 0 2px var(--line)" }}
                />

                <div className="flex flex-col gap-1">
                  <span className="text-mono-label text-[var(--ink-faint)]">
                    {dateDisplay} • {entry.entryType.replace("_", " ")}
                  </span>
                  <h3
                    className="text-h3 text-[var(--ink)]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {entry.title}
                  </h3>
                  
                  {entry.description && (
                    <p className="text-body text-[var(--ink-soft)] mt-2">
                      {entry.description}
                    </p>
                  )}

                  {entry.linkedProject && (
                    <div className="mt-3 flex">
                      <Link
                        href={`/projects/${entry.linkedProject.slug}`}
                        className="flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)]"
                      >
                        <Link2 size={12} />
                        View related project case study
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {timelineEntries.length === 0 && (
            <div className="text-[var(--ink-faint)] font-mono py-6">
              // NO TIMELINE ENTRIES SEEDED
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
