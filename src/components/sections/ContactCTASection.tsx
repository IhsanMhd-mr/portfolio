import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import MagneticButton from "@/components/ui/MagneticButton";
import { text } from "@/lib/text";

interface ContactCTASectionProps {
  settings?: any;
  profile?: any;
}

export default function ContactCTASection({ profile }: ContactCTASectionProps) {
  // No invented contact details — see src/lib/text.ts.
  const contactEmail = text(profile?.contactEmail);
  const locationText = text(profile?.locationText);

  return (
    <section className="w-full py-24 px-[var(--gutter)] bg-[var(--bg)] border-t border-solid border-[var(--line)] transition-colors duration-300 relative overflow-hidden">
      {/* Aurora glow accent */}
      <div 
        className="absolute bottom-0 right-1/4 w-[350px] h-[350px] rounded-full blur-[100px] opacity-10 pointer-events-none"
        style={{
          background: "var(--aurora, radial-gradient(circle, var(--accent) 0%, transparent 70%))",
        }}
      />

      <div className="max-w-[var(--w-prose)] mx-auto text-center relative z-10 space-y-6">
        <h2
          className="text-display" 
          style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 5vw, 48px)" }}
        >
          Let&apos;s Build Something Together
        </h2>
        <p className="text-body-lg text-[var(--ink-soft)] max-w-xl mx-auto leading-relaxed">
          I am currently open to full-time opportunities, freelance consulting, and open-source collaborations. Drop me a line or send a request.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6">
          <MagneticButton>
            <Link
              href="/contact"
              className="flex items-center gap-2 px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold rounded-[var(--radius-sm)] transition-all hover:translate-x-1"
              style={{ color: "var(--bg)" }}
            >
              Get in touch
              <ArrowRight size={16} />
            </Link>
          </MagneticButton>

          {contactEmail && (
            <MagneticButton>
              <a
                href={`mailto:${contactEmail}`}
                className="flex items-center gap-2 px-6 py-3 border border-solid border-[var(--line)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--ink)] font-semibold rounded-[var(--radius-sm)] transition-colors"
              >
                <Mail size={16} />
                {contactEmail}
              </a>
            </MagneticButton>
          )}
        </div>

        <p className="text-xs text-[var(--ink-faint)] font-mono pt-4">
          {locationText && `Located in ${locationText} · `}Supporting remote work globally
        </p>
      </div>
    </section>
  );
}
