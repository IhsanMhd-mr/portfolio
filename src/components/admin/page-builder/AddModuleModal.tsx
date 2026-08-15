"use client";

import { X, Plus } from "lucide-react";
import { sectionMeta } from "@/components/sections/registry";
import { useBackdropDismiss } from "@/lib/use-backdrop-dismiss";

interface AddModuleModalProps {
  onCancel: () => void;
  onAdd: (type: string) => void;
  isAdding: boolean;
}

export default function AddModuleModal({ onCancel, onAdd, isAdding }: AddModuleModalProps) {
  const types = Object.entries(sectionMeta);
  const backdrop = useBackdropDismiss(onCancel);

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" {...backdrop} role="dialog" aria-modal="true">
      <div className="w-full max-w-md max-h-[80vh] overflow-y-auto p-6 bg-[var(--a-surface)] border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-[var(--a-ink)]">Add Module</h3>
          <button type="button" onClick={onCancel} aria-label="Close" className="p-1 text-[var(--a-soft)] hover:text-[var(--a-ink)] cursor-pointer border-none bg-transparent">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-2">
          {types.map(([type, meta]) => (
            <button
              key={type}
              type="button"
              disabled={isAdding}
              onClick={() => onAdd(type)}
              className="flex items-center justify-between w-full p-3 text-left border border-solid border-dashed border-[var(--a-line)] rounded-[var(--a-r-sm)] bg-[var(--a-surface)] hover:border-[var(--a-primary)] transition-all cursor-pointer disabled:opacity-50"
            >
              <span>
                <span className="block text-xs font-semibold text-[var(--a-ink)]">{meta.label}</span>
                <span className="block text-[10px] text-[var(--a-soft)] mt-0.5">{meta.description}</span>
              </span>
              <Plus size={14} className="text-[var(--a-primary)] shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
