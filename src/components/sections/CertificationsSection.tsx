import { Award, ExternalLink } from "lucide-react";

interface CertificationsSectionProps {
  certifications: any[];
  settings?: any;
}

export default function CertificationsSection({ certifications }: CertificationsSectionProps) {
  const items = (certifications || []).filter((c) => c.visible);

  // Omit the section entirely when empty — same philosophy as every other
  // section (no dev-facing "no certifications" placeholder on production).
  if (items.length === 0) return null;

  return (
    <section className="w-full py-20 px-[var(--gutter)] bg-[var(--bg)] border-t border-solid border-[var(--line)] transition-colors duration-300">
      <div className="max-w-[var(--w-content)] mx-auto">
        <header className="pm-section-header mb-10">
          <h2 className="text-h2 text-[var(--ink)]" style={{ fontFamily: "var(--font-display)" }}>
            Certifications &amp; Achievements
          </h2>
        </header>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <div
              key={c.id}
              className="pm-card flex flex-col gap-3 p-6 rounded-[var(--radius-md)] border border-solid border-[var(--line)] bg-[var(--bg-raised, var(--bg))]"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex items-center gap-2 text-[var(--accent)]">
                <Award size={18} />
                {c.issueDate && (
                  <span className="text-[10px] font-mono uppercase text-[var(--ink-faint)] ml-auto">
                    {new Date(c.issueDate).getFullYear()}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-body text-[var(--ink)]" style={{ fontFamily: "var(--font-display)" }}>
                {c.title}
              </h3>
              <p className="text-small text-[var(--accent)] font-medium -mt-2">{c.issuer}</p>
              {c.description && (
                <p className="text-small text-[var(--ink-soft)] leading-relaxed">{c.description}</p>
              )}
              {c.credentialUrl && (
                <a
                  href={c.credentialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors mt-auto pt-1"
                >
                  Verify credential
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
