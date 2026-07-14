import db from "@/lib/database";
import Link from "next/link";
import { PlusCircle, Columns3, Palette, UploadCloud, Eye, Globe, Inbox, ArrowRight } from "lucide-react";

export default async function AdminDashboardPage() {
  // Query database statistics in parallel
  const [
    totalProjects,
    publishedProjects,
    draftProjects,
    hiddenProjects,
    techCount,
    timelineCount,
    unreadMessages,
    pageDetails,
    recentLogs,
  ] = await Promise.all([
    db.project.count({ where: { deletedAt: null } }),
    db.project.count({ where: { publishState: "PUBLISHED", visible: true, deletedAt: null } }),
    db.project.count({ where: { publishState: "DRAFT", deletedAt: null } }),
    db.project.count({ where: { visible: false, deletedAt: null } }),
    db.technology.count({ where: { deletedAt: null } }),
    db.timelineEntry.count({ where: { deletedAt: null } }),
    db.contactMessage.count({ where: { status: "NEW", deletedAt: null } }),
    db.page.findUnique({
      where: { key: "home" },
      include: {
        draftTemplate: true,
        versions: {
          where: { isActive: true },
          take: 1,
        },
      },
    }),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const activeTemplateName = pageDetails?.versions?.[0]
    ? pageDetails.versions[0].templateKey.replace("PROFESSIONAL_", "").replace("MODERN_", "").replace("INTERACTIVE_", "").replace("_", " ").toLowerCase()
    : pageDetails?.draftTemplate?.name || "Modern Glass";

  const lastPublishedDate = pageDetails?.versions?.[0]
    ? pageDetails.versions[0].createdAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Never Published";

  const stats = [
    { label: "Total Projects", value: totalProjects },
    { label: "Published Works", value: publishedProjects },
    { label: "Draft Projects", value: draftProjects },
    { label: "Hidden Items", value: hiddenProjects },
    { label: "Tech Stack Skills", value: techCount },
    { label: "Timeline Milestones", value: timelineCount },
    { label: "Unread Messages", value: unreadMessages, highlight: unreadMessages > 0 },
  ];

  const quickActions = [
    { label: "Add Project", href: "/admin/projects/new", icon: PlusCircle, color: "var(--a-primary)" },
    { label: "Edit Homepage", href: "/admin/page-builder", icon: Columns3, color: "#10B981" },
    { label: "Change Template", href: "/admin/templates", icon: Palette, color: "#8B5CF6" },
    { label: "View Messages", href: "/admin/messages", icon: Inbox, color: "#F59E0B" },
    { label: "Preview Draft", href: "/admin/preview", icon: Eye, color: "#3B82F6" },
    { label: "View Live Site", href: "/", icon: Globe, color: "#6B7280" },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">Dashboard Overview</h1>
        <p className="mt-1.5 text-sm text-[var(--a-soft)]">
          Last published: <strong className="text-[var(--a-ink)]">{lastPublishedDate}</strong> · Active Theme: <strong className="text-[var(--a-ink)] uppercase">{activeTemplateName}</strong>
        </p>
      </div>

      {/* Grid of stats */}
      <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <div
            key={i}
            className={`p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] ${
              stat.highlight ? "border-amber-500 bg-amber-500/5" : ""
            }`}
            style={{ boxShadow: "var(--a-shadow)" }}
          >
            <p className="text-xs font-semibold text-[var(--a-soft)] uppercase tracking-wider">{stat.label}</p>
            <p className="mt-3 text-4xl font-extrabold text-[var(--a-ink)] tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main split sections */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Quick Actions Grid */}
        <div className="lg:col-span-7 space-y-6">
          <h2 className="text-lg font-bold text-[var(--a-ink)] border-b border-solid border-[var(--a-line)] pb-2">// QUICK ACTIONS</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {quickActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <Link
                  key={i}
                  href={action.href}
                  className="flex items-center gap-4 p-5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] bg-[var(--a-surface)] hover:border-[var(--a-primary)] transition-all group"
                  style={{ boxShadow: "var(--a-shadow)" }}
                >
                  <div 
                    className="p-3 rounded-[var(--a-r-sm)] text-white" 
                    style={{ backgroundColor: action.color }}
                  >
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--a-ink)] group-hover:text-[var(--a-primary)] transition-colors">{action.label}</h3>
                    <p className="text-xs text-[var(--a-soft)] mt-0.5">Manage details →</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Admin Audit Logs */}
        <div className="lg:col-span-5 space-y-6">
          <h2 className="text-lg font-bold text-[var(--a-ink)] border-b border-solid border-[var(--a-line)] pb-2">// RECENT ACTIVITY LOGS</h2>
          <div className="p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-4" style={{ boxShadow: "var(--a-shadow)" }}>
            {recentLogs.map((log) => (
              <div key={log.id} className="flex gap-3 text-xs leading-relaxed border-b border-solid border-[var(--a-line)] pb-3 last:border-b-0 last:pb-0">
                <span className="font-mono text-[var(--a-primary)] uppercase font-semibold">[{log.action}]</span>
                <div className="flex-1">
                  <p className="text-[var(--a-ink)] font-medium">{log.summary}</p>
                  <p className="text-[10px] text-[var(--a-faint)] mt-0.5">
                    {log.createdAt.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {recentLogs.length === 0 && (
              <p className="text-center text-xs text-[var(--a-faint)] font-mono py-4">// NO RECENT ACTIVITY LOGGED</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
