"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { getPlatformMeta } from "@/lib/social-platforms";

export interface SocialHandleRowData {
  id: string;
  platform: string;
  label: string | null;
  url: string;
  visible: boolean;
}

interface SortableHandleRowProps {
  handle: SocialHandleRowData;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  onToggleVisible: (id: string, next: boolean) => void;
  onEdit: (handle: SocialHandleRowData) => void;
  onDelete: (handle: SocialHandleRowData) => void;
  onMove: (id: string, direction: "up" | "down") => void;
}

export default function SortableHandleRow({
  handle,
  isFirst,
  isLast,
  busy,
  onToggleVisible,
  onEdit,
  onDelete,
  onMove,
}: SortableHandleRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: handle.id });
  const meta = getPlatformMeta(handle.platform);
  const Icon = meta.icon;
  const displayName = handle.platform === "custom" ? handle.label || "Custom" : meta.label;
  const displayUrl = handle.url.replace(/^mailto:/, "");

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : busy ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] bg-[var(--a-surface)]"
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${displayName}`}
        className="p-1 text-[var(--a-faint)] hover:text-[var(--a-soft)] cursor-grab active:cursor-grabbing border-none bg-transparent touch-none"
      >
        <GripVertical size={16} />
      </button>

      {/* Keyboard-accessible reorder fallback */}
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => onMove(handle.id, "up")}
          disabled={isFirst || busy}
          aria-label={`Move ${displayName} up`}
          className="p-0.5 text-[var(--a-faint)] hover:text-[var(--a-ink)] disabled:opacity-30 border-none bg-transparent cursor-pointer"
        >
          <ArrowUp size={12} />
        </button>
        <button
          type="button"
          onClick={() => onMove(handle.id, "down")}
          disabled={isLast || busy}
          aria-label={`Move ${displayName} down`}
          className="p-0.5 text-[var(--a-faint)] hover:text-[var(--a-ink)] disabled:opacity-30 border-none bg-transparent cursor-pointer"
        >
          <ArrowDown size={12} />
        </button>
      </div>

      <span className="flex items-center justify-center w-8 h-8 rounded-[var(--a-r-sm)] border border-solid border-[var(--a-line)] shrink-0" style={{ color: "var(--a-primary)" }}>
        <Icon size={16} />
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[var(--a-ink)]">{displayName}</p>
        <p className="text-[10px] text-[var(--a-soft)] truncate" title={displayUrl}>
          {displayUrl}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onToggleVisible(handle.id, !handle.visible)}
        disabled={busy}
        aria-label={handle.visible ? `Hide ${displayName}` : `Show ${displayName}`}
        title={handle.visible ? "Visible on public site" : "Hidden from public site"}
        className="p-1.5 text-[var(--a-soft)] hover:text-[var(--a-ink)] border-none bg-transparent cursor-pointer disabled:opacity-50"
      >
        {handle.visible ? <Eye size={16} /> : <EyeOff size={16} />}
      </button>

      <button
        type="button"
        onClick={() => onEdit(handle)}
        disabled={busy}
        aria-label={`Edit ${displayName}`}
        className="p-1.5 text-[var(--a-soft)] hover:text-[var(--a-primary)] border-none bg-transparent cursor-pointer disabled:opacity-50"
      >
        <Pencil size={16} />
      </button>

      <button
        type="button"
        onClick={() => onDelete(handle)}
        disabled={busy}
        aria-label={`Delete ${displayName}`}
        className="p-1.5 text-[var(--a-soft)] hover:text-[var(--a-danger)] border-none bg-transparent cursor-pointer disabled:opacity-50"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
