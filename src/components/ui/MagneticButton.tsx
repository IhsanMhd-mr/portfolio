"use client";

import { useRef } from "react";

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}

/** Wraps a button/link and nudges it toward the cursor on hover ("magnetic" effect). */
export default function MagneticButton({ children, className = "", strength = 0.35 }: MagneticButtonProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const offsetX = (e.clientX - rect.left - rect.width / 2) * strength;
    const offsetY = (e.clientY - rect.top - rect.height / 2) * strength;
    el.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
  };

  const handleMouseLeave = () => {
    const el = wrapperRef.current;
    if (!el) return;
    el.style.transform = "translate(0, 0)";
  };

  return (
    <div
      ref={wrapperRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`inline-block transition-transform duration-200 ease-out ${className}`}
      style={{ willChange: "transform" }}
    >
      {children}
    </div>
  );
}
