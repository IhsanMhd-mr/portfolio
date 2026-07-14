import Link from "next/link";
import { ArrowRight, Briefcase, GraduationCap, Calendar, MapPin } from "lucide-react";

interface EducationExperienceSectionProps {
  education: any[];
  experience: any[];
  isPreview?: boolean;
}

export default function EducationExperienceSection({
  education,
  experience,
  isPreview = false,
}: EducationExperienceSectionProps) {
  
  // Sort experience newest first
  const sortedExp = [...experience].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  // Sort education newest first
  const sortedEdu = [...education].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  if (education.length === 0 && experience.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-20 px-[var(--gutter)] bg-[var(--bg)] border-t border-solid border-[var(--line)] transition-colors duration-300">
      <div className="max-w-[var(--w-content)] mx-auto grid gap-12 md:grid-cols-2">
        {/* Left Column: Experience */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 border border-solid border-[var(--line)] rounded-[var(--radius-sm)] text-[var(--accent)] bg-[var(--bg-raised)]">
              <Briefcase size={20} />
            </div>
            <div>
              <p className="text-mono-label text-[var(--accent)]" style={{ fontSize: "10px" }}>// PROFESSIONAL EXPERIENCE</p>
              <h2 className="text-h3 text-[var(--ink)] font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                Employment History
              </h2>
            </div>
          </div>

          <div className="space-y-8 pl-4 relative before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[1px] before:bg-[var(--line)]">
            {sortedExp.map((exp) => (
              <div key={exp.id} className="relative before:content-[''] before:absolute before:-left-[20px] before:top-2 before:w-2 before:h-2 before:rounded-full before:bg-[var(--accent)]">
                <h3 className="font-semibold text-body text-[var(--ink)]" style={{ fontFamily: "var(--font-display)" }}>
                  {exp.role}
                </h3>
                <p className="text-small text-[var(--accent)] font-medium mt-0.5">
                  {exp.organization}
                </p>
                <div className="flex flex-wrap gap-4 text-xs text-[var(--ink-soft)] mt-1 mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {formatDate(exp.startDate)} - {exp.isCurrent || !exp.endDate ? "Present" : formatDate(exp.endDate)}
                  </span>
                  {exp.locationText && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {exp.locationText}
                    </span>
                  )}
                </div>
                {exp.description && (
                  <p className="text-small text-[var(--ink-soft)] leading-relaxed">
                    {exp.description}
                  </p>
                )}
              </div>
            ))}
            {sortedExp.length === 0 && (
              <p className="text-small text-[var(--ink-faint)]">No employment history seeded.</p>
            )}
          </div>
        </div>

        {/* Right Column: Education */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 border border-solid border-[var(--line)] rounded-[var(--radius-sm)] text-[var(--accent)] bg-[var(--bg-raised)]">
              <GraduationCap size={20} />
            </div>
            <div>
              <p className="text-mono-label text-[var(--accent)]" style={{ fontSize: "10px" }}>// ACADEMIC EDUCATION</p>
              <h2 className="text-h3 text-[var(--ink)] font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                Qualifications
              </h2>
            </div>
          </div>

          <div className="space-y-8 pl-4 relative before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[1px] before:bg-[var(--line)]">
            {sortedEdu.map((edu) => (
              <div key={edu.id} className="relative before:content-[''] before:absolute before:-left-[20px] before:top-2 before:w-2 before:h-2 before:rounded-full before:bg-[var(--accent)]">
                <h3 className="font-semibold text-body text-[var(--ink)]" style={{ fontFamily: "var(--font-display)" }}>
                  {edu.qualification}
                </h3>
                <p className="text-small text-[var(--accent)] font-medium mt-0.5">
                  {edu.institution}
                </p>
                <div className="flex items-center gap-1 text-xs text-[var(--ink-soft)] mt-1 mb-3">
                  <Calendar size={12} />
                  <span>
                    {formatDate(edu.startDate)} - {edu.isCurrent || !edu.endDate ? "Present" : formatDate(edu.endDate)}
                  </span>
                  {edu.grade && (
                    <span className="ml-3 px-2 py-0.5 border border-solid border-[var(--line)] rounded-[var(--radius-xs)] bg-[var(--bg-inset)]">
                      Grade: {edu.grade}
                    </span>
                  )}
                </div>
                {edu.description && (
                  <p className="text-small text-[var(--ink-soft)] leading-relaxed">
                    {edu.description}
                  </p>
                )}
              </div>
            ))}
            {sortedEdu.length === 0 && (
              <p className="text-small text-[var(--ink-faint)]">No education entries seeded.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
