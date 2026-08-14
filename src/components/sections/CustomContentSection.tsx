import React from "react";

interface CustomContentSectionProps {
  settings?: any;
  isPreview?: boolean;
}

export default function CustomContentSection({ settings, isPreview = false }: CustomContentSectionProps) {
  const heading = settings?.heading || "Custom Highlight";
  const subheading = settings?.subheading || "Additional information";
  const bodyText = settings?.bodyText || "Add customized messaging blocks detailing special accomplishments, project notes, or visual highlights from the admin Page Builder.";
  const align = settings?.align || "left";

  return (
    <section className="w-full py-20 px-[var(--gutter)] bg-[var(--bg)] border-t border-solid border-[var(--line)] transition-colors duration-300">
      <div className="max-w-[var(--w-content)] mx-auto">
        <div className={`max-w-2xl ${align === "center" ? "mx-auto text-center" : align === "right" ? "ml-auto text-right" : "text-left"}`}>
          <p className="pm-kicker text-mono-label mb-2 text-[var(--accent)]">// {subheading.toUpperCase()}</p>
          <h2 className="text-h2 mb-6 text-[var(--ink)]" style={{ fontFamily: "var(--font-display)" }}>
            {heading}
          </h2>
          <p className="text-body text-[var(--ink-soft)] leading-relaxed whitespace-pre-wrap">
            {bodyText}
          </p>
        </div>
      </div>
    </section>
  );
}
