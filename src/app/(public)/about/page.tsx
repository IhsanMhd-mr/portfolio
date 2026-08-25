import type { Metadata } from "next";
import db from "@/lib/database";
import { PublicContentService } from "@/services/public-content.service";
import Link from "next/link";
import { ArrowRight, Briefcase, GraduationCap, MapPin, Mail, Award, BookOpen, Target } from "lucide-react";
import { formatMonthYear } from "@/lib/format-date";
import { text } from "@/lib/text";

export async function generateMetadata(): Promise<Metadata> {
  const profile = await PublicContentService.getSiteProfile();
  // Metadata always needs a string, but it must never name a fictional person.
  // With no profile name, fall back to the page's own label, not a stand-in.
  const fullName = text(profile?.fullName);
  const title = text(profile?.title);
  const heading = fullName ? `About — ${fullName}` : "About";

  // Descriptive SEO copy in the site's own voice is fine here; what we refuse
  // to invent is prose attributed to the owner.
  const description =
    text(profile?.aboutBio) ||
    [fullName && `Learn more about ${fullName}`, title?.toLowerCase()]
      .filter(Boolean)
      .join(", ") ||
    undefined;

  return {
    title: heading,
    description,
    openGraph: { title: heading, description, type: "profile" },
  };
}

export default async function AboutPage() {
  const [profile, educationRaw, experienceRaw] = await Promise.all([
    PublicContentService.getSiteProfile(),
    db.education.findMany({
      where: { deletedAt: null },
      include: { versions: { where: { state: "PUBLISHED", visible: true } } },
    }),
    db.experience.findMany({
      where: { deletedAt: null },
      include: { versions: { where: { state: "PUBLISHED", visible: true } } },
    }),
  ]);

  const fullName = text(profile?.fullName);
  const title = text(profile?.title);
  const identity = [fullName, title].filter(Boolean).join(" · ");
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
          <h1 className="text-display mb-4" style={{ fontFamily: "var(--font-display)" }}>
            About Me
          </h1>
          {identity && (
            <p className="text-body-lg text-[var(--ink-soft)] font-medium">
              {identity}
            </p>
          )}
        </div>

        {/* Biography text */}
        {text(profile?.aboutBio) && (
          <div className="space-y-6 text-body leading-relaxed text-[var(--ink)]">
            <p>{text(profile?.aboutBio)}</p>
          </div>
        )}

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
                      {formatMonthYear(pub.startDate)} - {pub.isCurrent || !pub.endDate ? "Present" : formatMonthYear(pub.endDate)}
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
                      {formatMonthYear(pub.startDate)} - {pub.isCurrent || !pub.endDate ? "Present" : formatMonthYear(pub.endDate)}
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
