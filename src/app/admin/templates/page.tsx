"use client";

import { useState } from "react";

type TemplateId = "minimal" | "glass" | "threed";

const templates: {
  id: TemplateId;
  name: string;
  description: string;
  accent: string;
}[] = [
  {
    id: "minimal",
    name: "Professional Minimal",
    description:
      "Paper, ink, one viridian accent. Clean grid, subtle shadows, strong readability. Best for job applications and academic review.",
    accent: "#0E6B5A",
  },
  {
    id: "glass",
    name: "Modern Glass",
    description:
      "Dark navy, glassmorphism cards, soft gradients, cyan→violet energy. Modern technical appearance. Default template.",
    accent: "#22D3EE",
  },
  {
    id: "threed",
    name: "Interactive 3D",
    description:
      "Near-black void, solar amber accent, 3D hero, magnetic cursor. Stronger visual emphasis for demonstrating animation skills.",
    accent: "#FFB454",
  },
];

import { useEffect } from "react";

export default function AdminTemplatesPage() {
  const [activeTemplate, setActiveTemplate] = useState<TemplateId>("glass");

  useEffect(() => {
    async function loadActiveTemplate() {
      try {
        const res = await fetch("/api/publish");
        if (res.ok) {
          const data = await res.json();
          const keyMap: Record<string, TemplateId> = {
            PROFESSIONAL_MINIMAL: "minimal",
            MODERN_GLASS: "glass",
            INTERACTIVE_3D: "threed",
          };
          const mappedId = keyMap[data.draftTemplateKey];
          if (mappedId) {
            setActiveTemplate(mappedId);
            document.documentElement.setAttribute("data-template", mappedId);
          }
        }
      } catch (err) {
        console.error("Failed to load active template:", err);
      }
    }
    loadActiveTemplate();
  }, []);

  async function switchTemplate(id: TemplateId) {
    try {
      setActiveTemplate(id);
      document.documentElement.setAttribute("data-template", id);

      // Fetch all templates to get the matching database ID
      const templatesRes = await fetch("/api/templates");
      if (templatesRes.ok) {
        const templatesList = await templatesRes.json();
        const keyMap: Record<TemplateId, string> = {
          minimal: "PROFESSIONAL_MINIMAL",
          glass: "MODERN_GLASS",
          threed: "INTERACTIVE_3D",
        };
        const dbKey = keyMap[id];
        const matched = templatesList.find((t: any) => t.key === dbKey);
        if (matched) {
          await fetch("/api/templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ templateId: matched.id }),
          });
        }
      }
    } catch (err) {
      console.error("Failed to switch template:", err);
    }
  }


  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)", color: "var(--ink)" }}>
      <div
        className="mx-auto max-w-[1200px] px-6 py-12"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {/* Header */}
        <p
          className="text-mono-label mb-2"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink-faint)",
          }}
        >
          // ADMIN — TEMPLATE SELECTOR
        </p>
        <h1
          className="mb-2"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(36px, 5vw, 56px)",
            lineHeight: 1.08,
            letterSpacing: "-0.02em",
            fontWeight: 700,
          }}
        >
          Templates
        </h1>
        <p
          className="mb-10"
          style={{
            fontSize: "18px",
            lineHeight: 1.65,
            color: "var(--ink-soft)",
            maxWidth: "720px",
          }}
        >
          Select a visual template for the public portfolio. All three use the
          same content and section order — only colors, fonts, and motion change.
        </p>

        {/* Template cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-16">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => switchTemplate(t.id)}
              className="text-left transition-all duration-300"
              style={{
                backgroundColor: "var(--bg-raised, var(--bg))",
                border:
                  activeTemplate === t.id
                    ? `2px solid var(--accent)`
                    : `1px solid var(--line)`,
                borderRadius: "var(--r-md)",
                padding: "24px",
                boxShadow:
                  activeTemplate === t.id
                    ? "var(--shadow-card-hover, 0 8px 24px rgba(0,0,0,0.12))"
                    : "var(--shadow-card, 0 1px 2px rgba(0,0,0,0.04))",
                transform:
                  activeTemplate === t.id ? "translateY(-2px)" : "none",
              }}
            >
              {/* Accent swatch */}
              <div
                className="mb-4 h-2 w-12"
                style={{
                  backgroundColor: t.accent,
                  borderRadius: "var(--r-full)",
                }}
              />
              <h3
                className="mb-1"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "24px",
                  lineHeight: 1.25,
                  fontWeight: 600,
                }}
              >
                {t.name}
              </h3>
              <p
                className="mb-4"
                style={{
                  fontSize: "14px",
                  lineHeight: 1.5,
                  color: "var(--ink-soft)",
                }}
              >
                {t.description}
              </p>
              {activeTemplate === t.id ? (
                <span
                  className="inline-block px-3 py-1 text-xs font-semibold"
                  style={{
                    backgroundColor: "var(--accent-tint)",
                    color: "var(--accent)",
                    borderRadius: "var(--r-full)",
                  }}
                >
                  ● Active
                </span>
              ) : (
                <span
                  className="inline-block px-3 py-1 text-xs"
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-full)",
                    color: "var(--ink-faint)",
                  }}
                >
                  Select
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Live Preview Section */}
        <h2
          className="mb-6"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(28px, 3.5vw, 40px)",
            lineHeight: 1.15,
            fontWeight: 600,
          }}
        >
          Live Token Preview
        </h2>

        {/* Color swatches */}
        <div className="mb-8">
          <p
            className="mb-3"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink-faint)",
            }}
          >
            // COLORS
          </p>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "--bg", css: "var(--bg)" },
              { label: "--bg-raised", css: "var(--bg-raised, var(--bg))" },
              { label: "--ink", css: "var(--ink)" },
              { label: "--line", css: "var(--line)" },
              { label: "--accent", css: "var(--accent)" },
              { label: "--accent-tint", css: "var(--accent-tint)" },
              { label: "--success", css: "var(--success)" },
              { label: "--warn", css: "var(--warn)" },
              { label: "--danger", css: "var(--danger)" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1">
                <div
                  className="h-10 w-10"
                  style={{
                    backgroundColor: s.css,
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-sm)",
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    color: "var(--ink-faint)",
                  }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Typography samples */}
        <div className="mb-8">
          <p
            className="mb-3"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink-faint)",
            }}
          >
            // TYPOGRAPHY
          </p>
          <div
            className="p-6"
            style={{
              backgroundColor: "var(--bg-raised, var(--bg))",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(36px, 5vw, 56px)",
                lineHeight: 1.08,
                letterSpacing: "-0.02em",
                fontWeight: 700,
                marginBottom: "12px",
              }}
            >
              Display Heading
            </p>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "24px",
                lineHeight: 1.25,
                fontWeight: 600,
                marginBottom: "8px",
              }}
            >
              Section Title (H3)
            </p>
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "16px",
                lineHeight: 1.65,
                color: "var(--ink-soft)",
                marginBottom: "8px",
              }}
            >
              Body text using the template&apos;s body font. This demonstrates the
              default reading experience that visitors will see across the portfolio.
            </p>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
                lineHeight: 1.4,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink-faint)",
              }}
            >
              //01 — MONO RAIL EYEBROW LABEL
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="mb-8">
          <p
            className="mb-3"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink-faint)",
            }}
          >
            // BUTTONS
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              className="transition-all duration-200"
              style={{
                backgroundColor: "var(--accent)",
                color: activeTemplate === "minimal" ? "#FFFFFF" : activeTemplate === "threed" ? "#160B02" : "#07101F",
                borderRadius: "var(--r-sm)",
                height: activeTemplate === "threed" ? "48px" : activeTemplate === "glass" ? "46px" : "44px",
                padding: "0 20px",
                fontFamily: activeTemplate === "threed" ? "var(--font-mono)" : "var(--font-body)",
                fontWeight: activeTemplate === "threed" ? 700 : 600,
                fontSize: "14px",
                textTransform: activeTemplate === "threed" ? "uppercase" : "none",
                letterSpacing: activeTemplate === "threed" ? "0.08em" : "normal",
                border: "none",
                cursor: "pointer",
              }}
            >
              Primary Action
            </button>
            <button
              className="transition-all duration-200"
              style={{
                backgroundColor: "transparent",
                color: "var(--ink)",
                borderRadius: "var(--r-sm)",
                height: "44px",
                padding: "0 20px",
                fontFamily: "var(--font-body)",
                fontWeight: 500,
                fontSize: "14px",
                border: "1.5px solid var(--line)",
                cursor: "pointer",
              }}
            >
              Secondary Action
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="mb-8">
          <p
            className="mb-3"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink-faint)",
            }}
          >
            // CARD SURFACE
          </p>
          <div
            className="max-w-sm p-6 transition-all duration-300"
            style={{
              backgroundColor:
                activeTemplate === "glass"
                  ? "rgba(255,255,255,0.055)"
                  : "var(--bg-raised, var(--bg))",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              boxShadow: "var(--shadow-card)",
              backdropFilter:
                activeTemplate === "glass"
                  ? "blur(18px) saturate(140%)"
                  : "none",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink-faint)",
                marginBottom: "4px",
              }}
            >
              //01 — PROJECT
            </p>
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "24px",
                lineHeight: 1.25,
                fontWeight: 600,
                marginBottom: "8px",
              }}
            >
              Sample Project Card
            </h3>
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "14px",
                lineHeight: 1.5,
                color: "var(--ink-soft)",
                marginBottom: "16px",
              }}
            >
              A demonstration card showing how surfaces, typography, and spacing
              look under the active template.
            </p>
            <div className="flex gap-2">
              <span
                className="px-2 py-1"
                style={{
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                  backgroundColor: "var(--accent-tint)",
                  color: "var(--accent)",
                  borderRadius: "var(--r-xs)",
                }}
              >
                Next.js
              </span>
              <span
                className="px-2 py-1"
                style={{
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                  backgroundColor: "var(--accent-tint)",
                  color: "var(--accent)",
                  borderRadius: "var(--r-xs)",
                }}
              >
                Prisma
              </span>
              <span
                className="px-2 py-1"
                style={{
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                  backgroundColor: "var(--accent-tint)",
                  color: "var(--accent)",
                  borderRadius: "var(--r-xs)",
                }}
              >
                PostgreSQL
              </span>
            </div>
          </div>
        </div>

        {/* Radii & Spacing */}
        <div>
          <p
            className="mb-3"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink-faint)",
            }}
          >
            // BORDER RADII
          </p>
          <div className="flex flex-wrap gap-4">
            {[
              { label: "r-xs", css: "var(--r-xs)" },
              { label: "r-sm", css: "var(--r-sm)" },
              { label: "r-md", css: "var(--r-md)" },
              { label: "r-lg", css: "var(--r-lg)" },
              { label: "r-full", css: "var(--r-full)" },
            ].map((r) => (
              <div key={r.label} className="flex flex-col items-center gap-1">
                <div
                  className="h-12 w-12"
                  style={{
                    backgroundColor: "var(--accent-tint)",
                    border: "2px solid var(--accent)",
                    borderRadius: r.css,
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    color: "var(--ink-faint)",
                  }}
                >
                  {r.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
