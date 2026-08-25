import Link from "next/link";
import { ArrowRight, BookOpen, Target, Settings, Award } from "lucide-react";
import { text } from "@/lib/text";

interface AboutSummarySectionProps {
  profile: any;
  settings?: any;
  isPreview?: boolean;
}

export default function AboutSummarySection({ profile, settings, isPreview = false }: AboutSummarySectionProps) {
  // No fallback prose: an empty field renders nothing at all. See src/lib/text.ts.
  const aboutBio = text(settings?.aboutBio) || text(profile?.aboutBio);

  // Each meta box is identical apart from its icon, label and value, so they are
  // driven from one list and the empty ones drop out. The grid reflows on its own.
  const metaItems = [
    { icon: BookOpen, label: "Interests", value: text(settings?.technicalInterests) || text(profile?.technicalInterests) },
    { icon: Settings, label: "Approach", value: text(settings?.developmentApproach) || text(profile?.developmentApproach) },
    { icon: Target, label: "Focus", value: text(settings?.currentGoals) || text(profile?.currentGoals) },
    { icon: Award, label: "Availability", value: text(profile?.availabilityStatus) },
  ].filter((item) => item.value);

  // Nothing authored yet — don't render a bare "About Me" heading over emptiness.
  if (!aboutBio && metaItems.length === 0) return null;

  return (
    <section className="pm-about w-full py-20 px-[var(--gutter)] bg-[var(--bg-2, var(--bg))] border-t border-solid border-[var(--line)] transition-colors duration-300">
      <div className="max-w-[var(--w-content)] mx-auto grid md:grid-cols-12 gap-12">
        {/* Left Column: Heading & Core Bio */}
        <div className="pm-about-narrative md:col-span-6 flex flex-col items-start justify-center">
          <h2
            className="text-h2 mb-6 text-[var(--ink)]" 
            style={{ fontFamily: "var(--font-display)" }}
          >
            About Me
          </h2>
          {aboutBio && (
            <p className="text-body-lg text-[var(--ink)] leading-relaxed mb-6">
              {aboutBio}
            </p>
          )}
          <Link
            href="/about" 
            className="flex items-center gap-1 text-small font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            Read full biography
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Right Column: Key Details Grid */}
        <div className="pm-about-meta md:col-span-6 grid gap-6 sm:grid-cols-2">
          {metaItems.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="pm-about-meta-item p-6 rounded-[var(--radius-md)] border border-solid border-[var(--line)] bg-[var(--bg-raised, var(--bg))]"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex items-center gap-3 mb-4 text-[var(--accent)]">
                <Icon size={20} />
                <h3 className="font-semibold text-body" style={{ fontFamily: "var(--font-display)" }}>{label}</h3>
              </div>
              <p className="text-small text-[var(--ink-soft)] leading-relaxed">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
