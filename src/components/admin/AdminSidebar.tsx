"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  Navigation,
  Briefcase,
  Clock,
  Columns3,
  Cpu,
  Gamepad2,
  GraduationCap,
  History,
  Image,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Milestone,
  Palette,
  ScrollText,
  Sliders,
  User,
  X,
} from "lucide-react";

export default function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile drawer on route change (e.g. after tapping a nav link).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const menuItems = [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Page Builder", href: "/admin/page-builder", icon: Columns3 },
    { label: "Profile", href: "/admin/profile", icon: User },
    { label: "Templates", href: "/admin/templates", icon: Palette },
    { label: "Projects", href: "/admin/projects", icon: Briefcase },
    { label: "Technologies", href: "/admin/technologies", icon: Cpu },
    { label: "Timeline", href: "/admin/timeline", icon: Milestone },
    { label: "Education", href: "/admin/education", icon: GraduationCap },
    { label: "Experience", href: "/admin/experience", icon: History },
    { label: "Certifications", href: "/admin/certifications", icon: Award },
    { label: "Navigation", href: "/admin/navigation", icon: Navigation },
    { label: "Media Library", href: "/admin/media", icon: Image },
    { label: "Messages", href: "/admin/messages", icon: Inbox },
    { label: "3D Game", href: "/admin/game", icon: Gamepad2 },
    { label: "Site Settings", href: "/admin/settings", icon: Sliders },
    { label: "Security", href: "/admin/settings/security", icon: Sliders },
    { label: "Audit Log", href: "/admin/audit-log", icon: ScrollText },
  ];

  async function handleLogout() {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      if (response.ok) {
        window.location.href = "/admin/login";
      } else {
        alert("Logout failed. Please try again.");
      }
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  }

  return (
    <>
      {/* Mobile-only hamburger toggle — above the topbar, hidden at md+ where the
          sidebar is always visible. */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        className="md:hidden fixed top-3 left-3 z-[210] p-2 rounded-[var(--a-r-sm)] bg-[var(--a-sidebar)] text-[var(--a-sidebar-text)] border-none cursor-pointer shadow-lg"
      >
        <Menu size={20} />
      </button>

      {/* Backdrop — mobile only, closes the drawer on click */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 z-[195] bg-black/50"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 bottom-0 z-[200] flex flex-col justify-between select-none transition-transform duration-300 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          width: "var(--a-sidebar-width)",
          backgroundColor: "var(--a-sidebar)",
          color: "var(--a-sidebar-text)",
          fontFamily: "var(--a-font-body)",
        }}
      >
        {/* Brand Logo Header */}
        <div className="h-[60px] border-b border-solid border-[var(--a-sidebar-line)] flex items-center justify-between px-6">
          <Link href="/admin/dashboard" className="text-[var(--a-sidebar-heading)] font-bold tracking-tight text-lg">
            Workbench <span className="text-[var(--a-primary)]">CMS</span>
          </Link>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close navigation menu"
            className="md:hidden p-1 text-[var(--a-sidebar-text)] hover:text-[var(--a-sidebar-heading)] bg-transparent border-none cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

      {/* Nav Menu */}
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <nav className="space-y-1">
          {menuItems.map((item) => {
            // Longest matching href wins so /admin/settings/security only
            // highlights "Security", not "Site Settings" as well.
            const matches = menuItems.filter(
              (m) => pathname === m.href || pathname.startsWith(m.href + "/")
            );
            const best = matches.sort((a, b) => b.href.length - a.href.length)[0];
            const isActive = best?.href === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 text-sm rounded-[var(--a-r-sm)] font-medium transition-all group relative hover:bg-[var(--a-sidebar-hover)]"
                style={{
                  backgroundColor: isActive ? "var(--a-sidebar-active-bg)" : "transparent",
                  color: isActive ? "var(--a-sidebar-active)" : "inherit",
                }}
              >
                {isActive && (
                  <span className="absolute left-0 top-1 bottom-1 w-[3px] bg-[var(--a-sidebar-active)] rounded-r-md" />
                )}
                <Icon
                  size={18}
                  className="opacity-70 group-hover:opacity-100 transition-opacity"
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-solid border-[var(--a-sidebar-line)]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full text-sm text-[var(--a-sidebar-danger)] hover:bg-[var(--a-danger-bg)] rounded-[var(--a-r-sm)] transition-colors cursor-pointer border-none"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
      </aside>
    </>
  );
}

