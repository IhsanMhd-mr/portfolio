"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import GroupCard, { type GroupData } from "./GroupCard";
import AddModuleModal from "./AddModuleModal";
import ModuleConfigModal, { type ModuleData } from "./ModuleConfigModal";
import {
  createGroupAction,
  updateGroupAction,
  deleteGroupAction,
  reorderGroupsAction,
  createModuleAction,
  updateModuleAction,
  deleteModuleAction,
  reorderModulesAction,
  assignModuleToGroupAction,
} from "@/app/admin/page-builder/actions";
import { useBackdropDismiss } from "@/lib/use-backdrop-dismiss";

const UNGROUPED_KEY = "ungrouped";
const containerKeyOf = (groupId: string | null) => (groupId ? `group:${groupId}` : UNGROUPED_KEY);
const groupIdFromKey = (key: string): string | null => (key === UNGROUPED_KEY ? null : key.replace(/^group:/, ""));

interface PageBuilderBoardProps {
  initialGroups: GroupData[];
  initialUngrouped: ModuleData[];
}

export default function PageBuilderBoard({ initialGroups, initialUngrouped }: PageBuilderBoardProps) {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupData[]>(initialGroups);
  const [ungrouped, setUngrouped] = useState<ModuleData[]>(initialUngrouped);
  const [busyModuleId, setBusyModuleId] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [groupSubtitle, setGroupSubtitle] = useState("");

  const [addModuleTarget, setAddModuleTarget] = useState<string | null>(null); // containerKey
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [configuringModule, setConfiguringModule] = useState<ModuleData | null>(null);
  const [editingGroup, setEditingGroup] = useState<GroupData | null>(null);
  const [pendingDeleteGroup, setPendingDeleteGroup] = useState<GroupData | null>(null);
  const [pendingDeleteModule, setPendingDeleteModule] = useState<ModuleData | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Tracks which container a module drag started in. Must be a ref (not a
  // plain variable) because onDragOver live-moves items between local state
  // arrays mid-drag, which re-renders this component — a plain object would
  // be recreated on that re-render and lose the value set in onDragStart.
  const dragOriginRef = useRef<string | null>(null);

  function reportFailure(error?: string) {
    setGlobalError(error || "Something went wrong.");
    router.refresh(); // resync with server truth after any failed mutation
  }

  // ─── Containers helpers ─────────────────────────────────────────────────

  function findContainerKey(moduleId: string): string | null {
    if (ungrouped.some((m) => m.id === moduleId)) return UNGROUPED_KEY;
    for (const g of groups) {
      if (g.sections.some((m) => m.id === moduleId)) return containerKeyOf(g.id);
    }
    return null;
  }

  function getContainerItems(containerKey: string): ModuleData[] {
    if (containerKey === UNGROUPED_KEY) return ungrouped;
    const g = groups.find((g) => containerKeyOf(g.id) === containerKey);
    return g?.sections || [];
  }

  function setContainerItems(containerKey: string, items: ModuleData[]) {
    if (containerKey === UNGROUPED_KEY) {
      setUngrouped(items);
    } else {
      const groupId = groupIdFromKey(containerKey);
      setGroups((gs) => gs.map((g) => (g.id === groupId ? { ...g, sections: items } : g)));
    }
  }

  // ─── Drag handling (groups + modules, multi-container) ────────────────────

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || active.data.current?.type !== "module") return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const sourceKey = findContainerKey(activeId);
    if (!sourceKey) return;

    // over.id is either a module id (hovering an item) or a container key (hovering empty space)
    const overContainerKey =
      over.data.current?.type === "module" ? findContainerKey(overId) : overId;
    if (!overContainerKey || overContainerKey === sourceKey) return;

    // Live-move the item into the destination container for visual feedback.
    const sourceItems = getContainerItems(sourceKey);
    const destItems = getContainerItems(overContainerKey);
    const activeItem = sourceItems.find((m) => m.id === activeId);
    if (!activeItem) return;

    const overIndex = destItems.findIndex((m) => m.id === overId);
    const insertAt = overIndex >= 0 ? overIndex : destItems.length;

    setContainerItems(sourceKey, sourceItems.filter((m) => m.id !== activeId));
    setContainerItems(overContainerKey, [
      ...destItems.slice(0, insertAt),
      { ...activeItem, groupId: groupIdFromKey(overContainerKey) },
      ...destItems.slice(insertAt),
    ]);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    if (active.data.current?.type === "group") {
      if (active.id === over.id) return;
      const oldIndex = groups.findIndex((g) => g.id === active.id);
      const newIndex = groups.findIndex((g) => g.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(groups, oldIndex, newIndex);
      setGroups(reordered);
      const result = await reorderGroupsAction(reordered.map((g) => g.id));
      if (!result.success) reportFailure(result.error);
      return;
    }

    // Module: onDragOver already moved it to the right container locally.
    // Now fix its exact index within that container, then persist.
    const activeId = String(active.id);
    const finalKey = findContainerKey(activeId);
    if (!finalKey) return;

    const items = getContainerItems(finalKey);
    const oldIndex = items.findIndex((m) => m.id === activeId);
    const overId = String(over.id);
    const overIndex = items.findIndex((m) => m.id === overId);
    const finalItems = overIndex >= 0 && overIndex !== oldIndex ? arrayMove(items, oldIndex, overIndex) : items;
    setContainerItems(finalKey, finalItems);

    setBusyModuleId(activeId);
    const finalGroupId = groupIdFromKey(finalKey);

    // dragOriginRef was captured in onDragStart, before onDragOver had a
    // chance to move the item — so this correctly tells "moved to a
    // different container" apart from "just reordered in place".
    const moved = finalKey !== dragOriginRef.current;
    if (moved) {
      const assignResult = await assignModuleToGroupAction({ sectionId: activeId, targetGroupId: finalGroupId });
      if (!assignResult.success) {
        setBusyModuleId(null);
        reportFailure(assignResult.error);
        return;
      }
    }
    const orderResult = await reorderModulesAction({ groupId: finalGroupId, orderedSectionIds: finalItems.map((m) => m.id) });
    setBusyModuleId(null);
    dragOriginRef.current = null;
    if (!orderResult.success) reportFailure(orderResult.error);
  }

  function handleDragStart(event: { active: { id: string | number; data: { current?: any } } }) {
    if (event.active.data.current?.type === "module") {
      dragOriginRef.current = findContainerKey(String(event.active.id));
    }
  }

  // ─── Keyboard-accessible fallback reorder ─────────────────────────────────

  async function handleMoveGroup(id: string, direction: "up" | "down") {
    const index = groups.findIndex((g) => g.id === id);
    if (index === -1) return;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= groups.length) return;
    const reordered = arrayMove(groups, index, target);
    setGroups(reordered);
    const result = await reorderGroupsAction(reordered.map((g) => g.id));
    if (!result.success) reportFailure(result.error);
  }

  async function handleMoveModule(containerKey: string, id: string, direction: "up" | "down") {
    const items = getContainerItems(containerKey);
    const index = items.findIndex((m) => m.id === id);
    if (index === -1) return;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;
    const reordered = arrayMove(items, index, target);
    setContainerItems(containerKey, reordered);
    setBusyModuleId(id);
    const result = await reorderModulesAction({ groupId: groupIdFromKey(containerKey), orderedSectionIds: reordered.map((m) => m.id) });
    setBusyModuleId(null);
    if (!result.success) reportFailure(result.error);
  }

  // ─── Group CRUD ───────────────────────────────────────────────────────────

  async function handleAddGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!groupTitle.trim()) return;
    const result = await createGroupAction({ title: groupTitle.trim(), subtitle: groupSubtitle.trim() || null });
    if (result.success) {
      setGroups((gs) => [...gs, { ...result.data, sections: [] }]);
      setGroupTitle("");
      setGroupSubtitle("");
      setAddGroupOpen(false);
    } else {
      setGlobalError(result.error);
    }
  }

  async function handleSaveGroup(patch: { title: string; subtitle: string | null; visible: boolean }) {
    if (!editingGroup) return { success: false, error: "No group selected." };
    const result = await updateGroupAction(editingGroup.id, patch);
    if (result.success) {
      setGroups((gs) => gs.map((g) => (g.id === editingGroup.id ? { ...g, ...patch } : g)));
      setEditingGroup(null);
    }
    return result;
  }

  async function confirmDeleteGroup() {
    if (!pendingDeleteGroup) return;
    const target = pendingDeleteGroup;
    setPendingDeleteGroup(null);
    const result = await deleteGroupAction(target.id);
    if (result.success) {
      setUngrouped((u) => [...u, ...target.sections.map((s) => ({ ...s, groupId: null }))]);
      setGroups((gs) => gs.filter((g) => g.id !== target.id));
    } else {
      reportFailure(result.error);
    }
  }

  // ─── Module CRUD ──────────────────────────────────────────────────────────

  async function handleAddModule(type: string) {
    if (!addModuleTarget) return;
    setIsAddingModule(true);
    const groupId = groupIdFromKey(addModuleTarget);
    const result = await createModuleAction({ type, groupId });
    setIsAddingModule(false);
    if (result.success) {
      const mod: ModuleData = {
        id: result.data.id, type: result.data.type, internalLabel: result.data.internalLabel,
        groupId: result.data.groupId, visible: result.data.visible,
        settings: result.data.settings || {}, animationPresetSlug: result.data.animationPresetSlug || "fade-in",
        animationDelay: result.data.animationDelay ?? 0, animationStagger: result.data.animationStagger ?? 0.08,
      };
      setContainerItems(addModuleTarget, [...getContainerItems(addModuleTarget), mod]);
      setAddModuleTarget(null);
    } else {
      setGlobalError(result.error);
    }
  }

  async function handleToggleModuleVisible(module: ModuleData) {
    setBusyModuleId(module.id);
    const result = await updateModuleAction(module.id, { visible: !module.visible });
    setBusyModuleId(null);
    if (result.success) {
      const key = containerKeyOf(module.groupId);
      setContainerItems(key, getContainerItems(key).map((m) => (m.id === module.id ? { ...m, visible: !module.visible } : m)));
    } else {
      reportFailure(result.error);
    }
  }

  async function handleSaveModule(patch: any) {
    if (!configuringModule) return { success: false, error: "No module selected." };
    const result = await updateModuleAction(configuringModule.id, patch);
    if (result.success) {
      router.refresh(); // group/settings may have changed together with the move — resync cleanly
      setConfiguringModule(null);
    }
    return result;
  }

  async function handleMoveModuleToGroup(targetGroupId: string | null) {
    if (!configuringModule) return { success: false, error: "No module selected." };
    return assignModuleToGroupAction({ sectionId: configuringModule.id, targetGroupId });
  }

  async function confirmDeleteModule() {
    if (!pendingDeleteModule) return;
    const target = pendingDeleteModule;
    setPendingDeleteModule(null);
    const key = containerKeyOf(target.groupId);
    setContainerItems(key, getContainerItems(key).filter((m) => m.id !== target.id));
    const result = await deleteModuleAction(target.id);
    if (!result.success) reportFailure(result.error);
  }

  const groupOptionsForModal = groups.map((g) => ({ id: g.id, title: g.title }));

  return (
    <div className="space-y-4">
      {globalError && (
        <div role="alert" className="text-xs text-[var(--a-danger)] bg-[var(--a-danger-bg)] border border-solid border-[var(--a-danger-ink)]/20 rounded-[var(--a-r-sm)] px-3 py-2 flex items-center justify-between">
          <span>{globalError}</span>
          <button type="button" onClick={() => setGlobalError(null)} className="text-[var(--a-danger)] border-none bg-transparent cursor-pointer text-xs font-bold">×</button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <SortableContext items={groups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {groups.map((group, index) => (
              <GroupCard
                key={group.id}
                group={group}
                containerKey={containerKeyOf(group.id)}
                isFirst={index === 0}
                isLast={index === groups.length - 1}
                busyModuleId={busyModuleId}
                onMoveGroup={handleMoveGroup}
                onEditGroup={setEditingGroup}
                onDeleteGroup={setPendingDeleteGroup}
                onAddModule={setAddModuleTarget}
                onMoveModule={handleMoveModule}
                onToggleModuleVisible={handleToggleModuleVisible}
                onConfigureModule={setConfiguringModule}
                onDeleteModule={setPendingDeleteModule}
              />
            ))}
          </div>
        </SortableContext>

        {/* Ungrouped bucket — always present, not sortable/deletable itself */}
        <GroupCard
          group={{ id: "ungrouped", title: "Ungrouped", subtitle: null, visible: true, sections: ungrouped }}
          containerKey={UNGROUPED_KEY}
          isFirst
          isLast
          busyModuleId={busyModuleId}
          onMoveGroup={() => {}}
          onEditGroup={() => {}}
          onDeleteGroup={() => {}}
          onAddModule={setAddModuleTarget}
          onMoveModule={handleMoveModule}
          onToggleModuleVisible={handleToggleModuleVisible}
          onConfigureModule={setConfiguringModule}
          onDeleteModule={setPendingDeleteModule}
        />
      </DndContext>

      {/* Add group */}
      {addGroupOpen ? (
        <form onSubmit={handleAddGroup} className="p-4 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-3">
          <input autoFocus type="text" required placeholder="Group title (e.g. About)" value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)}
            className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-surface)] focus:outline-none focus:border-[var(--a-primary)]" />
          <input type="text" placeholder="Subtitle (optional)" value={groupSubtitle} onChange={(e) => setGroupSubtitle(e.target.value)}
            className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-surface)] focus:outline-none focus:border-[var(--a-primary)]" />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setAddGroupOpen(false)} className="px-3 py-1.5 text-xs font-semibold rounded-[var(--a-r-sm)] border border-solid border-[var(--a-line)] text-[var(--a-soft)] bg-transparent cursor-pointer">Cancel</button>
            <button type="submit" className="px-3 py-1.5 text-xs font-semibold rounded-[var(--a-r-sm)] bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white border-none cursor-pointer">Create Group</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setAddGroupOpen(true)} className="flex items-center justify-center gap-1.5 w-full py-3 text-xs font-semibold text-[var(--a-primary)] border border-dashed border-[var(--a-line)] hover:border-[var(--a-primary)] rounded-[var(--a-r-md)] cursor-pointer bg-transparent">
          <Plus size={14} /> Add section group
        </button>
      )}

      {/* Modals */}
      {addModuleTarget && (
        <AddModuleModal onCancel={() => setAddModuleTarget(null)} onAdd={handleAddModule} isAdding={isAddingModule} />
      )}

      {configuringModule && (
        <ModuleConfigModal
          module={configuringModule}
          groups={groupOptionsForModal}
          onCancel={() => setConfiguringModule(null)}
          onSave={handleSaveModule}
          onMoveToGroup={handleMoveModuleToGroup}
        />
      )}

      {editingGroup && (
        <GroupEditModal group={editingGroup} onCancel={() => setEditingGroup(null)} onSave={handleSaveGroup} />
      )}

      {pendingDeleteGroup && (
        <ConfirmDialog
          title="Delete this group?"
          message={`Its ${pendingDeleteGroup.sections.length} module(s) will move to Ungrouped, not be deleted.`}
          onCancel={() => setPendingDeleteGroup(null)}
          onConfirm={confirmDeleteGroup}
        />
      )}

      {pendingDeleteModule && (
        <ConfirmDialog
          title="Delete this module?"
          message={`This permanently removes "${pendingDeleteModule.internalLabel}" from the homepage.`}
          onCancel={() => setPendingDeleteModule(null)}
          onConfirm={confirmDeleteModule}
        />
      )}
    </div>
  );
}

