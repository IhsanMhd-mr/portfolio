import Link from "next/link";

export default function Home() {
  return (
    <div
      className="flex flex-col flex-1 items-center justify-center min-h-screen px-6 py-12 transition-colors duration-300"
      style={{ backgroundColor: "var(--bg)", color: "var(--ink)", fontFamily: "var(--font-body)" }}
    >
      <div className="max-w-[720px] w-full text-center">
        {/* Eyebrow comment rail */}
        <p
          className="mb-3 text-mono-label"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink-faint)",
          }}
        >
          //00 — WELCOME
        </p>

        {/* Headline */}
        <h1
          className="mb-6 font-bold tracking-tight text-display"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(36px, 6vw, 64px)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          Developer Portfolio & CMS
        </h1>

        {/* Subtitle description */}
        <p
          className="mb-10 text-body-lg"
          style={{
            fontSize: "18px",
            lineHeight: 1.65,
            color: "var(--ink-soft)",
          }}
        >
          Welcome to your new portfolio platform. Phase 1 (Foundations, Design Tokens,
          Google Fonts, and Database schema) is fully set up.
        </p>

        {/* Phase completion badge */}
        <div className="mb-12 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-line bg-bg-raised text-small">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <span style={{ color: "var(--ink-soft)" }}>Phase 1 (Foundations) Complete</span>
        </div>

        {/* Nav Links Grid */}
        <div className="grid gap-4 sm:grid-cols-2 text-left mb-8">
          <Link
            href="/admin/templates"
            className="p-6 transition-all duration-300 hover:-translate-y-1 block"
            style={{
              backgroundColor: "var(--glass, var(--bg-raised))",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <p
              className="text-mono-label mb-1"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--accent)",
              }}
            >
              // ACTIVE PREVIEW
            </p>
            <h3
              className="font-semibold text-lg mb-1"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Template Switcher →
            </h3>
            <p className="text-small text-ink-soft" style={{ color: "var(--ink-soft)" }}>
              Test colors, typography, buttons, and card styles for all 3 templates.
            </p>
          </Link>

          <Link
            href="/about"
            className="p-6 transition-all duration-300 hover:-translate-y-1 block"
            style={{
              backgroundColor: "var(--glass, var(--bg-raised))",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <p
              className="text-mono-label mb-1"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--ink-faint)",
              }}
            >
              // PUBLIC ROUTE
            </p>
            <h3
              className="font-semibold text-lg mb-1"
              style={{ fontFamily: "var(--font-display)" }}
            >
              About Page →
            </h3>
            <p className="text-small text-ink-soft" style={{ color: "var(--ink-soft)" }}>
              Check out the public developer biography placeholder page.
            </p>
          </Link>

          <Link
            href="/projects"
            className="p-6 transition-all duration-300 hover:-translate-y-1 block"
            style={{
              backgroundColor: "var(--glass, var(--bg-raised))",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <p
              className="text-mono-label mb-1"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--ink-faint)",
              }}
            >
              // PUBLIC ROUTE
            </p>
            <h3
              className="font-semibold text-lg mb-1"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Projects Page →
            </h3>
            <p className="text-small text-ink-soft" style={{ color: "var(--ink-soft)" }}>
              Browse the public project list layout placeholder page.
            </p>
          </Link>

          <Link
            href="/contact"
            className="p-6 transition-all duration-300 hover:-translate-y-1 block"
            style={{
              backgroundColor: "var(--glass, var(--bg-raised))",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <p
              className="text-mono-label mb-1"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--ink-faint)",
              }}
            >
              // PUBLIC ROUTE
            </p>
            <h3
              className="font-semibold text-lg mb-1"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Contact Page →
            </h3>
            <p className="text-small text-ink-soft" style={{ color: "var(--ink-soft)" }}>
              View the dynamic public email & form placeholder page.
            </p>
          </Link>
        </div>

        {/* Footer */}
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "var(--ink-faint)",
          }}
        >
          Built with Next.js • Prisma 7 • PostgreSQL • Tailwind CSS
        </p>
      </div>
    </div>
  );
}
