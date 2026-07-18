import db from "@/lib/database";
import Link from "next/link";
import { ArrowRight, Briefcase, GraduationCap, MapPin, Mail, Award, BookOpen, Target } from "lucide-react";

export default async function AboutPage() {
  const [profile, educationRaw, experienceRaw] = await Promise.all([
    db.siteProfile.findFirst({
      include: { cvFile: true },
    }),
    db.education.findMany({
      where: { deletedAt: null },
      include: { versions: { where: { state: "PUBLISHED", visible: true } } },
    }),
    db.experience.findMany({
      where: { deletedAt: null },
      include: { versions: { where: { state: "PUBLISHED", visible: true } } },
    }),
  ]);

  const fullName = profile?.fullName || "Jane Doe";
  const title = profile?.title || "Full-Stack Software Engineer";
  const cvUrl = profile?.cvFile?.url || "/resume";

  const education = educationRaw
    .map((e) => ({
      ...e,
      pub: e.versions[0],
    }))
    .filter((e) => e.pub);

  education.sort((a, b) => {
    const oDiff = (a.pub?.order || 0) - (b.pub?.order || 0);
    if (oDiff !== 0) return oDiff;
    return new Date(b.pub?.startDate || 0).getTime() - new Date(a.pub?.startDate || 0).getTime();
  });

  const experience = experienceRaw
    .map((e) => ({
      ...e,
      pub: e.versions[0],
    }))
    .filter((e) => e.pub);

  experience.sort((a, b) => {
    const oDiff = (a.pub?.order || 0) - (b.pub?.order || 0);
    if (oDiff !== 0) return oDiff;
    return new Date(b.pub?.startDate || 0).getTime() - new Date(a.pub?.startDate || 0).getTime();
  });

  function formatDate(dateVal: Date | string) {
    const d = new Date(dateVal);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
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
      <div className="max-w-[var(--w-prose)] mx-auto space-y-12">
        {/* Header */}
        <div>
          <p className="text-mono-label mb-2 text-[var(--accent)]">// 01 — IDENTITY</p>
          <h1 className="text-display mb-4" style={{ fontFamily: "var(--font-display)" }}>
            About Me
          </h1>
          <p className="text-body-lg text-[var(--ink-soft)] font-medium">
            {fullName} · {title}
          </p>
        </div>

        {/* Biography text */}
        <div className="space-y-6 text-body leading-relaxed text-[var(--ink)]">
          <p>{profile?.aboutBio || "No biography details seeded."}</p>
        </div>

        {/* Details Grid */}
        <div className="grid gap-6 sm:grid-cols-2">
          {profile?.technicalInterests && (
            <div className="p-6 rounded-[var(--radius-sm)] border border-solid border-[var(--line)] bg-[var(--bg-raised)]">
              <div className="flex items-center gap-2 mb-3 text-[var(--accent)] font-semibold">
                <BookOpen size={18} />
                <span>Interests</span>
              </div>
              <p className="text-small text-[var(--ink-soft)] leading-relaxed">{profile.technicalInterests}</p>
            </div>
          )}

          {profile?.developmentApproach && (
            <div className="p-6 rounded-[var(--radius-sm)] border border-solid border-[var(--line)] bg-[var(--bg-raised)]">
              <div className="flex items-center gap-2 mb-3 text-[var(--accent)] font-semibold">
                <Award size={18} />
                <span>Approach</span>
              </div>
              <p className="text-small text-[var(--ink-soft)] leading-relaxed">{profile.developmentApproach}</p>
            </div>
          )}

          {profile?.currentGoals && (
            <div className="p-6 rounded-[var(--radius-sm)] border border-solid border-[var(--line)] bg-[var(--bg-raised)]">
              <div className="flex items-center gap-2 mb-3 text-[var(--accent)] font-semibold">
                <Target size={18} />
                <span>Current Focus</span>
              </div>
              <p className="text-small text-[var(--ink-soft)] leading-relaxed">{profile.currentGoals}</p>
            </div>
          )}

          <div className="p-6 rounded-[var(--radius-sm)] border border-solid border-[var(--line)] bg-[var(--bg-raised)] flex flex-col justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-3 text-[var(--accent)] font-semibold">
                <Mail size={18} />
                <span>Connect</span>
              </div>
              <p className="text-small text-[var(--ink-soft)] leading-relaxed">
                Interested in working together or reviewing credentials?
              </p>
            </div>
            <div className="flex gap-4 mt-4">
              <a 
                href={cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-[var(--accent)] hover:underline"
              >
                Download CV
              </a>
              <Link 
                href="/contact"
                className="text-xs font-bold text-[var(--ink)] hover:text-[var(--accent)] flex items-center gap-1"
              >
                Send Message
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>

        {/* Experience section */}
        <div className="space-y-6">
          <h2 className="text-h3 border-b border-solid border-[var(--line)] pb-2 flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
            <Briefcase size={20} className="text-[var(--accent)]" />
            Experience
          </h2>
          <div className="space-y-6">
            {experience.map((job) => {
              const pub = job.pub!;
              return (
                <div key={job.id}>
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-semibold text-body text-[var(--ink)]">
                      {pub.role} <span className="text-[var(--ink-soft)] font-normal">at {pub.organization}</span>
                    </h3>
                    <span className="text-xs text-mono-label text-[var(--ink-faint)]">
                      {formatDate(pub.startDate)} - {pub.isCurrent || !pub.endDate ? "Present" : formatDate(pub.endDate)}
                    </span>
                  </div>
                  {pub.locationText && (
                    <p className="text-xs text-[var(--ink-soft)] flex items-center gap-1 mb-2">
                      <MapPin size={12} />
                      {pub.locationText}
                    </p>
                  )}
                  {pub.description && (
                    <p className="text-small text-[var(--ink-soft)] leading-relaxed">
                      {pub.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Education section */}
        <div className="space-y-6">
          <h2 className="text-h3 border-b border-solid border-[var(--line)] pb-2 flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
            <GraduationCap size={20} className="text-[var(--accent)]" />
            Education
          </h2>
          <div className="space-y-6">
            {education.map((edu) => {
              const pub = edu.pub!;
              return (
                <div key={edu.id}>
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-semibold text-body text-[var(--ink)]">
                      {pub.qualification}
                    </h3>
                    <span className="text-xs text-mono-label text-[var(--ink-faint)]">
                      {formatDate(pub.startDate)} - {pub.isCurrent || !pub.endDate ? "Present" : formatDate(pub.endDate)}
                    </span>
                  </div>
                  <p className="text-small text-[var(--accent)] font-medium mt-0.5">
                    {pub.institution}
                  </p>
                  {pub.description && (
                    <p className="text-small text-[var(--ink-soft)] leading-relaxed mt-2">
                      {pub.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
