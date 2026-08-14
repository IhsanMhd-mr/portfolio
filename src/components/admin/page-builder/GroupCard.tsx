"use client";

import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ArrowUp, ArrowDown, Eye, EyeOff, Pencil, Trash2, Plus } from "lucide-react";
import ModuleRow from "./ModuleRow";
import type { ModuleData } from "./ModuleConfigModal";

export interface GroupData {
  id: string;
  title: string;
  subtitle: string | null;
  visible: boolean;
  sections: ModuleData[];
}

interface GroupCardProps {
  group: GroupData;
  containerKey: string;
  isFirst: boolean;
  isLast: boolean;
  busyModuleId: string | null;
  onMoveGroup: (id: string, direction: "up" | "down") => void;
  onEditGroup: (group: GroupData) => void;
  onDeleteGroup: (group: GroupData) => void;
  onAddModule: (containerKey: string) => void;
  onMoveModule: (containerKey: string, id: string, direction: "up" | "down") => void;
  onToggleModuleVisible: (module: ModuleData) => void;
  onConfigureModule: (module: ModuleData) => void;
  onDeleteModule: (module: ModuleData) => void;
}

/** Also renders the "Ungrouped" pseudo-group when group.id === "ungrouped" (not sortable/deletable/editable). */
export default function GroupCard({
  group,
  containerKey,
  isFirst,
  isLast,
  busyModuleId,
  onMoveGroup,
  onEditGroup,
  onDeleteGroup,
  onAddModule,
  onMoveModule,
  onToggleModuleVisible,
  onConfigureModule,
  onDeleteModule,
}: GroupCardProps) {
  const isUngrouped = group.id === "ungrouped";

  const sortable = useSortable({ id: group.id, data: { type: "group" }, disabled: isUngrouped });
  const { setNodeRef: setDroppableRef } = useDroppable({ id: containerKey, data: { type: "container" } });

  const style: React.CSSProperties = isUngrouped
    ? {}
    : {
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: sortable.isDragging ? 0.5 : 1,
      };

  return (
    <div
      ref={isUngrouped ? undefined : sortable.setNodeRef}
      className="border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] overflow-hidden"
      style={{ ...style, boxShadow: "var(--a-shadow)" }}
    >
      <div className="flex items-center gap-2 p-4 border-b border-solid border-[var(--a-line)]" style={{ opacity: group.visible ? 1 : 0.6 }}>
        {!isUngrouped && (
          <button type="button" {...sortable.attributes} {...sortable.listeners} aria-label={`Drag to reorder group ${group.title}`} className="p-1 text-[var(--a-faint)] hover:text-[var(--a-soft)] cursor-grab active:cursor-grabbing border-none bg-transparent touch-none">
            <GripVertical size={16} />
          </button>
        )}
        {!isUngrouped && (
          <div className="flex flex-col">
            <button type="button" onClick={() => onMoveGroup(group.id, "up")} disabled={isFirst} aria-label={`Move group ${group.title} up`} className="p-0.5 text-[var(--a-faint)] hover:text-[var(--a-ink)] disabled:opacity-30 border-none bg-transparent cursor-pointer">
              <ArrowUp size={12} />
            </button>
            <button type="button" onClick={() => onMoveGroup(group.id, "down")} disabled={isLast} aria-label={`Move group ${group.title} down`} className="p-0.5 text-[var(--a-faint)] hover:text-[var(--a-ink)] disabled:opacity-30 border-none bg-transparent cursor-pointer">
              <ArrowDown size={12} />
            </button>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-[var(--a-ink)]">{group.title}</h3>
          {group.subtitle && <p className="text-[11px] text-[var(--a-soft)] mt-0.5">{group.subtitle}</p>}
          {isUngrouped && <p className="text-[10px] font-mono text-[var(--a-faint)] uppercase mt-0.5">Not shown as a visual section — organizational only</p>}
        </div>

        {!isUngrouped && (
          <>
            <button type="button" onClick={() => onEditGroup(group)} aria-label={group.visible ? `Hide group ${group.title}` : `Show group ${group.title}`} title={group.visible ? "Visible" : "Hidden"} className="p-1.5 text-[var(--a-soft)] hover:text-[var(--a-ink)] border-none bg-transparent cursor-pointer">
              {group.visible ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
            <button type="button" onClick={() => onEditGroup(group)} aria-label={`Edit group ${group.title}`} className="p-1.5 text-[var(--a-soft)] hover:text-[var(--a-primary)] border-none bg-transparent cursor-pointer">
              <Pencil size={15} />
            </button>
            <button type="button" onClick={() => onDeleteGroup(group)} aria-label={`Delete group ${group.title}`} className="p-1.5 text-[var(--a-soft)] hover:text-[var(--a-danger)] border-none bg-transparent cursor-pointer">
              <Trash2 size={15} />
            </button>
          </>
        )}
      </div>

      <div ref={setDroppableRef} className="p-4 space-y-2 min-h-[64px]">
        <SortableContext items={group.sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {group.sections.map((mod, index) => (
            <ModuleRow
              key={mod.id}
              module={mod}
              isFirst={index === 0}
              isLast={index === group.sections.length - 1}
              busy={busyModuleId === mod.id}
              onMove={(id, dir) => onMoveModule(containerKey, id, dir)}
              onToggleVisible={onToggleModuleVisible}
              onConfigure={onConfigureModule}
              onDelete={onDeleteModule}
            />
          ))}
        </SortableContext>
        {group.sections.length === 0 && (
          <p className="text-center text-[10px] font-mono text-[var(--a-faint)] uppercase py-4 border border-dashed border-[var(--a-line)] rounded-[var(--a-r-sm)]">
            Drop a module here, or add one below
          </p>
        )}
        <button type="button" onClick={() => onAddModule(containerKey)} className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-semibold text-[var(--a-primary)] border border-dashed border-[var(--a-line)] hover:border-[var(--a-primary)] rounded-[var(--a-r-sm)] cursor-pointer bg-transparent">
          <Plus size={13} /> Add module
        </button>
      </div>
    </div>
  );
}
