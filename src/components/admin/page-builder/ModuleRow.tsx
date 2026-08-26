"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ArrowUp, ArrowDown, Eye, EyeOff, Settings, Trash2 } from "lucide-react";
import { sectionMetaFor } from "@/components/sections/registry";
import type { ModuleData } from "./ModuleConfigModal";

interface ModuleRowProps {
  module: ModuleData;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  onMove: (id: string, direction: "up" | "down") => void;
  onToggleVisible: (module: ModuleData) => void;
  onConfigure: (module: ModuleData) => void;
  onDelete: (module: ModuleData) => void;
}

export default function ModuleRow({ module, isFirst, isLast, busy, onMove, onToggleVisible, onConfigure, onDelete }: ModuleRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: module.id,
    data: { type: "module", groupId: module.groupId },
  });
  const meta = sectionMetaFor(module.type);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : busy ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-3 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] bg-[var(--a-surface)]">
      <button type="button" {...attributes} {...listeners} aria-label={`Drag to reorder ${module.internalLabel}`} className="p-1 text-[var(--a-faint)] hover:text-[var(--a-soft)] cursor-grab active:cursor-grabbing border-none bg-transparent touch-none">
        <GripVertical size={14} />
      </button>

      <div className="flex flex-col">
        <button type="button" onClick={() => onMove(module.id, "up")} disabled={isFirst || busy} aria-label={`Move ${module.internalLabel} up`} className="p-0.5 text-[var(--a-faint)] hover:text-[var(--a-ink)] disabled:opacity-30 border-none bg-transparent cursor-pointer">
          <ArrowUp size={11} />
        </button>
        <button type="button" onClick={() => onMove(module.id, "down")} disabled={isLast || busy} aria-label={`Move ${module.internalLabel} down`} className="p-0.5 text-[var(--a-faint)] hover:text-[var(--a-ink)] disabled:opacity-30 border-none bg-transparent cursor-pointer">
          <ArrowDown size={11} />
        </button>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[var(--a-ink)] truncate">{module.internalLabel}</p>
        <p className="text-[9px] font-mono text-[var(--a-faint)] uppercase mt-0.5">{meta?.label || module.type}</p>
      </div>

      <button type="button" onClick={() => onToggleVisible(module)} disabled={busy} aria-label={module.visible ? `Hide ${module.internalLabel}` : `Show ${module.internalLabel}`} className="p-1.5 text-[var(--a-soft)] hover:text-[var(--a-ink)] border-none bg-transparent cursor-pointer disabled:opacity-50">
        {module.visible ? <Eye size={14} /> : <EyeOff size={14} className="text-[var(--a-danger)]" />}
      </button>
      <button type="button" onClick={() => onConfigure(module)} disabled={busy} aria-label={`Configure ${module.internalLabel}`} className="p-1.5 text-[var(--a-soft)] hover:text-[var(--a-primary)] border-none bg-transparent cursor-pointer disabled:opacity-50">
        <Settings size={14} />
      </button>
      <button type="button" onClick={() => onDelete(module)} disabled={busy} aria-label={`Delete ${module.internalLabel}`} className="p-1.5 text-[var(--a-soft)] hover:text-[var(--a-danger)] border-none bg-transparent cursor-pointer disabled:opacity-50">
        <Trash2 size={14} />
      </button>
    </div>
  );
}
