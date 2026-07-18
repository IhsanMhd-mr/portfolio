"use client";

import { useEffect, useRef } from "react";

/**
 * Wraps a decorative background element (e.g. the hero aura glow) and nudges it
 * toward the cursor within its containing section. Pure transform writes via ref
 * to avoid re-render cost on every mousemove.
 */
export default function CursorAura({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const auraRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = auraRef.current;
    const section = el?.closest("section");
    if (!el || !section) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = section.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width - 0.5;
      const relY = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transform = `translate(calc(-50% + ${relX * 60}px), calc(-50% + ${relY * 60}px))`;
    };

    section.addEventListener("mousemove", handleMouseMove);
    return () => section.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return <div ref={auraRef} className={className} style={style} />;
}
