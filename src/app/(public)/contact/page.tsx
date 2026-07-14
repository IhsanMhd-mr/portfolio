import db from "@/lib/database";
import ContactForm from "@/components/public/ContactForm";
import { Mail, MapPin, Clock, MessageSquare } from "lucide-react";
import { Github, Linkedin } from "@/components/public/Icons";

export default async function ContactPage() {
  const profile = await db.siteProfile.findFirst();
  const socialLinks = await db.socialLink.findMany({
    where: { visible: true },
    orderBy: { order: "asc" },
  });

  const contactEmail = profile?.contactEmail || "admin@portfolio.com";
  const locationText = profile?.locationText || "Colombo, Sri Lanka";
  const availabilityStatus = profile?.availabilityStatus || "Open to work";

  return (
    <div
      className="flex-1 w-full px-[var(--gutter)] py-16 transition-colors duration-300"
      style={{
        backgroundColor: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--font-body)",
      }}
    >
      <div className="max-w-[var(--w-content)] mx-auto grid gap-12 md:grid-cols-12">
        {/* Left Column: Context details */}
        <div className="md:col-span-5 space-y-8">
          <div>
            <p className="text-mono-label mb-2 text-[var(--accent)]">// 07 — CONTACT</p>
            <h1 className="text-display mb-4" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 5vw, 56px)" }}>
              Get in Touch
            </h1>
            <p className="text-body text-[var(--ink-soft)] leading-relaxed">
              Have a project in mind, a job opportunity, or just want to say hello? Fill out the form or reach out directly.
            </p>
          </div>

          <div className="space-y-6 text-small text-[var(--ink-soft)]">
            <div className="flex items-center gap-3">
              <div className="p-2 border border-solid border-[var(--line)] rounded-[var(--radius-sm)] text-[var(--accent)] bg-[var(--bg-raised)]">
                <Mail size={16} />
              </div>
              <div>
                <p className="text-[10px] font-mono text-[var(--ink-faint)] uppercase">Email</p>
                <a href={`mailto:${contactEmail}`} className="font-semibold text-[var(--ink)] hover:text-[var(--accent)] transition-colors">
                  {contactEmail}
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 border border-solid border-[var(--line)] rounded-[var(--radius-sm)] text-[var(--accent)] bg-[var(--bg-raised)]">
                <MapPin size={16} />
              </div>
              <div>
                <p className="text-[10px] font-mono text-[var(--ink-faint)] uppercase">Location</p>
                <p className="font-semibold text-[var(--ink)]">{locationText}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 border border-solid border-[var(--line)] rounded-[var(--radius-sm)] text-[var(--accent)] bg-[var(--bg-raised)]">
                <Clock size={16} />
              </div>
              <div>
                <p className="text-[10px] font-mono text-[var(--ink-faint)] uppercase">Status</p>
                <p className="font-semibold text-[var(--ink)]">{availabilityStatus}</p>
              </div>
            </div>
          </div>

          {/* Social connections */}
          {socialLinks.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-mono-label text-[var(--ink-faint)]" style={{ fontSize: "11px" }}>// SOCIAL PROFILES</h4>
              <div className="flex gap-4">
                {socialLinks.map((link) => {
                  const platform = link.platform.toLowerCase();
                  let Icon: any = MessageSquare;
                  if (platform.includes("github")) Icon = Github;
                  else if (platform.includes("linkedin")) Icon = Linkedin;
                  else if (platform.includes("email")) Icon = Mail;

                  return (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 border border-solid border-[var(--line)] rounded-[var(--radius-sm)] text-[var(--ink-soft)] hover:text-[var(--accent)] hover:border-[var(--accent)] bg-[var(--bg-raised)] transition-all"
                      aria-label={link.platform}
                    >
                      <Icon size={18} />
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Form box */}
        <div className="md:col-span-7">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
