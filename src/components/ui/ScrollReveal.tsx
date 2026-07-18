"use client";

import { useEffect, useRef } from "react";
import { stagger } from "@/lib/motion/tokens";

interface ScrollRevealProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
}

/** Fades/slides children in once they cross the viewport, using an IntersectionObserver. */
export default function ScrollReveal({ children, index = 0, className = "" }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={{ transitionDelay: `${Math.min(index, 4) * stagger.loose}s` }}
    >
      {children}
    </div>
  );
}
