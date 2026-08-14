import Link from "next/link";
import { ArrowDownToLine, ArrowRight } from "lucide-react";
import CursorAura from "@/components/ui/CursorAura";
import MagneticButton from "@/components/ui/MagneticButton";

interface HeroSectionProps {
  profile: any;
  settings?: any;
  isPreview?: boolean;
}

export default function HeroSection({ profile, settings, isPreview = false }: HeroSectionProps) {
  const title = settings?.title || profile?.title || "Full-Stack Software Engineer";
  const fullName = settings?.fullName || profile?.fullName || "Jane Doe";
  const tagline = settings?.tagline || profile?.tagline || "Engineering software as craft with precision and intent.";
  const heroIntro = settings?.heroIntro || profile?.heroIntro || "I specialize in building performant distributed systems, accessible web interfaces, and modern database platforms.";
  const profileImageUrl = profile?.profileImage?.url;
  const cvUrl = profile?.cvFile?.url || "/resume";

  return (
    <section className="pm-hero w-full min-h-[80vh] flex flex-col justify-center items-center py-20 px-[var(--gutter)] relative overflow-hidden bg-[var(--bg)] transition-colors duration-300">
      {/* Decorative Aura background (visible primarily in Modern Glass theme), nudges toward the cursor */}
      <CursorAura
        className="pm-hero-aura absolute top-1/2 left-1/2 w-[500px] h-[500px] rounded-full blur-[120px] opacity-15 pointer-events-none transition-transform duration-700 ease-out"
        style={{
          background: "var(--aurora, radial-gradient(circle, var(--accent) 0%, transparent 70%))",
          zIndex: 1,
          transform: "translate(-50%, -50%)",
        }}
      />

      <div className="max-w-[var(--w-content)] w-full grid md:grid-cols-12 gap-12 items-center relative z-10">
        {/* Left text area */}
        <div className="md:col-span-7 flex flex-col items-start text-left">
          {/* Title / Name */}
          <h1 
            className="text-display mb-6 tracking-tight text-[var(--ink)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            I'm <span className="text-[var(--accent)]">{fullName}</span>, <br />
            {title}
          </h1>

          {/* Subtitle / Tagline */}
          <p className="text-body-lg text-[var(--ink-soft)] font-medium mb-4 max-w-xl">
            {tagline}
          </p>

          {/* Detailed intro */}
          <p className="text-body text-[var(--ink-soft)] mb-8 max-w-lg leading-relaxed">
            {heroIntro}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4">
            <MagneticButton>
              <Link
                href="/projects"
                className="flex items-center gap-2 px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-[var(--radius-sm)] font-semibold transition-all hover:translate-x-1"
                style={{ color: "var(--bg)" }}
              >
                View Projects
                <ArrowRight size={16} />
              </Link>
            </MagneticButton>
            <MagneticButton>
              <a
                href={cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 border border-solid border-[var(--line)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--ink)] rounded-[var(--radius-sm)] font-semibold transition-all"
              >
                <ArrowDownToLine size={16} />
                Download CV
              </a>
            </MagneticButton>
          </div>
        </div>

        {/* Right profile image showcase */}
        <div className="md:col-span-5 flex justify-center items-center">
          <div 
            className="relative w-72 h-72 md:w-80 md:h-80 rounded-[var(--radius-md)] overflow-hidden shadow-[var(--shadow-card)] transition-transform duration-300 hover:scale-[1.02]"
            style={{
              backgroundColor: "var(--glass, var(--bg-raised))",
              border: "1px solid var(--line)"
            }}
          >
            {profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={profileImageUrl} 
                alt={fullName} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col justify-center items-center text-[var(--ink-faint)] p-6 text-center">
                <span className="text-6xl font-bold font-display opacity-20 mb-4">{profile?.logoText || "JD"}</span>
                <p className="text-small">Upload profile image in Media / Settings</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
