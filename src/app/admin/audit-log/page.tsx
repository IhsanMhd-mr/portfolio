"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { ClipboardList, ChevronDown, ChevronUp, Search, Filter } from "lucide-react";

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string | null;
  loginMethod: string | null;
  ipAddress: string | null;
  createdAt: string;
  beforeJson: unknown;
  afterJson: unknown;
}

interface AuditResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  entries: AuditEntry[];
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN_SUCCESS: "text-[var(--a-success-ink)] bg-[var(--a-success-bg)]",
  LOGIN_FAILED: "text-[var(--a-danger-ink)] bg-[var(--a-danger-bg)]",
  LOGOUT: "text-[var(--a-soft)] bg-[var(--a-inset)]",
  PASSWORD_CHANGED: "text-[var(--a-warn-ink)] bg-[var(--a-warn-bg)]",
  GOOGLE_LINKED: "text-[var(--a-info-ink)] bg-[var(--a-info-bg)]",
  GOOGLE_UNLINKED: "text-orange-600 bg-orange-50",
  SESSION_REVOKED: "text-purple-600 bg-purple-50",
  PROJECT_CREATED: "text-teal-600 bg-teal-50",
  PROJECT_UPDATED: "text-teal-600 bg-teal-50",
  PROJECT_DELETED: "text-[var(--a-danger-ink)] bg-[var(--a-danger-bg)]",
  SECTION_ADDED: "text-[var(--a-info-ink)] bg-[var(--a-info-bg)]",
  SECTION_UPDATED: "text-[var(--a-info-ink)] bg-[var(--a-info-bg)]",
  SECTION_DELETED: "text-[var(--a-danger-ink)] bg-[var(--a-danger-bg)]",
  SECTION_REORDERED: "text-[var(--a-info-ink)] bg-[var(--a-info-bg)]",
  TEMPLATE_CHANGED: "text-violet-600 bg-violet-50",
  PAGE_PUBLISHED: "text-[var(--a-success-ink)] bg-[var(--a-success-bg)]",
};

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_COLORS[action] ?? "text-[var(--a-soft)] bg-[var(--a-inset)]";
  return (
    <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${cls}`}>
      {action}
    </span>
  );
}

function JsonViewer({ data, label }: { data: unknown; label: string }) {
  if (!data) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-[var(--a-soft)] mb-1">{label}</p>
      <pre className="text-xs bg-[var(--a-bg)] border border-[var(--a-line)] rounded p-2 overflow-x-auto max-h-40">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export default function AuditLogPage() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (search) params.set("search", search);
    if (actionFilter) params.set("action", actionFilter);
    const res = await fetch(`/api/audit-log?${params}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [page, search, actionFilter]);

  useEffect(() => { load(); }, [load]);

  function toggleExpand(id: string) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--a-ink)] flex items-center gap-2">
          <ClipboardList size={22} /> Audit Log
        </h1>
        <p className="text-sm text-[var(--a-soft)] mt-1">
          Read-only record of all admin actions. {data ? `${data.total} total entries.` : ""}
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--a-faint)]" />
          <input
            type="text"
            placeholder="Search summaries…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 pr-3 py-1.5 text-sm bg-[var(--a-surface)] border border-[var(--a-line)] rounded-[var(--a-r-sm)] text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] w-56"
          />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--a-faint)]" />
          <input
            type="text"
            placeholder="Filter by action…"
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value.toUpperCase()); setPage(1); }}
            className="pl-8 pr-3 py-1.5 text-sm bg-[var(--a-surface)] border border-[var(--a-line)] rounded-[var(--a-r-sm)] text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] w-48 font-mono"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--a-surface)] border border-[var(--a-line)] rounded-[var(--a-r-md)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--a-line)] text-xs font-semibold text-[var(--a-soft)]">
                <th className="px-4 py-3 text-left">When</th>
                <th className="px-4 py-3 text-left">Action</th>
                <th className="px-4 py-3 text-left">Summary</th>
                <th className="px-4 py-3 text-left">Method</th>
                <th className="px-4 py-3 text-left">IP</th>
                <th className="px-4 py-3 text-left w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--a-line)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--a-faint)] text-sm">
                    Loading…
                  </td>
                </tr>
              ) : !data?.entries.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--a-faint)] text-sm">
                    No audit events found.
                  </td>
                </tr>
              ) : (
                data.entries.map((entry) => (
                  <Fragment key={entry.id}>
                    <tr
                      key={entry.id}
                      className="hover:bg-[var(--a-bg)] transition-colors cursor-pointer"
                      onClick={() => toggleExpand(entry.id)}
                    >
                      <td className="px-4 py-2.5 text-xs text-[var(--a-faint)] whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <ActionBadge action={entry.action} />
                      </td>
                      <td className="px-4 py-2.5 text-[var(--a-ink)] max-w-xs truncate">
                        {entry.summary ?? <span className="text-[var(--a-faint)]">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[var(--a-soft)]">
                        {entry.loginMethod ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono text-[var(--a-soft)]">
                        {entry.ipAddress ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--a-faint)]">
                        {entry.beforeJson || entry.afterJson ? (
                          expanded === entry.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        ) : null}
                      </td>
                    </tr>
                    {expanded === entry.id && Boolean(entry.beforeJson || entry.afterJson) && (
                      <tr key={`${entry.id}-detail`}>
                        <td colSpan={6} className="px-6 py-4 bg-[var(--a-bg)]">
                          <div className="grid sm:grid-cols-2 gap-4">
                            <JsonViewer data={entry.beforeJson} label="Before" />
                            <JsonViewer data={entry.afterJson} label="After" />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="border-t border-[var(--a-line)] px-4 py-3 flex items-center justify-between text-xs text-[var(--a-soft)]">
            <span>
              Page {data.page} of {data.totalPages} ({data.total} entries)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={data.page <= 1}
                className="px-3 py-1 border border-[var(--a-line)] rounded text-xs disabled:opacity-40 hover:border-[var(--a-ink)] transition-colors bg-[var(--a-surface)] cursor-pointer"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={data.page >= data.totalPages}
                className="px-3 py-1 border border-[var(--a-line)] rounded text-xs disabled:opacity-40 hover:border-[var(--a-ink)] transition-colors bg-[var(--a-surface)] cursor-pointer"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
