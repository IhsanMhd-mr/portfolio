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
        <main className="w-full max-w-md p-8 bg-[var(--a-surface)] border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] shadow-lg">
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
      <div className="flex-1 flex flex-col pl-[248px]">
        {/* Top bar (60px height) */}
        <header
          className="h-[60px] border-b border-solid border-[var(--a-line)] bg-[var(--a-surface)] px-8 flex items-center justify-between fixed top-0 right-0 z-[190]"
          style={{ width: "calc(100% - 248px)" }}
        >
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm">
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
          <div className="flex items-center gap-4">
            {/* Draft status chip (live from Page.hasUnpublishedChanges) */}
            {hasUnpublishedChanges ? (
              <div className="flex items-center gap-2 text-xs text-[var(--a-soft)]">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Unpublished changes</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-[var(--a-soft)]">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span>Everything published</span>
              </div>
            )}

            <ThemeToggle />

            {/* Actions list */}
            <div className="flex items-center gap-2">
              <Link
                href="/admin/preview"
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-[var(--a-soft)] hover:text-[var(--a-ink)] hover:border-[var(--a-ink)] transition-colors bg-[var(--a-surface)]"
              >
                <Eye size={14} />
                Preview Draft
              </Link>
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-[var(--a-soft)] hover:text-[var(--a-ink)] hover:border-[var(--a-ink)] transition-colors bg-[var(--a-surface)]"
              >
                <ExternalLink size={14} />
                View Live Site
              </a>
              <Link
                href="/admin/publish-confirmation"
                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white rounded-[var(--a-r-sm)] transition-colors border-none"
              >
                Publish...
              </Link>
            </div>

            {/* Profile Avatar indicator */}
            <div
              className="h-8 w-8 rounded-full bg-[var(--a-primary-tint)] border border-solid border-[var(--a-line)] flex items-center justify-center text-xs font-bold text-[var(--a-soft)]"
            >
              {ownerEmail.substring(0, 2).toUpperCase() || "AD"}
            </div>
          </div>
        </header>

        {/* Inner Content Area */}
        <main className="flex-1 p-8 pt-[88px]">{children}</main>
      </div>
    </div>
  );
}
