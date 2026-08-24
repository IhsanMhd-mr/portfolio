"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUp, Mail } from "lucide-react";
import { getPlatformMeta } from "@/lib/social-platforms";

export interface FooterSocialLink {
  id: string;
  platform: string;
  label: string | null;
  url: string;
}

export default function Footer({
  logoText = "Jane Doe",
  contactEmail = "admin@portfolio.com",
  socialLinks = [],
}: {
  logoText?: string;
  contactEmail?: string;
  socialLinks?: FooterSocialLink[];
}) {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 600);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="pm-footer mt-auto border-t border-solid border-[var(--line)] py-12 px-[var(--gutter)] transition-colors duration-300"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <div className="max-w-[var(--w-content)] mx-auto grid gap-8 md:grid-cols-3 mb-12">
        {/* Col 1: Identity */}
        <div>
          <h3
            className="text-lg font-bold text-[var(--accent)] mb-3"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {logoText}
          </h3>
          <p className="text-small text-[var(--ink-soft)] max-w-xs">
            Designing and engineering production-grade software with precision, clean layers, and intent.
          </p>
        </div>

        {/* Col 2: Quick Links */}
        <div>
          <h4 className="text-mono-label mb-4 text-[var(--ink-faint)]">// LINKS</h4>
          <nav className="flex flex-col gap-2">
            <Link href="/" className="text-small text-[var(--ink-soft)] hover:text-[var(--accent)] transition-colors">
              Home
            </Link>
            <Link href="/about" className="text-small text-[var(--ink-soft)] hover:text-[var(--accent)] transition-colors">
              About Me
            </Link>
            <Link href="/projects" className="text-small text-[var(--ink-soft)] hover:text-[var(--accent)] transition-colors">
              Projects Archive
            </Link>
            <Link href="/timeline" className="text-small text-[var(--ink-soft)] hover:text-[var(--accent)] transition-colors">
              Timeline Journey
            </Link>
          </nav>
        </div>

        {/* Col 3: Social Connect — rendered dynamically from the admin-managed
            SocialLink table (see /admin/profile), respecting order + visibility. */}
        <div>
          <h4 className="text-mono-label mb-4 text-[var(--ink-faint)]">// CONNECT</h4>
          <div className="flex flex-wrap gap-4">
            {socialLinks.length > 0 ? (
              socialLinks.map((link) => {
                const meta = getPlatformMeta(link.platform);
                const Icon = meta.icon;
                const displayName = link.platform === "custom" ? link.label || "Custom" : meta.label;
                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target={link.platform === "email" ? undefined : "_blank"}
                    rel={link.platform === "email" ? undefined : "noopener noreferrer"}
                    aria-label={displayName}
                    title={displayName}
                    className="flex items-center gap-2 px-3 py-2 border border-solid border-[var(--line)] rounded-[var(--radius-sm)] text-[var(--ink-soft)] text-sm hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
                  >
                    <Icon size={18} />
                    {displayName}
                  </a>
                );
              })
            ) : (
              <a
                href={`mailto:${contactEmail}`}
                aria-label="Email"
                title="Email"
                className="flex items-center gap-2 px-3 py-2 border border-solid border-[var(--line)] rounded-[var(--radius-sm)] text-[var(--ink-soft)] text-sm hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
              >
                <Mail size={18} />
                Email
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="max-w-[var(--w-content)] mx-auto pt-8 border-t border-solid border-[var(--line)] flex flex-col sm:flex-row justify-between items-center gap-4 text-mono-label text-[var(--ink-faint)]">
        <span>© {currentYear} {logoText.toUpperCase()}</span>
        <span>BUILT WITH NEXT.JS • PRISMA • POSTGRESQL</span>
      </div>


      {/* Back to top button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          aria-label="Scroll to top"
          className="fixed bottom-8 right-8 p-3 rounded-full bg-[var(--accent)] text-[var(--bg)] shadow-lg hover:scale-110 transition-transform z-40 border-none cursor-pointer"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </footer>
  );
}
