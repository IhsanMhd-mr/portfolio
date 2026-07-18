"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Plus, Link2 } from "lucide-react";
import SortableHandleRow, { type SocialHandleRowData } from "./SortableHandleRow";
import SocialHandleModal, { type SocialHandleFormValue } from "./SocialHandleModal";
import {
  createSocialHandle,
  updateSocialHandle,
  deleteSocialHandle,
  toggleSocialHandleVisibility,
  reorderSocialHandles,
} from "@/app/admin/profile/actions";

interface SocialHandlesManagerProps {
  initialHandles: SocialHandleRowData[];
}

export default function SocialHandlesManager({ initialHandles }: SocialHandlesManagerProps) {
  const [handles, setHandles] = useState<SocialHandleRowData[]>(initialHandles);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHandle, setEditingHandle] = useState<SocialHandleRowData | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SocialHandleRowData | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function persistOrder(next: SocialHandleRowData[]) {
    const previous = handles;
    setHandles(next); // optimistic
    const result = await reorderSocialHandles(next.map((h) => h.id));
    if (!result.success) {
      setHandles(previous); // rollback
      setGlobalError(result.error);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = handles.findIndex((h) => h.id === active.id);
    const newIndex = handles.findIndex((h) => h.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    persistOrder(arrayMove(handles, oldIndex, newIndex));
  }

  function handleMove(id: string, direction: "up" | "down") {
    const index = handles.findIndex((h) => h.id === id);
    if (index === -1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= handles.length) return;
    persistOrder(arrayMove(handles, index, targetIndex));
  }

  async function handleToggleVisible(id: string, next: boolean) {
    const previous = handles;
    setHandles((hs) => hs.map((h) => (h.id === id ? { ...h, visible: next } : h)));
    setBusyId(id);
    const result = await toggleSocialHandleVisibility(id, next);
    setBusyId(null);
    if (!result.success) {
      setHandles(previous);
      setGlobalError(result.error);
    }
  }

  function openAddModal() {
    setEditingHandle(null);
    setModalOpen(true);
  }

  function openEditModal(handle: SocialHandleRowData) {
    setEditingHandle(handle);
    setModalOpen(true);
  }

  async function handleModalSubmit(value: SocialHandleFormValue) {
    const payload = { platform: value.platform, label: value.label || null, url: value.url, iconKey: null };

    if (editingHandle) {
      const result = await updateSocialHandle(editingHandle.id, payload);
      if (result.success) {
        setHandles((hs) => hs.map((h) => (h.id === editingHandle.id ? result.data : h)));
        setModalOpen(false);
      }
      return result;
    }

    const result = await createSocialHandle(payload);
    if (result.success) {
      setHandles((hs) => [...hs, result.data]);
      setModalOpen(false);
    }
    return result;
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    const previous = handles;
    setHandles((hs) => hs.filter((h) => h.id !== target.id)); // optimistic
    const result = await deleteSocialHandle(target.id);
    if (!result.success) {
      setHandles(previous); // rollback
      setGlobalError(result.error);
    }
  }

  const existingPlatforms = handles.filter((h) => h.id !== editingHandle?.id).map((h) => h.platform);

  return (
    <div className="p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-4" style={{ boxShadow: "var(--a-shadow)" }}>
      <div className="flex items-center justify-between border-b border-solid border-[var(--a-line)] pb-3">
        <h3 className="font-bold text-sm text-[var(--a-ink)] flex items-center gap-2">
          <Link2 size={16} className="text-[var(--a-primary)]" />
          Social Handles
        </h3>
        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--a-r-sm)] bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white border-none cursor-pointer"
        >
          <Plus size={14} />
          Add Handle
        </button>
      </div>

      {globalError && (
        <div role="alert" className="text-xs text-[var(--a-danger)] bg-red-500/10 border border-solid border-red-500/30 rounded-[var(--a-r-sm)] px-3 py-2">
          {globalError}
        </div>
      )}

      {handles.length === 0 ? (
        <div className="text-center py-10 text-[var(--a-soft)]">
          <Link2 size={28} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">No social handles yet</p>
          <p className="text-xs mt-1 mb-4">Add GitHub, LinkedIn, or any other link to show on your public site.</p>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-[var(--a-r-sm)] bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white border-none cursor-pointer"
          >
            <Plus size={14} />
            Add your first handle
          </button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={handles.map((h) => h.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {handles.map((handle, index) => (
                <SortableHandleRow
                  key={handle.id}
                  handle={handle}
                  isFirst={index === 0}
                  isLast={index === handles.length - 1}
                  busy={busyId === handle.id}
                  onToggleVisible={handleToggleVisible}
                  onEdit={openEditModal}
                  onDelete={setPendingDelete}
                  onMove={handleMove}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {modalOpen && (
        <SocialHandleModal
          initial={editingHandle ? { platform: editingHandle.platform, label: editingHandle.label, url: editingHandle.url } : undefined}
          existingPlatforms={existingPlatforms}
          onCancel={() => setModalOpen(false)}
          onSubmit={handleModalSubmit}
        />
      )}

      {pendingDelete && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setPendingDelete(null)}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm p-6 bg-[var(--a-surface)] border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] shadow-lg space-y-4"
          >
            <h3 id="delete-confirm-title" className="font-bold text-sm text-[var(--a-ink)]">
              Delete this handle?
            </h3>
            <p className="text-xs text-[var(--a-soft)]">
              This will permanently remove the {pendingDelete.platform === "custom" ? pendingDelete.label : pendingDelete.platform} link from your public site.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="px-4 py-2 text-xs font-semibold rounded-[var(--a-r-sm)] border border-solid border-[var(--a-line)] text-[var(--a-soft)] hover:text-[var(--a-ink)] bg-transparent cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-semibold rounded-[var(--a-r-sm)] bg-[var(--a-danger)] hover:opacity-90 text-white border-none cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
