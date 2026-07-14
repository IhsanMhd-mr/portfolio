"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowDownToLine, Menu, X } from "lucide-react";

export default function Navbar({
  logoText = "Jane Doe",
  cvUrl = "/resume",
  isLoggedIn = false,
}: {
  logoText?: string;
  cvUrl?: string;
  isLoggedIn?: boolean;
}) {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Projects", href: "/projects" },
    { label: "Timeline", href: "/timeline" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 h-[68px] z-[100] flex items-center justify-between px-[var(--gutter)] transition-all duration-250`}
        style={{
          backgroundColor: isScrolled
            ? "var(--glass-strong, var(--bg-raised))"
            : "transparent",
          backdropFilter: isScrolled ? "var(--glass-blur, blur(12px))" : "none",
          borderBottom: isScrolled ? "1px solid var(--line)" : "1px solid transparent",
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-[var(--accent)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {logoText}
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="text-small font-medium transition-colors hover:text-[var(--accent)]"
                style={{
                  color: isActive ? "var(--accent)" : "var(--ink-soft)",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <a
            href={cvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2 border border-solid border-[var(--line)] rounded-[var(--radius-sm)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            style={{ color: "var(--ink)" }}
          >
            <ArrowDownToLine size={14} />
            CV
          </a>
          <Link
            href={isLoggedIn ? "/admin/dashboard" : "/admin/login"}
            className="text-xs font-semibold px-4 py-2 bg-[var(--accent)] rounded-[var(--radius-sm)] transition-colors hover:bg-[var(--accent-hover)] text-center block"
            style={{
              color: "var(--bg)",
            }}
          >
            {isLoggedIn ? "Dashboard" : "Log in"}
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 text-[var(--ink)] hover:text-[var(--accent)] transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-[90] md:hidden flex flex-col pt-24 px-8 pb-12"
          style={{
            backgroundColor: "var(--bg)",
            fontFamily: "var(--font-body)",
          }}
        >
          <nav className="flex flex-col gap-6 text-center">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-xl font-medium text-[var(--ink)] hover:text-[var(--accent)] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto flex flex-col gap-4">
            <a
              href={cvUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-3 border border-solid border-[var(--line)] rounded-[var(--radius-sm)] text-center font-semibold text-[var(--ink)]"
            >
              <ArrowDownToLine size={16} />
              Download CV
            </a>
            <Link
              href={isLoggedIn ? "/admin/dashboard" : "/admin/login"}
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full py-3 bg-[var(--accent)] text-[var(--bg)] font-semibold rounded-[var(--radius-sm)] text-center"
            >
              {isLoggedIn ? "Dashboard" : "Log in"}
            </Link>
          </div>
        </div>
      )}

    </>
  );
}
