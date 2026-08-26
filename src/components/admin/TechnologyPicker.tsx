"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";

export interface PickerTech {
  id: string;
  name: string;
}

interface TechnologyPickerProps {
  /** Seeded by the server render — the component never fetches on mount. */
  technologies: PickerTech[];
  /** Technologies already linked to this project/experience. */
  selectedIds: string[];
  /** "cards" = the roomy 4-up grid (projects); "compact" = the dense scroller (experience). */
  variant?: "cards" | "compact";
}

/**
 * Technology checkboxes plus an inline "add a skill" row.
 *
 * Two constraints shape this component:
 *
 * 1. It still emits `tech_<id>` checkboxes, because the surrounding form's
 *    server action reads those exact names out of FormData. Keeping the
 *    contract means neither server action had to change.
 *
 * 2. Adding a skill updates local state only — it deliberately does NOT call
 *    router.refresh(). A route refresh would re-render the server page and
 *    throw away every unsaved edit in the surrounding form (title, summary,
 *    dates, case-study fields). Component-local state is the whole point.
 *
 * The list is seeded from the server, so mounting costs zero requests; the only
 * network call is the POST that happens when you actually add something.
 */
export default function TechnologyPicker({
  technologies,
  selectedIds,
  variant = "cards",
}: TechnologyPickerProps) {
  const [list, setList] = useState<PickerTech[]>(technologies);
  const [checked, setChecked] = useState<Set<string>>(new Set(selectedIds));
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "info" | "error"; text: string } | null>(null);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  async function addSkill() {
    const name = draft.trim();
    if (!name || busy) return;

    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/technologies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Keep what was typed so the text isn't lost on a failed attempt.
        setNote({ kind: "error", text: data.error || "Could not add that skill." });
        return;
      }

      // `existed` means the slug already had a technology — select it rather
      // than appending a duplicate entry to the list.
      setList((prev) => (prev.some((t) => t.id === data.id) ? prev : [...prev, { id: data.id, name: data.name }]));
      setChecked((prev) => new Set(prev).add(data.id));
      setDraft("");
      if (data.existed) {
        setNote({ kind: "info", text: `"${data.name}" was already in the list — selected it.` });
      }
    } catch {
      setNote({ kind: "error", text: "Network error. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  const compact = variant === "compact";

  return (
    <div className="space-y-2">
      <div
        className={
          compact
            ? "p-2.5 border border-solid border-[var(--a-line)] rounded bg-[var(--a-inset)]/50 max-h-40 overflow-y-auto grid grid-cols-2 gap-1.5"
            : "grid gap-4 sm:grid-cols-4"
        }
      >
        {list.map((tech) => (
          <div
            key={tech.id}
            className={
              compact
                ? "flex items-center gap-1.5"
                : "flex items-center gap-2 p-2 border border-solid border-[var(--a-line)] hover:bg-[var(--a-inset)] rounded"
            }
          >
            <input
              type="checkbox"
              id={`tech_${tech.id}`}
              name={`tech_${tech.id}`}
              checked={checked.has(tech.id)}
              onChange={() => toggle(tech.id)}
              className="cursor-pointer"
            />
            <label
              htmlFor={`tech_${tech.id}`}
              className={
                compact
                  ? "text-[10px] text-[var(--a-ink)] truncate cursor-pointer"
                  : "text-xs text-[var(--a-ink)] cursor-pointer"
              }
            >
              {tech.name}
            </label>
          </div>
        ))}
        {list.length === 0 && (
          <p className="text-xs text-[var(--a-soft)] col-span-full">No skills yet — add one below.</p>
        )}
      </div>

      {/* Inline add row. Not a nested <form> — this sits inside the page's form,
          so it uses a click handler and Enter-to-submit instead. */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void addSkill();
            }
          }}
          disabled={busy}
          placeholder="Add a skill…"
          aria-label="Add a skill"
          className="flex-1 min-w-0 px-2.5 py-1.5 text-xs border border-solid border-[var(--a-line)] rounded bg-[var(--a-surface)] text-[var(--a-ink)] focus-visible:outline-[var(--a-primary)]"
        />
        <button
          type="button"
          onClick={() => void addSkill()}
          disabled={busy || !draft.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border-none bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white transition-colors disabled:opacity-50 cursor-pointer shrink-0"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          Add
        </button>
      </div>

      {note && (
        <p
          role={note.kind === "error" ? "alert" : "status"}
          className={`text-[11px] ${note.kind === "error" ? "text-[var(--a-danger)]" : "text-[var(--a-soft)]"}`}
        >
          {note.text}
        </p>
      )}
    </div>
  );
}