// ─── Small inline helper components ─────────────────────────────────────────

function GroupEditModal({ group, onCancel, onSave }: { group: GroupData; onCancel: () => void; onSave: (patch: { title: string; subtitle: string | null; visible: boolean }) => Promise<{ success: boolean; error?: string }> }) {
  const [title, setTitle] = useState(group.title);
  const [subtitle, setSubtitle] = useState(group.subtitle || "");
  const [visible, setVisible] = useState(group.visible);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const backdrop = useBackdropDismiss(onCancel);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await onSave({ title, subtitle: subtitle.trim() || null, visible });
    setSaving(false);
    if (!result.success) setError(result.error || "Failed to save.");
  }

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" {...backdrop} role="dialog" aria-modal="true">
      <div className="w-full max-w-sm p-6 bg-[var(--a-surface)] border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] shadow-lg space-y-4">
        <h3 className="font-bold text-sm text-[var(--a-ink)]">Edit Group</h3>
        {error && <div role="alert" className="text-xs text-[var(--a-danger)] bg-[var(--a-danger-bg)] border border-solid border-[var(--a-danger-ink)]/20 rounded-[var(--a-r-sm)] px-3 py-2">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-surface)] focus:outline-none focus:border-[var(--a-primary)]" />
          <input type="text" placeholder="Subtitle (optional)" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-surface)] focus:outline-none focus:border-[var(--a-primary)]" />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="group-visible" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="cursor-pointer" />
            <label htmlFor="group-visible" className="text-xs text-[var(--a-ink)] cursor-pointer">Visible on public site</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onCancel} disabled={saving} className="px-4 py-2 text-xs font-semibold rounded-[var(--a-r-sm)] border border-solid border-[var(--a-line)] text-[var(--a-soft)] bg-transparent cursor-pointer disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-xs font-semibold rounded-[var(--a-r-sm)] bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white border-none cursor-pointer disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDialog({ title, message, onCancel, onConfirm }: { title: string; message: string; onCancel: () => void; onConfirm: () => void }) {
  const backdrop = useBackdropDismiss(onCancel);
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" {...backdrop} role="alertdialog" aria-modal="true">
      <div className="w-full max-w-sm p-6 bg-[var(--a-surface)] border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] shadow-lg space-y-4">
        <h3 className="font-bold text-sm text-[var(--a-ink)]">{title}</h3>
        <p className="text-xs text-[var(--a-soft)]">{message}</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-xs font-semibold rounded-[var(--a-r-sm)] border border-solid border-[var(--a-line)] text-[var(--a-soft)] bg-transparent cursor-pointer">Cancel</button>
          <button type="button" onClick={onConfirm} className="px-4 py-2 text-xs font-semibold rounded-[var(--a-r-sm)] bg-[var(--a-danger)] hover:opacity-90 text-white border-none cursor-pointer">Delete</button>
        </div>
      </div>
    </div>
  );
}
