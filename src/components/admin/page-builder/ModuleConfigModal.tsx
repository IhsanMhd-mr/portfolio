"use client";

import { useState } from "react";
import { X, ChevronDown, ChevronRight } from "lucide-react";
import { dbEnumToRegistryKey, sectionConfigSchema, sectionMeta, type ConfigField } from "@/components/sections/registry";
import { useBackdropDismiss } from "@/lib/use-backdrop-dismiss";

export interface ModuleData {
  id: string;
  type: string;
  internalLabel: string;
  groupId: string | null;
  visible: boolean;
  settings: Record<string, any>;
  animationPresetSlug: string;
  animationDelay: number;
  animationStagger: number;
}

interface ModuleConfigModalProps {
  module: ModuleData;
  groups: { id: string; title: string }[];
  onCancel: () => void;
  onSave: (patch: {
    internalLabel: string;
    visible: boolean;
    settings: Record<string, any>;
    animationPresetSlug: string;
    animationDelay: number;
    animationStagger: number;
  }) => Promise<{ success: boolean; error?: string }>;
  onMoveToGroup: (targetGroupId: string | null) => Promise<{ success: boolean; error?: string }>;
}

const inputCls =
  "w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-surface)] focus:outline-none focus:border-[var(--a-primary)]";

export default function ModuleConfigModal({ module, groups, onCancel, onSave, onMoveToGroup }: ModuleConfigModalProps) {
  const registryKey = dbEnumToRegistryKey[module.type];
  const schema: ConfigField[] = sectionConfigSchema[registryKey] || [];
  const meta = sectionMeta[module.type];
  const backdrop = useBackdropDismiss(onCancel);

  const [internalLabel, setInternalLabel] = useState(module.internalLabel);
  const [visible, setVisible] = useState(module.visible);
  const [animationPresetSlug, setAnimationPresetSlug] = useState(module.animationPresetSlug);
  const [animationDelay, setAnimationDelay] = useState(module.animationDelay);
  const [animationStagger, setAnimationStagger] = useState(module.animationStagger);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    for (const f of schema) initial[f.key] = module.settings?.[f.key] ?? "";
    return initial;
  });
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedJson, setAdvancedJson] = useState(() => JSON.stringify(module.settings || {}, null, 2));
  const [advancedError, setAdvancedError] = useState<string | null>(null);

  const [groupTarget, setGroupTarget] = useState(module.groupId ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let settings: Record<string, any>;
    if (advancedOpen) {
      try {
        settings = JSON.parse(advancedJson);
      } catch {
        setAdvancedError("Invalid JSON — fix it or switch back to the form fields.");
        return;
      }
    } else {
      settings = { ...module.settings };
      for (const f of schema) {
        if (fieldValues[f.key] === "" || fieldValues[f.key] === undefined) {
          delete settings[f.key];
        } else {
          settings[f.key] = f.type === "number" ? Number(fieldValues[f.key]) : fieldValues[f.key];
        }
      }
    }

    setIsSaving(true);
    const targetGroupId = groupTarget || null;
    if (targetGroupId !== (module.groupId ?? null)) {
      const moveResult = await onMoveToGroup(targetGroupId);
      if (!moveResult.success) {
        setError(moveResult.error || "Failed to move module.");
        setIsSaving(false);
        return;
      }
    }

    const result = await onSave({ internalLabel, visible, settings, animationPresetSlug, animationDelay, animationStagger });
    setIsSaving(false);
    if (!result.success) setError(result.error || "Failed to save.");
  }

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" {...backdrop} role="dialog" aria-modal="true">
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 bg-[var(--a-surface)] border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] shadow-lg space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-[var(--a-ink)]">Configure Module</h3>
            <p className="text-[10px] font-mono text-[var(--a-faint)] uppercase mt-0.5">{meta?.label || module.type}</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close" className="p-1 text-[var(--a-soft)] hover:text-[var(--a-ink)] cursor-pointer border-none bg-transparent">
            <X size={16} />
          </button>
        </div>

        {error && <div role="alert" className="text-xs text-[var(--a-danger)] bg-[var(--a-danger-bg)] border border-solid border-[var(--a-danger-ink)]/20 rounded-[var(--a-r-sm)] px-3 py-2">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Admin Label</label>
            <input type="text" required value={internalLabel} onChange={(e) => setInternalLabel(e.target.value)} className={inputCls} />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="mod-visible" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="cursor-pointer" />
            <label htmlFor="mod-visible" className="text-xs text-[var(--a-ink)] cursor-pointer">Visible on public site</label>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Group</label>
            <select value={groupTarget} onChange={(e) => setGroupTarget(e.target.value)} className={inputCls}>
              <option value="">-- Ungrouped --</option>
              {groups.map((g) => (<option key={g.id} value={g.id}>{g.title}</option>))}
            </select>
          </div>

          {schema.length > 0 && !advancedOpen && (
            <div className="space-y-4 pt-3 border-t border-solid border-[var(--a-line)]">
              <h4 className="text-[10px] font-mono text-[var(--a-soft)] uppercase tracking-wider">// Content Settings</h4>
              {schema.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">{f.label}</label>
                  {f.type === "textarea" ? (
                    <textarea rows={2} value={fieldValues[f.key] || ""} onChange={(e) => setFieldValues({ ...fieldValues, [f.key]: e.target.value })} className={`${inputCls} resize-y`} placeholder={f.placeholder} />
                  ) : f.type === "select" ? (
                    <select value={fieldValues[f.key] || ""} onChange={(e) => setFieldValues({ ...fieldValues, [f.key]: e.target.value })} className={inputCls}>
                      <option value="">-- Default --</option>
                      {f.options?.map((o) => (<option key={o} value={o}>{o}</option>))}
                    </select>
                  ) : (
                    <input type={f.type === "number" ? "number" : "text"} value={fieldValues[f.key] || ""} onChange={(e) => setFieldValues({ ...fieldValues, [f.key]: e.target.value })} className={inputCls} placeholder={f.placeholder} />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-solid border-[var(--a-line)]">
            <button type="button" onClick={() => setAdvancedOpen((v) => !v)} className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--a-soft)] uppercase hover:text-[var(--a-ink)] cursor-pointer border-none bg-transparent">
              {advancedOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              Advanced (raw JSON settings)
            </button>
            {advancedOpen && (
              <div className="mt-3 space-y-1.5">
                <textarea
                  rows={6}
                  value={advancedJson}
                  onChange={(e) => { setAdvancedJson(e.target.value); setAdvancedError(null); }}
                  className={`${inputCls} font-mono text-[10px] resize-y`}
                />
                {advancedError && <p className="text-[10px] text-[var(--a-danger)]">{advancedError}</p>}
                <p className="text-[10px] text-[var(--a-faint)]">Covers fields not exposed above (e.g. selected-item lists). Takes priority over the form fields when open.</p>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-3 border-t border-solid border-[var(--a-line)]">
            <h4 className="text-[10px] font-mono text-[var(--a-soft)] uppercase tracking-wider">// Animation</h4>
            <select value={animationPresetSlug} onChange={(e) => setAnimationPresetSlug(e.target.value)} className={inputCls}>
              <option value="fade-in">Fade In</option>
              <option value="slide-up">Slide Up</option>
              <option value="reveal-left">Reveal Left</option>
              <option value="zoom-in">Zoom In</option>
              <option value="magnetic">Magnetic Float</option>
            </select>
            <div className="grid gap-3 grid-cols-2">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Delay (s)</label>
                <input type="number" step="0.05" min="0" value={animationDelay} onChange={(e) => setAnimationDelay(parseFloat(e.target.value) || 0)} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Stagger (s)</label>
                <input type="number" step="0.01" min="0" value={animationStagger} onChange={(e) => setAnimationStagger(parseFloat(e.target.value) || 0)} className={inputCls} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onCancel} disabled={isSaving} className="px-4 py-2 text-xs font-semibold rounded-[var(--a-r-sm)] border border-solid border-[var(--a-line)] text-[var(--a-soft)] bg-transparent cursor-pointer disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 text-xs font-semibold rounded-[var(--a-r-sm)] bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white border-none cursor-pointer disabled:opacity-50">
              {isSaving ? "Saving..." : "Save Module"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
