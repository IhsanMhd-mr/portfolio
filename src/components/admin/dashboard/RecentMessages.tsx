"use client";

import React from "react";
import Link from "next/link";
import { Inbox, CheckCircle2, ArrowRight } from "lucide-react";

interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string | Date;
}

interface MessagesProps {
  messages: Message[];
  onMarkRead?: (id: string) => void;
}

export default function RecentMessages({ messages, onMarkRead }: MessagesProps) {
  async function markAsRead(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(`/api/messages`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "READ" }),
      });
      if (res.ok && onMarkRead) {
        onMarkRead(id);
      }
    } catch (err) {
      console.error("Failed to mark message as read:", err);
    }
  }

  return (
    <div className="bg-[var(--a-surface)] border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] p-6 space-y-4 flex flex-col justify-between" style={{ boxShadow: "var(--a-shadow)" }}>
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-[var(--a-ink)] uppercase tracking-wider flex items-center gap-2">
          <Inbox size={16} /> Recent Messages
        </h2>

        {messages.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <p className="text-xs text-[var(--a-faint)]">No contact messages yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isUnread = msg.status === "NEW";
              return (
                <div
                  key={msg.id}
                  className={`p-3 border border-solid rounded-[var(--a-r-sm)] text-xs relative ${
                    isUnread
                      ? "border-[var(--a-warn)] bg-[var(--a-warn-bg)]"
                      : "border-[var(--a-line)] bg-[var(--a-surface)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--a-ink)]">{msg.name}</span>
                        {isUnread && (
                          <span className="text-[9px] font-bold bg-[var(--a-warn)] text-white px-1.5 py-0.5 rounded uppercase tracking-wider scale-90">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[var(--a-soft)] font-medium mt-0.5">
                        {msg.subject}
                      </p>
                    </div>
                    <span className="text-[9px] text-[var(--a-faint)] shrink-0">
                      {new Date(msg.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-[10px] text-[var(--a-soft)] mt-2 line-clamp-2">
                    {msg.message}
                  </p>

                  <div className="mt-3 flex items-center gap-2 border-t border-solid border-[var(--a-line)] pt-2 justify-between">
                    <Link
                      href={`/admin/messages`}
                      className="text-[10px] font-bold text-[var(--a-primary)] hover:underline"
                    >
                      Open Message
                    </Link>
                    {isUnread && (
                      <button
                        onClick={(e) => markAsRead(msg.id, e)}
                        className="text-[9px] font-bold text-[var(--a-soft)] hover:text-[var(--a-success-ink)] flex items-center gap-1 bg-transparent border-none cursor-pointer"
                      >
                        <CheckCircle2 size={10} /> Mark Read
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-solid border-[var(--a-line)] mt-2">
        <Link
          href="/admin/messages"
          className="text-xs font-bold text-[var(--a-primary)] hover:text-[var(--a-primary-hover)] flex items-center justify-center gap-1.5 transition-colors"
        >
          View All Messages <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
