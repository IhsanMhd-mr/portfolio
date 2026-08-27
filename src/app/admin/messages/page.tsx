import { Suspense } from "react";
import AdminPageSkeleton from "@/components/admin/AdminPageSkeleton";
import { ContactMessageService } from "@/services/contact-message.service";
import { requireAdmin } from "@/lib/require-admin";
import { currentPathname } from "@/lib/current-pathname";
import { revalidatePath } from "next/cache";
import { Inbox, Trash2, Mail, CheckCircle } from "lucide-react";
import Pagination from "@/components/admin/Pagination";
import { formatDateTime } from "@/lib/format-date";
import PendingButton from "@/components/ui/PendingButton";

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

/**
 * Protected content for this route.
 *
 * Authorization runs FIRST, before any protected read. This page renders
 * visitor-submitted contact messages — names, email addresses and message
 * bodies — and previously had no page-level check at all: the requireAdmin
 * calls below guard the Server Actions, not the render.
 */
async function ProtectedContent({ searchParams }: PageProps) {
  await requireAdmin(await currentPathname());

  const params = await searchParams;
  const rawPage = parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  const { total, totalPages, messages } = await ContactMessageService.listPage(
    page,
    PAGE_SIZE
  );

  async function toggleReadStatus(formData: FormData) {
    "use server";
    // Server Actions are independently invocable POST endpoints — the
    // admin layout guards page RENDERING, not this.
    const ctx = await requireAdmin();
    await ContactMessageService.toggleRead(String(formData.get("id") || ""), {
      actorId: ctx.userId,
      loginMethod: ctx.loginMethod,
      loginAccountId: ctx.loginAccountId,
    });
    revalidatePath("/admin/messages");
  }

  async function deleteMessage(formData: FormData) {
    "use server";
    const ctx = await requireAdmin();
    await ContactMessageService.softDelete(String(formData.get("id") || ""), {
      actorId: ctx.userId,
      loginMethod: ctx.loginMethod,
      loginAccountId: ctx.loginAccountId,
    });
    revalidatePath("/admin/messages");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">Received Messages</h1>
        <p className="text-sm text-[var(--a-soft)] mt-1.5">
          Inbox of all inquiries submitted through the public contact form.
        </p>
      </div>

      <div className="border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] overflow-hidden" style={{ boxShadow: "var(--a-shadow)" }}>
        <div className="p-4 border-b border-solid border-[var(--a-line)] bg-[var(--a-inset)] flex items-center gap-2 text-xs font-mono text-[var(--a-faint)]">
          <Inbox size={14} />
          <span>INBOX ITEMS ({total})</span>
        </div>

        <div className="divide-y divide-solid divide-[var(--a-line)]">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`p-6 transition-colors hover:bg-[var(--a-inset)]/50 flex flex-col md:flex-row md:items-start justify-between gap-6 ${
                msg.status === "NEW" ? "bg-[var(--a-warn-bg)] border-l-2 border-solid border-[var(--a-warn)]" : ""
              }`}
            >
              {/* Message content */}
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-bold text-sm text-[var(--a-ink)]">{msg.name}</span>
                  <a href={`mailto:${msg.email}`} className="text-xs text-[var(--a-soft)] flex items-center gap-1 hover:text-[var(--a-primary)]">
                    <Mail size={12} />
                    {msg.email}
                  </a>
                  <span className="text-[10px] font-mono text-[var(--a-faint)] bg-[var(--a-inset)] px-2 py-0.5 rounded">
                    {msg.category}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-[var(--a-ink)]">{msg.subject}</h3>
                <p className="text-xs text-[var(--a-soft)] leading-relaxed whitespace-pre-line bg-[var(--a-inset)] p-4 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)]">
                  {msg.message}
                </p>
                <p className="text-[10px] text-[var(--a-faint)] font-mono">
                  Submitted: {formatDateTime(msg.createdAt)}
                </p>
              </div>

              {/* Message Controls */}
              <div className="flex md:flex-col items-center md:items-end gap-2">
                <form action={toggleReadStatus}>
                  <input type="hidden" name="id" value={msg.id} />
                  <input type="hidden" name="status" value={msg.status} />
                  <PendingButton variant="icon"
                    
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--a-r-sm)] text-[10px] font-bold tracking-wider uppercase border border-solid cursor-pointer transition-all ${
                      msg.status === "NEW"
                        ? "bg-[var(--a-warn-bg)] text-[var(--a-warn-ink)] border-[var(--a-warn-ink)]/20 hover:bg-[var(--a-warn-bg)]"
                        : "bg-[var(--a-inset)] text-[var(--a-soft)] border-[var(--a-line)] hover:bg-[var(--a-line-hover)]"
                    }`}
                  >
                    <CheckCircle size={12} />
                    {msg.status === "NEW" ? "Mark Read" : "Mark Unread"}
                  </PendingButton>
                </form>

                <form action={deleteMessage}>
                  <input type="hidden" name="id" value={msg.id} />
                  <PendingButton variant="icon"
                    
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--a-danger-bg)] text-[var(--a-danger-ink)] border border-solid border-[var(--a-danger-ink)]/20 hover:bg-[var(--a-danger-bg)] rounded-[var(--a-r-sm)] text-[10px] font-bold tracking-wider uppercase cursor-pointer transition-all"
                  >
                    <Trash2 size={12} />
                    Delete
                  </PendingButton>
                </form>
              </div>
            </div>
          ))}

          {messages.length === 0 && (
            <div className="text-center py-20 text-xs font-mono text-[var(--a-faint)]">// NO MESSAGES RECEIVED IN INBOX</div>
          )}
        </div>

        <div className="px-4 pb-4">
          <Pagination currentPage={page} totalPages={totalPages} buildHref={(p) => `/admin/messages?page=${p}`} />
        </div>
      </div>
    </div>
  );
}

export default function AdminMessagesPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <ProtectedContent searchParams={searchParams} />
    </Suspense>
  );
}
