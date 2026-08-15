"use client";

import React from "react";
import { Server } from "lucide-react";

interface StatusProps {
  status: {
    database: "Connected" | "Disconnected";
    mediaStorage: "Connected" | "Disconnected";
    authentication: "Operational" | "Degraded";
    googleLogin: "Configured" | "Configuration required";
    contactForm: "Operational" | "Degraded";
  };
}

export default function SystemStatus({ status }: StatusProps) {
  const items = [
    { label: "Database", val: status.database, ok: status.database === "Connected" },
    { label: "Media Storage", val: status.mediaStorage, ok: status.mediaStorage === "Connected" },
    { label: "Authentication", val: status.authentication, ok: status.authentication === "Operational" },
    { label: "Google Login", val: status.googleLogin, ok: status.googleLogin === "Configured" },
    { label: "Contact Form", val: status.contactForm, ok: status.contactForm === "Operational" },
  ];

  return (
    <div className="bg-[var(--a-surface)] border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] p-6 space-y-4" style={{ boxShadow: "var(--a-shadow)" }}>
      <h2 className="text-sm font-bold text-[var(--a-ink)] uppercase tracking-wider flex items-center gap-2">
        <Server size={16} /> System Status
      </h2>

      <div className="space-y-2.5 text-xs">
        {items.map((it, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-[var(--a-soft)] font-medium">{it.label}</span>
            <span
              className={`font-semibold ${
                it.ok ? "text-[var(--a-success-ink)]" : "text-[var(--a-warn-ink)]"
              }`}
            >
              {it.val}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
