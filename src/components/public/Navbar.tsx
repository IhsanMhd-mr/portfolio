"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowDownToLine, Menu, X } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import AuthDialog from "../auth/AuthDialog";
import ThemeToggle from "../theme/theme-toggle";

const DEFAULT_NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Projects", href: "/projects" },
  { label: "Timeline", href: "/timeline" },
  { label: "Contact", href: "/contact" },
];

export interface NavLinkItem {
  label: string;
  href: string;
}

export default function Navbar({
  logoText = null,
  cvUrl = "/resume",
  navLinks: navLinksProp,
}: {
  /** Null renders no wordmark rather than a placeholder name. */
  logoText?: string | null;
  cvUrl?: string;
  /** Admin-configured items (NavItemService). Falls back to the built-in
   *  default list when empty, so a fresh install never shows an empty nav. */
  navLinks?: NavLinkItem[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isDropdownOpen && !(e.target as Element).closest(".dropdown-container")) {
        setIsDropdownOpen(false);
      }
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [isDropdownOpen]);

  useEffect(() => {
    if (searchParams.get("login") === "1" && !isLoggedIn) {
      setIsAuthDialogOpen(true);
    }
  }, [searchParams, isLoggedIn]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = navLinksProp && navLinksProp.length > 0 ? navLinksProp : DEFAULT_NAV_LINKS;

  return (
    <>
      <header
        className={`pm-nav fixed top-0 left-0 right-0 h-[68px] z-[100] flex items-center justify-between px-[var(--gutter)] transition-all duration-250`}
        style={{
          backgroundColor: isScrolled
            ? "var(--glass-strong, var(--bg-raised))"
            : "transparent",
          backdropFilter: isScrolled ? "var(--glass-blur, blur(12px))" : "none",
          borderBottom: isScrolled ? "1px solid var(--line)" : "1px solid transparent",
        }}
      >
        {/* Logo */}
        {/* No wordmark configured — render nothing rather than an invisible,
            empty click target where the brand link would be. */}
        {logoText ? (
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-[var(--accent)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {logoText}
          </Link>
        ) : (
          <span />
        )}

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
          <ThemeToggle />
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

          {isLoggedIn ? (
            <div className="relative dropdown-container">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="text-xs font-semibold px-4 py-2 bg-[var(--accent)] rounded-[var(--radius-sm)] text-[var(--bg)] transition-colors hover:bg-[var(--accent-hover)] flex items-center gap-1"
              >
                Admin ▾
              </button>
              {isDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-40 rounded-[var(--radius-sm)] border border-solid border-[var(--line)] bg-[var(--bg-raised)] py-1 shadow-lg z-[110]"
                >
                  <Link
                    href="/admin/dashboard"
                    onClick={() => setIsDropdownOpen(false)}
                    className="block px-4 py-2 text-xs font-medium text-[var(--ink-soft)] hover:text-[var(--accent)] transition-all hover:bg-[var(--bg)]"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/"
                    onClick={() => setIsDropdownOpen(false)}
                    className="block px-4 py-2 text-xs font-medium text-[var(--ink-soft)] hover:text-[var(--accent)] transition-all hover:bg-[var(--bg)]"
                  >
                    View live site
                  </Link>
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                    className="block w-full text-left px-4 py-2 text-xs font-medium text-[var(--danger, #ef4444)] transition-all hover:bg-[var(--bg)]"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsAuthDialogOpen(true)}
              className="text-xs font-semibold px-4 py-2 bg-[var(--accent)] rounded-[var(--radius-sm)] transition-colors hover:bg-[var(--accent-hover)] text-center block"
              style={{
                color: "var(--bg)",
              }}
            >
              Log in
            </button>
          )}
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
            <div className="flex justify-center">
              <ThemeToggle />
            </div>
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
            {isLoggedIn ? (
              <>
                <Link
                  href="/admin/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full py-3 border border-solid border-[var(--line)] text-[var(--ink)] font-semibold rounded-[var(--radius-sm)] text-center"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    signOut({ callbackUrl: "/" });
                  }}
                  className="w-full py-3 bg-[var(--danger, #ef4444)] text-white font-semibold rounded-[var(--radius-sm)] text-center"
                >
                  Log out
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsAuthDialogOpen(true);
                }}
                className="w-full py-3 bg-[var(--accent)] text-[var(--bg)] font-semibold rounded-[var(--radius-sm)] text-center"
              >
                Log in
              </button>
            )}
          </div>
        </div>
      )}

      <AuthDialog isOpen={isAuthDialogOpen} onClose={() => setIsAuthDialogOpen(false)} />
    </>
  );
}
