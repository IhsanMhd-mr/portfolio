import db from "@/lib/database";
import { ArrowDownToLine, Mail, MapPin, Globe } from "lucide-react";

export default async function ResumePage() {
  const [profile, education, experience, technologies] = await Promise.all([
    db.siteProfile.findFirst({
      include: { cvFile: true },
    }),
    db.education.findMany({
      where: { visible: true, deletedAt: null },
      orderBy: { order: "asc" },
    }),
    db.experience.findMany({
      where: { visible: true, deletedAt: null },
      orderBy: { order: "asc" },
    }),
    db.technology.findMany({
      where: { visible: true, showOnResume: true, deletedAt: null },
      orderBy: { order: "asc" },
    }),
  ]);

  const fullName = profile?.fullName || "Jane Doe";
  const title = profile?.title || "Full-Stack Software Engineer";
  const cvUrl = profile?.cvFile?.url || "#";
  const contactEmail = profile?.contactEmail || "admin@portfolio.com";
  const locationText = profile?.locationText || "Colombo, LK";

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  // Group technologies by category for the skills grid
  const groupedTech: Record<string, string[]> = {
    LANGUAGES: [],
    FRAMEWORKS: [],
    DATABASES: [],
    OTHER: [],
  };

  technologies.forEach((tech) => {
    if (tech.category === "FRONTEND") {
      groupedTech.FRAMEWORKS.push(tech.name);
    } else if (tech.category === "BACKEND" || tech.category === "DEVOPS") {
      groupedTech.LANGUAGES.push(tech.name);
    } else if (tech.category === "DATABASE") {
      groupedTech.DATABASES.push(tech.name);
    } else {
      groupedTech.OTHER.push(tech.name);
    }
  });

  return (
    <div
      className="flex-1 w-full px-[var(--gutter)] py-12 transition-colors duration-300"
      style={{
        backgroundColor: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--font-body)",
      }}
    >
      <div className="max-w-[var(--w-prose)] mx-auto">
        {/* Eyebrow and Download CV header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-mono-label mb-2 text-[var(--accent)]">// CURRICULUM VITAE</p>
            <h1
              className="text-h1"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {fullName}
            </h1>
            <p className="text-body-lg text-[var(--ink-soft)] mt-1">
              {title}
            </p>
          </div>
          <div>
            {cvUrl !== "#" ? (
              <a
                href={cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 text-xs font-semibold px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-[var(--radius-sm)] transition-colors border-none"
                style={{ color: "var(--bg)" }}
              >
                <ArrowDownToLine size={16} />
                Download PDF CV
              </a>
            ) : (
              <button
                disabled
                className="flex items-center justify-center gap-2 text-xs font-semibold px-4 py-2.5 bg-slate-800 text-slate-500 rounded-[var(--radius-sm)] border-none cursor-not-allowed"
              >
                <ArrowDownToLine size={16} />
                CV Not Uploaded
              </button>
            )}
          </div>
        </div>

        {/* Contact info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border border-solid border-[var(--line)] rounded-[var(--radius-sm)] mb-10 text-small text-[var(--ink-soft)]">
          <div className="flex items-center gap-2">
            <Mail size={14} className="text-[var(--accent)]" />
            <span>{contactEmail}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-[var(--accent)]" />
            <span>{locationText}</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-[var(--accent)]" />
            <span>Jane Doe Portfolio</span>
          </div>
        </div>

        <div className="space-y-10">
          {/* Work Experience */}
          <section>
            <h2 className="text-h3 border-b border-solid border-[var(--line)] pb-2 mb-6" style={{ fontFamily: "var(--font-display)" }}>
              Experience
            </h2>
            <div className="space-y-6">
              {experience.map((job) => (
                <div key={job.id}>
                  <div className="flex justify-between items-baseline mb-2">
                    <h3 className="font-semibold text-body text-[var(--ink)]">
                      {job.role} <span className="text-[var(--ink-soft)] font-normal">at {job.organization}</span>
                    </h3>
                    <span className="text-xs text-mono-label text-[var(--ink-faint)]">
                      {formatDate(job.startDate.toISOString())} - {job.isCurrent || !job.endDate ? "Present" : formatDate(job.endDate.toISOString())}
                    </span>
                  </div>
                  {job.description && (
                    <p className="text-small text-[var(--ink-soft)] leading-relaxed">
                      {job.description}
                    </p>
                  )}
                </div>
              ))}
              {experience.length === 0 && (
                <p className="text-small text-[var(--ink-faint)]">// NO EXPERIENCE ENTRIES SEEDED</p>
              )}
            </div>
          </section>

          {/* Education */}
          <section>
            <h2 className="text-h3 border-b border-solid border-[var(--line)] pb-2 mb-6" style={{ fontFamily: "var(--font-display)" }}>
              Education
            </h2>
            <div className="space-y-4">
              {education.map((edu) => (
                <div key={edu.id}>
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-semibold text-body text-[var(--ink)]">
                      {edu.qualification}
                    </h3>
                    <span className="text-xs text-mono-label text-[var(--ink-faint)]">
                      {formatDate(edu.startDate.toISOString())} - {edu.isCurrent || !edu.endDate ? "Present" : formatDate(edu.endDate.toISOString())}
                    </span>
                  </div>
                  <p className="text-small text-[var(--accent)] font-medium mt-0.5">
                    {edu.institution}
                  </p>
                  {edu.description && (
                    <p className="text-small text-[var(--ink-soft)] mt-1">
                      {edu.description}
                    </p>
                  )}
                </div>
              ))}
              {education.length === 0 && (
                <p className="text-small text-[var(--ink-faint)]">// NO EDUCATION ENTRIES SEEDED</p>
              )}
            </div>
          </section>

          {/* Skills Grid */}
          <section>
            <h2 className="text-h3 border-b border-solid border-[var(--line)] pb-2 mb-6" style={{ fontFamily: "var(--font-display)" }}>
              Technical Skills
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              {Object.keys(groupedTech).map((cat) => {
                const list = groupedTech[cat];
                if (list.length === 0) return null;
                return (
                  <div key={cat}>
                    <h4 className="text-xs text-mono-label text-[var(--ink-faint)] mb-2">// {cat}</h4>
                    <div className="flex flex-wrap gap-2">
                      {list.map((skill) => (
                        <span key={skill} className="px-2.5 py-1 text-xs border border-solid border-[var(--line)] rounded-[var(--radius-xs)] bg-[var(--bg-raised)] text-[var(--ink)]">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
