import Link from "next/link";
import { ArrowRight, Calendar, Bookmark } from "lucide-react";

interface ProjectTimelineSectionProps {
  timelineEntries: any[];
  settings?: any;
  isPreview?: boolean;
}

export default function ProjectTimelineSection({ timelineEntries, settings, isPreview = false }: ProjectTimelineSectionProps) {
  // Option to filter by ID list if configured
  const selectedIds = settings?.selectedTimelineIds;
  let items = Array.isArray(selectedIds) && selectedIds.length > 0
    ? timelineEntries.filter(t => selectedIds.includes(t.id))
    : timelineEntries;

  if (items.length === 0) {
    return null;
  }

  // Sort entries chronologically descending (newest first)
  let sorted = [...items].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  // Slice entries based on configuration
  const limitVal = settings?.limit || 3;
  const previewEntries = sorted.slice(0, limitVal);

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  return (
    <section className="w-full py-20 px-[var(--gutter)] bg-[var(--bg-2, var(--bg))] border-t border-solid border-[var(--line)] transition-colors duration-300">
      <div className="max-w-[var(--w-content)] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-12">
          <div>
            <p className="text-mono-label mb-2 text-[var(--accent)]">// 06 — CHRONOLOGY</p>
            <h2 
              className="text-h2 text-[var(--ink)]" 
              style={{ fontFamily: "var(--font-display)" }}
            >
              Timeline Journey
            </h2>
          </div>
          <Link 
            href="/timeline" 
            className="flex items-center gap-1 text-small font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            View full journey
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Timeline graphics */}
        <div className="relative pl-8 md:pl-0 md:grid md:grid-cols-12 md:gap-x-8 before:content-[''] before:absolute before:left-3 md:before:left-1/2 before:top-2 before:bottom-2 before:w-[2px] before:bg-[var(--line)]">
          {previewEntries.map((entry, idx) => {
            const isLeft = idx % 2 === 0;
            const entryType = entry.entryType || "PROJECT";

            return (
              <div 
                key={entry.id} 
                className="relative mb-12 last:mb-0 md:grid md:grid-cols-12 md:col-span-12 items-start"
              >
                {/* Center dot indicator */}
                <div 
                  className="absolute -left-[25px] md:left-1/2 md:-translate-x-1/2 top-1.5 w-4 h-4 rounded-full border-2 border-solid border-[var(--accent)] bg-[var(--bg)] flex items-center justify-center z-10"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                </div>

                {/* Left card (rendered on alternate sides for desktop) */}
                <div className={`md:col-span-5 ${isLeft ? "md:text-right" : "md:order-last md:col-start-8 md:text-left"}`}>
                  <div 
                    className="p-6 rounded-[var(--radius-sm)] border border-solid border-[var(--line)] bg-[var(--bg-raised, var(--bg))] hover:border-[var(--accent)] transition-colors"
                    style={{ boxShadow: "var(--shadow-card)" }}
                  >
                    {/* Header */}
                    <div className={`flex flex-col gap-1 mb-3 ${isLeft ? "md:items-end" : "md:items-start"}`}>
                      <span className="text-[10px] text-[var(--accent)] font-semibold tracking-wider uppercase">
                        {entryType.replace("_", " ")}
                      </span>
                      <h3 className="font-semibold text-body text-[var(--ink)]" style={{ fontFamily: "var(--font-display)" }}>
                        {entry.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-[var(--ink-soft)] mt-1">
                        <Calendar size={12} />
                        <span>
                          {formatDate(entry.startDate)} 
                          {entry.endDate ? ` - ${formatDate(entry.endDate)}` : " - Present"}
                        </span>
                      </div>
                    </div>

                    {/* Desc */}
                    {entry.description && (
                      <p className="text-small text-[var(--ink-soft)] leading-relaxed">
                        {entry.description}
                      </p>
                    )}

                    {/* Associated Project */}
                    {entry.linkedProject && (
                      <div className={`mt-4 pt-4 border-t border-solid border-[var(--line)] flex ${isLeft ? "md:justify-end" : "md:justify-start"}`}>
                        <Link 
                          href={`/projects/${entry.linkedProject.slug}`}
                          className="flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)]"
                        >
                          <Bookmark size={12} />
                          Related Project Case Study
                          <ArrowRight size={12} />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {/* Empty column to occupy space in grid layout */}
                <div className="hidden md:block md:col-span-2" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
