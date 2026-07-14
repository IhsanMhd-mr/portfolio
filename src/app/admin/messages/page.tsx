import db from "@/lib/database";
import { revalidatePath } from "next/cache";
import { Inbox, Trash2, Mail, MessageSquare, CheckCircle } from "lucide-react";

export default async function AdminMessagesPage() {
  const messages = await db.contactMessage.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  // Server actions for inline message state mutations
  async function toggleReadStatus(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const currentStatus = formData.get("status") as string;
    
    await db.contactMessage.update({
      where: { id },
      data: { status: currentStatus === "NEW" ? "READ" : "NEW" },
    });
    revalidatePath("/admin/messages");
  }

  async function deleteMessage(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await db.contactMessage.update({
      where: { id },
      data: { deletedAt: new Date() },
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
        <div className="p-4 border-b border-solid border-[var(--a-line)] bg-slate-50 flex items-center gap-2 text-xs font-mono text-[var(--a-faint)]">
          <Inbox size={14} />
          <span>INBOX ITEMS ({messages.length})</span>
        </div>

        <div className="divide-y divide-solid divide-[var(--a-line)]">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`p-6 transition-colors hover:bg-slate-50/50 flex flex-col md:flex-row md:items-start justify-between gap-6 ${
                msg.status === "NEW" ? "bg-amber-500/[0.02] border-l-2 border-solid border-amber-500" : ""
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
                  <span className="text-[10px] font-mono text-[var(--a-faint)] bg-slate-100 px-2 py-0.5 rounded">
                    {msg.category}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-[var(--a-ink)]">{msg.subject}</h3>
                <p className="text-xs text-[var(--a-soft)] leading-relaxed whitespace-pre-line bg-slate-50 p-4 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)]">
                  {msg.message}
                </p>
                <p className="text-[10px] text-[var(--a-faint)] font-mono">
                  Submitted: {msg.createdAt.toLocaleString()}
                </p>
              </div>

              {/* Message Controls */}
              <div className="flex md:flex-col items-center md:items-end gap-2">
                <form action={toggleReadStatus}>
                  <input type="hidden" name="id" value={msg.id} />
                  <input type="hidden" name="status" value={msg.status} />
                  <button
                    type="submit"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--a-r-sm)] text-[10px] font-bold tracking-wider uppercase border border-solid cursor-pointer transition-all ${
                      msg.status === "NEW"
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20"
                        : "bg-slate-100 text-[var(--a-soft)] border-[var(--a-line)] hover:bg-slate-200"
                    }`}
                  >
                    <CheckCircle size={12} />
                    {msg.status === "NEW" ? "Mark Read" : "Mark Unread"}
                  </button>
                </form>

                <form action={deleteMessage}>
                  <input type="hidden" name="id" value={msg.id} />
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-500 border border-solid border-red-200/50 hover:bg-red-100 rounded-[var(--a-r-sm)] text-[10px] font-bold tracking-wider uppercase cursor-pointer transition-all"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}

          {messages.length === 0 && (
            <div className="text-center py-20 text-xs font-mono text-[var(--a-faint)]">// NO MESSAGES RECEIVED IN INBOX</div>
          )}
        </div>
      </div>
    </div>
  );
}
