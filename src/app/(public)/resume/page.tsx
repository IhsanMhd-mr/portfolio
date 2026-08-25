import type { Metadata } from "next";
import db from "@/lib/database";
import { PublicContentService } from "@/services/public-content.service";
import { ArrowDownToLine, Mail, MapPin, Globe } from "lucide-react";
import { formatMonthYear } from "@/lib/format-date";
import { text } from "@/lib/text";

export async function generateMetadata(): Promise<Metadata> {
  const profile = await PublicContentService.getSiteProfile();
  // Metadata needs a string, but it must never name a fictional person.
  const fullName = text(profile?.fullName);
  const title = text(profile?.title);
  const description =
    [fullName && `Resume and curriculum vitae for ${fullName}`, title?.toLowerCase()]
      .filter(Boolean)
      .join(", ") || undefined;

  return {
    title: fullName ? `Resume — ${fullName}` : "Resume",
    description,
    openGraph: { title: `Resume — ${fullName}`, description, type: "profile" },
  };
}

export default async function ResumePage() {
  const [profile, educationRaw, experienceRaw, technologiesRaw] = await Promise.all([
    PublicContentService.getSiteProfile(),
    db.education.findMany({
      where: { deletedAt: null },
      include: { versions: { where: { state: "PUBLISHED", visible: true } } },
    }),
    db.experience.findMany({
      where: { deletedAt: null },
      include: { versions: { where: { state: "PUBLISHED", visible: true } } },
    }),
    db.technology.findMany({
      where: { deletedAt: null },
      include: { versions: { where: { state: "PUBLISHED", visible: true, showOnResume: true } } },
    }),
  ]);

  // No invented identity or contact details — see src/lib/text.ts.
  const fullName = text(profile?.fullName);
  const title = text(profile?.title);
  const cvUrl = profile?.cvFile?.url || "#";
  const contactEmail = text(profile?.contactEmail);
  const locationText = text(profile?.locationText);

  // The contact strip is a fixed 3-up grid; empty entries drop out so it never
  // shows a bare icon. The third slot was previously the literal, unconditional
  // string "Jane Doe Portfolio".
  const contactItems = [
    { icon: Mail, value: contactEmail },
    { icon: MapPin, value: locationText },
    { icon: Globe, value: fullName ? `${fullName} Portfolio` : null },
  ].filter((item) => item.value);

  // Resolve active versions
  const education = educationRaw
    .map((edu) => ({
      ...edu,
      pub: edu.versions[0],
    }))
    .filter((e) => e.pub);

  education.sort((a, b) => {
    const oDiff = (a.pub?.order || 0) - (b.pub?.order || 0);
    if (oDiff !== 0) return oDiff;
    return new Date(b.pub?.startDate || 0).getTime() - new Date(a.pub?.startDate || 0).getTime();
  });

  const experience = experienceRaw
    .map((exp) => ({
      ...exp,
      pub: exp.versions[0],
    }))
    .filter((e) => e.pub);

  experience.sort((a, b) => {
    const oDiff = (a.pub?.order || 0) - (b.pub?.order || 0);
    if (oDiff !== 0) return oDiff;
    return new Date(b.pub?.startDate || 0).getTime() - new Date(a.pub?.startDate || 0).getTime();
  });

  const technologies = technologiesRaw
    .map((tech) => ({
      ...tech,
      pub: tech.versions[0],
    }))
    .filter((t) => t.pub);

  technologies.sort((a, b) => (a.pub?.order || 0) - (b.pub?.order || 0));

  // Group technologies by category
  const groupedTech: Record<string, string[]> = {
    LANGUAGES: [],
    FRAMEWORKS: [],
    DATABASES: [],
    OTHER: [],
  };

  technologies.forEach((tech) => {
    const pub = tech.pub!;
    if (pub.category === "FRONTEND") {
      groupedTech.FRAMEWORKS.push(pub.name);
    } else if (pub.category === "BACKEND" || pub.category === "DEVOPS") {
      groupedTech.LANGUAGES.push(pub.name);
    } else if (pub.category === "DATABASE") {
      groupedTech.DATABASES.push(pub.name);
    } else {
      groupedTech.OTHER.push(pub.name);
    }
  });

  return (
    <div
      className="flex-1 w-full px-[var(--gutter)] py-12 transition-colors duration-300 animate-fadeIn"
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
            {fullName && (
              <h1
                className="text-h1"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {fullName}
              </h1>
            )}
            {title && (
              <p className="text-body-lg text-[var(--ink-soft)] mt-1">
                {title}
              </p>
            )}
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
        {contactItems.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border border-solid border-[var(--line)] rounded-[var(--radius-sm)] mb-10 text-small text-[var(--ink-soft)]">
            {contactItems.map(({ icon: Icon, value }) => (
              <div key={value} className="flex items-center gap-2">
                <Icon size={14} className="text-[var(--accent)]" />
                <span>{value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-10">
          {/* Work Experience */}
          <section>
            <h2 className="text-h3 border-b border-solid border-[var(--line)] pb-2 mb-6" style={{ fontFamily: "var(--font-display)" }}>
              Experience
            </h2>
            <div className="space-y-6">
              {experience.map((job) => {
                const pub = job.pub!;
                return (
                  <div key={job.id}>
                    <div className="flex justify-between items-baseline mb-2">
                      <h3 className="font-semibold text-body text-[var(--ink)]">
                        {pub.role} <span className="text-[var(--ink-soft)] font-normal">at {pub.organization}</span>
                      </h3>
                      <span className="text-xs text-mono-label text-[var(--ink-faint)]">
                        {formatMonthYear(pub.startDate)} - {pub.isCurrent || !pub.endDate ? "Present" : formatMonthYear(pub.endDate)}
                      </span>
                    </div>
                    {pub.description && (
                      <p className="text-small text-[var(--ink-soft)] leading-relaxed whitespace-pre-wrap">
                        {pub.description}
                      </p>
                    )}
                  </div>
                );
              })}
              {experience.length === 0 && (
                <p className="text-small text-[var(--ink-faint)]">No experience entries yet.</p>
              )}
            </div>
          </section>

          {/* Education */}
          <section>
            <h2 className="text-h3 border-b border-solid border-[var(--line)] pb-2 mb-6" style={{ fontFamily: "var(--font-display)" }}>
              Education
            </h2>
            <div className="space-y-4">
              {education.map((edu) => {
                const pub = edu.pub!;
                return (
                  <div key={edu.id}>
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-semibold text-body text-[var(--ink)]">
                        {pub.qualification}
                      </h3>
                      <span className="text-xs text-mono-label text-[var(--ink-faint)]">
                        {formatMonthYear(pub.startDate)} - {pub.isCurrent || !pub.endDate ? "Present" : formatMonthYear(pub.endDate)}
                      </span>
                    </div>
                    <p className="text-small text-[var(--accent)] font-medium mt-0.5">
                      {pub.institution}
                    </p>
                    {pub.description && (
                      <p className="text-small text-[var(--ink-soft)] mt-1">
                        {pub.description}
                      </p>
                    )}
                  </div>
                );
              })}
              {education.length === 0 && (
                <p className="text-small text-[var(--ink-faint)]">No education entries yet.</p>
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
                    <h4 className="text-xs text-mono-label text-[var(--ink-faint)] mb-2">{cat}</h4>
                    <div className="flex flex-wrap gap-2">
                      {list.map((skill) => (
                        <span key={skill} className="px-2.5 py-1 text-xs border border-solid border-[var(--line)] rounded-[var(--radius-xs)] bg-[var(--bg-raised)] text-[var(--ink)] animate-scaleIn">
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
