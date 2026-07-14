"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUp, Mail } from "lucide-react";

function Github({ size = 24, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function Linkedin({ size = 24, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}


export default function Footer({
  logoText = "Jane Doe",
  contactEmail = "admin@portfolio.com",
}: {
  logoText?: string;
  contactEmail?: string;
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
      className="mt-auto border-t border-solid border-[var(--line)] py-12 px-[var(--gutter)] transition-colors duration-300"
      style={{ backgroundColor: "var(--bg)", fontFamily: "var(--font-body)" }}
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

        {/* Col 3: Social Connect */}
        <div>
          <h4 className="text-mono-label mb-4 text-[var(--ink-faint)]">// CONNECT</h4>
          <div className="flex gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 border border-solid border-[var(--line)] rounded-[var(--radius-sm)] text-[var(--ink-soft)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
            >
              <Github size={18} />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 border border-solid border-[var(--line)] rounded-[var(--radius-sm)] text-[var(--ink-soft)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
            >
              <Linkedin size={18} />
            </a>
            <a
              href={`mailto:${contactEmail}`}
              className="p-2 border border-solid border-[var(--line)] rounded-[var(--radius-sm)] text-[var(--ink-soft)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
            >
              <Mail size={18} />
            </a>
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
          className="fixed bottom-8 right-8 z-[100] p-3 rounded-full bg-[var(--accent)] text-[var(--bg)] hover:bg-[var(--accent-hover)] shadow-lg transition-all duration-200"
          style={{ transform: "scale(1)" }}
          aria-label="Back to top"
        >
          <ArrowUp size={16} />
        </button>
      )}
    </footer>
  );
}
