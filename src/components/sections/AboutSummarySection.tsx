import Link from "next/link";
import { ArrowRight, BookOpen, Target, Settings, Award } from "lucide-react";

interface AboutSummarySectionProps {
  profile: any;
  isPreview?: boolean;
}

export default function AboutSummarySection({ profile, isPreview = false }: AboutSummarySectionProps) {
  const aboutBio = profile?.aboutBio || "I focus on building performant, accessible web systems. I believe in clean layers, rich aesthetics, and robust engineering architectures.";
  const technicalInterests = profile?.technicalInterests || "Web Performance, R3F & WebGL, Microservices, Security & Cryptography";
  const developmentApproach = profile?.developmentApproach || "Plan thoroughly, build cleanly with standard layers, verify with typechecks and tests.";
  const currentGoals = profile?.currentGoals || "Looking for full-time Full-Stack Developer roles starting Fall 2026.";

  return (
    <section className="w-full py-20 px-[var(--gutter)] bg-[var(--bg-2, var(--bg))] border-t border-solid border-[var(--line)] transition-colors duration-300">
      <div className="max-w-[var(--w-content)] mx-auto grid md:grid-cols-12 gap-12">
        {/* Left Column: Heading & Core Bio */}
        <div className="md:col-span-6 flex flex-col items-start justify-center">
          <p className="text-mono-label mb-2 text-[var(--accent)]">// 01 — BIOGRAPHY</p>
          <h2 
            className="text-h2 mb-6 text-[var(--ink)]" 
            style={{ fontFamily: "var(--font-display)" }}
          >
            About Me
          </h2>
          <p className="text-body-lg text-[var(--ink)] leading-relaxed mb-6">
            {aboutBio}
          </p>
          <Link 
            href="/about" 
            className="flex items-center gap-1 text-small font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            Read full biography
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Right Column: Key Details Grid */}
        <div className="md:col-span-6 grid gap-6 sm:grid-cols-2">
          {/* Box 1: Technical Interests */}
          <div 
            className="p-6 rounded-[var(--radius-md)] border border-solid border-[var(--line)] bg-[var(--bg-raised, var(--bg))]"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-center gap-3 mb-4 text-[var(--accent)]">
              <BookOpen size={20} />
              <h3 className="font-semibold text-body" style={{ fontFamily: "var(--font-display)" }}>Interests</h3>
            </div>
            <p className="text-small text-[var(--ink-soft)] leading-relaxed">
              {technicalInterests}
            </p>
          </div>

          {/* Box 2: Development Approach */}
          <div 
            className="p-6 rounded-[var(--radius-md)] border border-solid border-[var(--line)] bg-[var(--bg-raised, var(--bg))]"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-center gap-3 mb-4 text-[var(--accent)]">
              <Settings size={20} />
              <h3 className="font-semibold text-body" style={{ fontFamily: "var(--font-display)" }}>Approach</h3>
            </div>
            <p className="text-small text-[var(--ink-soft)] leading-relaxed">
              {developmentApproach}
            </p>
          </div>

          {/* Box 3: Current Goals */}
          <div 
            className="p-6 rounded-[var(--radius-md)] border border-solid border-[var(--line)] bg-[var(--bg-raised, var(--bg))]"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-center gap-3 mb-4 text-[var(--accent)]">
              <Target size={20} />
              <h3 className="font-semibold text-body" style={{ fontFamily: "var(--font-display)" }}>Focus</h3>
            </div>
            <p className="text-small text-[var(--ink-soft)] leading-relaxed">
              {currentGoals}
            </p>
          </div>

          {/* Box 4: Qualification Status */}
          <div 
            className="p-6 rounded-[var(--radius-md)] border border-solid border-[var(--line)] bg-[var(--bg-raised, var(--bg))]"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-center gap-3 mb-4 text-[var(--accent)]">
              <Award size={20} />
              <h3 className="font-semibold text-body" style={{ fontFamily: "var(--font-display)" }}>Availability</h3>
            </div>
            <p className="text-small text-[var(--ink-soft)] leading-relaxed">
              {profile?.availabilityStatus || "Open to new engineering challenges."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
