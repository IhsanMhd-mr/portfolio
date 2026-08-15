"use client";

import React from "react";

interface HeaderProps {
  ownerName: string;
  templateName: string;
  lastPublished: string;
  loginMethod: string;
  loginIdentity: string;
}

export default function DashboardHeader({
  ownerName,
  templateName,
  lastPublished,
  loginMethod,
  loginIdentity,
}: HeaderProps) {
  return (
    <div className="bg-[var(--a-surface)] border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] p-6 space-y-4" style={{ boxShadow: "var(--a-shadow)" }}>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--a-ink)]">
          Welcome back, {ownerName || "Ihsan"}
        </h1>
        <p className="mt-1 text-sm text-[var(--a-soft)]">
          Your portfolio is currently live using the <strong className="text-[var(--a-ink)] uppercase">{templateName || "None"}</strong> template.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-solid border-[var(--a-line)] text-xs">
        <div>
          <p className="text-[var(--a-faint)] uppercase font-semibold tracking-wider">Last Published</p>
          <p className="mt-1 font-medium text-[var(--a-ink)]">{lastPublished}</p>
        </div>
        <div>
          <p className="text-[var(--a-faint)] uppercase font-semibold tracking-wider">Signed in with</p>
          <p className="mt-1 font-medium text-[var(--a-ink)]">
            <span className="capitalize">{loginMethod.toLowerCase()}</span> &middot; {loginIdentity}
          </p>
        </div>
      </div>
    </div>
  );
}
