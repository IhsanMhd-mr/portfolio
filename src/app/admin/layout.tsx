import AdminSidebar from "@/components/admin/AdminSidebar";
import Link from "next/link";
import { headers } from "next/headers";
import { Eye, ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/require-admin";
import db from "@/lib/database";
import ThemeToggle from "@/components/theme/theme-toggle";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";
  const isLoginPage = pathname === "/admin/login";

  // On non-login admin pages, deep-validate the session against TrackedSession
  let ownerEmail = "";
  let hasUnpublishedChanges = false;
  if (!isLoginPage) {
    const ctx = await requireAdmin({ pathname });
    const owner = await db.user.findUnique({ where: { id: ctx.userId }, select: { email: true } });
    ownerEmail = owner?.email ?? "";
    const page = await db.page.findUnique({
      where: { key: "home" },
      select: { hasUnpublishedChanges: true },
    });
    hasUnpublishedChanges = page?.hasUnpublishedChanges ?? false;
  }

  if (isLoginPage) {
    return (
      <div
        data-admin="true"
        className="min-h-screen flex flex-col items-center justify-center transition-colors duration-300"
        style={{
          backgroundColor: "var(--a-bg)",
          fontFamily: "var(--a-font-body)",
        }}
      >
        <div className="w-full max-w-md mb-4 flex justify-end">
          <ThemeToggle />
        </div>
        {/* No box styling here — LoginForm's own card is the single visual
            container; wrapping it in a second bordered/shadowed card as well
            produced a "boxes within boxes" look around the error banner. */}
        <main className="w-full max-w-md">
          {children}
        </main>
      </div>
    );
  }

  // Simple breadcrumb generator (Server side)
  const pathParts = pathname.split("/").filter(Boolean);
  const breadcrumbs = pathParts.map((part, index) => {
    const href = "/" + pathParts.slice(0, index + 1).join("/");
    const label = part.charAt(0).toUpperCase() + part.slice(1);
    return { label, href };
  });

  return (
    <div
      data-admin="true"
      className="min-h-screen flex transition-colors duration-300"
      style={{
        backgroundColor: "var(--a-bg)",
        fontFamily: "var(--a-font-body)",
      }}
    >
      {/* 1. Left Sidebar Navigation */}
      <AdminSidebar />

      {/* 2. Right Workbench Content Shell */}
      <div className="flex-1 flex flex-col pl-0 md:pl-[248px]">
        {/* Top bar (60px height) */}
        <header
          className="h-[60px] border-b border-solid border-[var(--a-line)] bg-[var(--a-surface)] px-4 md:px-8 flex items-center justify-between fixed top-0 right-0 z-[190] w-full md:w-[calc(100%-248px)]"
        >
          {/* Breadcrumbs — left padding on mobile clears the sidebar's hamburger toggle */}
          <div className="flex items-center gap-2 text-sm pl-10 md:pl-0">
            <Link
              href="/admin/dashboard"
              className="text-[var(--a-soft)] hover:text-[var(--a-ink)] transition-colors animate-none"
            >
              Admin
            </Link>
            {breadcrumbs.slice(1).map((crumb) => (
              <span key={crumb.href} className="flex items-center gap-2">
                <span className="text-[var(--a-faint)]">/</span>
                <Link
                  href={crumb.href}
                  className="font-medium text-[var(--a-ink)] hover:text-[var(--a-primary)] transition-colors"
                >
                  {crumb.label}
                </Link>
              </span>
            ))}
          </div>

          {/* Right Area Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Draft status chip (live from Page.hasUnpublishedChanges) — label hidden on mobile, dot always visible */}
            {hasUnpublishedChanges ? (
              <div className="flex items-center gap-2 text-xs text-[var(--a-soft)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--a-warn-bg)]0 animate-pulse" />
                <span className="hidden sm:inline">Unpublished changes</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-[var(--a-soft)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--a-success-bg)]0" />
                <span className="hidden sm:inline">Everything published</span>
              </div>
            )}

            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {/* Actions list — labels collapse to icon-only below md; "View Live Site" hides entirely below sm */}
            <div className="flex items-center gap-2">
              <Link
                href="/admin/preview"
                className="flex items-center gap-1.5 text-xs font-semibold px-2 md:px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-[var(--a-soft)] hover:text-[var(--a-ink)] hover:border-[var(--a-ink)] transition-colors bg-[var(--a-surface)]"
              >
                <Eye size={14} />
                <span className="hidden md:inline">Preview Draft</span>
              </Link>
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2 md:px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-[var(--a-soft)] hover:text-[var(--a-ink)] hover:border-[var(--a-ink)] transition-colors bg-[var(--a-surface)]"
              >
                <ExternalLink size={14} />
                <span className="hidden md:inline">View Live Site</span>
              </a>
              <Link
                href="/admin/publish-confirmation"
                className="flex items-center gap-1.5 text-xs font-semibold px-2 md:px-4 py-1.5 bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white rounded-[var(--a-r-sm)] transition-colors border-none"
              >
                <span className="md:hidden">Publish</span>
                <span className="hidden md:inline">Publish...</span>
              </Link>
            </div>

            {/* Profile Avatar indicator */}
            <div
              className="h-8 w-8 rounded-full bg-[var(--a-primary-tint)] border border-solid border-[var(--a-line)] flex items-center justify-center text-xs font-bold text-[var(--a-soft)] shrink-0"
            >
              {ownerEmail.substring(0, 2).toUpperCase() || "AD"}
            </div>
          </div>
        </header>

        {/* Inner Content Area */}
        <main className="flex-1 p-4 md:p-8 pt-[76px] md:pt-[88px] overflow-x-hidden min-w-0">{children}</main>
      </div>
    </div>
  );
}
