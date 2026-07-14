"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown, Settings, Eye, EyeOff, Trash2, Plus, Save, Copy } from "lucide-react";

interface Section {
  id: string;
  type: string;
  internalLabel: string;
  order: number;
  visible: boolean;
  settings: any;
  animationPresetSlug: string;
  animationDelay: number;
  animationStagger: number;
}

const AVAILABLE_COMPONENTS = [
  { type: "HERO", label: "Hero Banner" },
  { type: "ABOUT", label: "About Summary" },
  { type: "TECH_STACK", label: "Technology Stack" },
  { type: "FEATURED_PROJECTS", label: "Featured Projects" },
  { type: "PROJECT_GRID", label: "Project Grid" },
  { type: "PROJECT_TIMELINE", label: "Project Timeline" },
  { type: "EDUCATION", label: "Education Details" },
  { type: "EXPERIENCE", label: "Experience Details" },
  { type: "STACK_GAME", label: "3D Stack Game" },
  { type: "CONTACT", label: "Contact Form Box" },
];

export default function PageBuilderClient({ initialSections }: { initialSections: Section[] }) {
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sync reorder action with Database API
  const persistOrder = async (updatedSections: Section[]) => {
    try {
      setSaveStatus("Saving order...");
      const orderedPayload = updatedSections.map((s, idx) => ({ id: s.id, order: idx + 1 }));
      const response = await fetch("/api/sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reorder: true, sections: orderedPayload }),
      });
      if (response.ok) {
        setSaveStatus("Order saved successfully");
      } else {
        setSaveStatus("Failed to save order");
      }
    } catch (err) {
      console.error(err);
      setSaveStatus("Network error saving order");
    } finally {
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  // Move component up in list
  const moveUp = (index: number) => {
    if (index === 0) return;
    const newSecs = [...sections];
    const temp = newSecs[index];
    newSecs[index] = newSecs[index - 1];
    newSecs[index - 1] = temp;
    
    // Recalculate order indices
    const updated = newSecs.map((s, idx) => ({ ...s, order: idx + 1 }));
    setSections(updated);
    persistOrder(updated);
  };

  // Move component down in list
  const moveDown = (index: number) => {
    if (index === sections.length - 1) return;
    const newSecs = [...sections];
    const temp = newSecs[index];
    newSecs[index] = newSecs[index + 1];
    newSecs[index + 1] = temp;

    const updated = newSecs.map((s, idx) => ({ ...s, order: idx + 1 }));
    setSections(updated);
    persistOrder(updated);
  };

  // Toggle visible attribute
  const toggleVisibility = async (section: Section) => {
    try {
      const nextVisible = !section.visible;
      const updatedList = sections.map((s) => (s.id === section.id ? { ...s, visible: nextVisible } : s));
      setSections(updatedList);
      
      setSaveStatus("Saving visibility...");
      const response = await fetch("/api/sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: section.id, visible: nextVisible }),
      });
      if (response.ok) {
        setSaveStatus("Visibility saved");
        if (selectedSection?.id === section.id) {
          setSelectedSection({ ...selectedSection, visible: nextVisible });
        }
      } else {
        setSaveStatus("Failed to save visibility");
      }
    } catch (err) {
      console.error(err);
      setSaveStatus("Network error saving visibility");
    } finally {
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  // Delete section
  const deleteSection = async (id: string) => {
    if (!confirm("Are you sure you want to delete this section?")) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/sections?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const updatedList = sections.filter((s) => s.id !== id).map((s, idx) => ({ ...s, order: idx + 1 }));
        setSections(updatedList);
        if (selectedSection?.id === id) {
          setSelectedSection(null);
        }
        setSaveStatus("Deleted section");
      } else {
        alert("Failed to delete section");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  // Add component to bottom of homepage
  const addComponent = async (type: string, label: string) => {
    try {
      setLoading(true);
      const nextOrder = sections.length + 1;
      const response = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, internalLabel: label, order: nextOrder, visible: true }),
      });

      if (response.ok) {
        const data = await response.json();
        setSections([...sections, data.section]);
        setSaveStatus("Added section");
      } else {
        alert("Failed to add section");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  // Save selected settings fields
  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection) return;

    try {
      setLoading(true);
      const response = await fetch("/api/sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedSection),
      });

      if (response.ok) {
        setSections(sections.map((s) => (s.id === selectedSection.id ? selectedSection : s)));
        setSaveStatus("Settings saved");
      } else {
        alert("Failed to save settings");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-12 items-start relative">
      {/* Toast notifier */}
      {saveStatus && (
        <div className="fixed bottom-8 right-8 z-[200] px-4 py-2 bg-slate-900 text-white border border-solid border-slate-700 text-xs font-mono rounded shadow-lg">
          {saveStatus}
        </div>
      )}

      {/* Column 1: Component Library (3 cols) */}
      <div className="lg:col-span-3 space-y-4">
        <h2 className="text-xs font-bold font-mono tracking-wider uppercase text-[var(--a-faint)] border-b border-solid border-[var(--a-line)] pb-2">
          // LIBRARY
        </h2>
        <div className="space-y-2">
          {AVAILABLE_COMPONENTS.map((comp) => (
            <button
              key={comp.type}
              onClick={() => addComponent(comp.type, comp.label)}
              disabled={loading}
              className="flex items-center justify-between w-full p-3 text-left border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] bg-[var(--a-surface)] hover:border-[var(--a-primary)] transition-all cursor-pointer text-xs font-semibold text-[var(--a-soft)] hover:text-[var(--a-ink)] border-dashed disabled:opacity-50"
            >
              <span>{comp.label}</span>
              <Plus size={14} className="text-[var(--a-primary)]" />
            </button>
          ))}
        </div>
      </div>

      {/* Column 2: Page Structure (5 cols) */}
      <div className="lg:col-span-5 space-y-4">
        <h2 className="text-xs font-bold font-mono tracking-wider uppercase text-[var(--a-faint)] border-b border-solid border-[var(--a-line)] pb-2 flex justify-between">
          <span>// PAGE LAYOUT STRUCTURE</span>
          <span className="text-[10px] text-amber-500 font-bold font-sans">DRAFT STATE</span>
        </h2>

        <div className="space-y-3">
          {sections.map((sec, index) => (
            <div
              key={sec.id}
              className={`flex items-center justify-between p-4 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] bg-[var(--a-surface)] transition-all ${
                selectedSection?.id === sec.id ? "border-[var(--a-primary)]" : ""
              }`}
              style={{ boxShadow: "var(--a-shadow)" }}
            >
              {/* Order Controls & Label */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="p-1 hover:text-[var(--a-primary)] text-[var(--a-faint)] disabled:opacity-30 cursor-pointer border-none bg-transparent"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === sections.length - 1}
                    className="p-1 hover:text-[var(--a-primary)] text-[var(--a-faint)] disabled:opacity-30 cursor-pointer border-none bg-transparent"
                  >
                    <ArrowDown size={12} />
                  </button>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-[var(--a-ink)]">{sec.internalLabel}</h4>
                  <p className="text-[9px] font-mono text-[var(--a-faint)] uppercase mt-0.5">{sec.type}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleVisibility(sec)}
                  className="p-2 hover:bg-slate-100 rounded-[var(--a-r-sm)] text-[var(--a-soft)] cursor-pointer border-none bg-transparent"
                  title={sec.visible ? "Hide Section" : "Show Section"}
                >
                  {sec.visible ? <Eye size={14} /> : <EyeOff size={14} className="text-red-400" />}
                </button>
                <button
                  onClick={() => setSelectedSection(sec)}
                  className="p-2 hover:bg-slate-100 rounded-[var(--a-r-sm)] text-[var(--a-soft)] cursor-pointer border-none bg-transparent"
                  title="Configure Settings"
                >
                  <Settings size={14} className={selectedSection?.id === sec.id ? "text-[var(--a-primary)]" : ""} />
                </button>
                <button
                  onClick={() => deleteSection(sec.id)}
                  disabled={loading}
                  className="p-2 hover:bg-red-50 text-red-400 rounded-[var(--a-r-sm)] cursor-pointer border-none bg-transparent disabled:opacity-30"
                  title="Delete Section"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {sections.length === 0 && (
            <p className="text-center text-xs text-[var(--a-faint)] font-mono py-12 border border-dashed border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)]">
              // NO SECTIONS ADDED. USE LIBRARY TO BUILD HOMEPAGE.
            </p>
          )}
        </div>
      </div>

      {/* Column 3: Section Settings Panel (4 cols) */}
      <div className="lg:col-span-4 space-y-4">
        <h2 className="text-xs font-bold font-mono tracking-wider uppercase text-[var(--a-faint)] border-b border-solid border-[var(--a-line)] pb-2">
          // CONFIGURATION SETTINGS
        </h2>

        {selectedSection ? (
          <form
            onSubmit={saveSettings}
            className="p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-6"
            style={{ boxShadow: "var(--a-shadow)" }}
          >
            {/* Header */}
            <div>
              <h3 className="font-bold text-sm text-[var(--a-ink)]">{selectedSection.internalLabel}</h3>
              <p className="text-[10px] font-mono text-[var(--a-faint)] uppercase mt-0.5">Type: {selectedSection.type}</p>
            </div>

            {/* Label setting */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Admin Label</label>
              <input
                type="text"
                required
                value={selectedSection.internalLabel}
                onChange={(e) => setSelectedSection({ ...selectedSection, internalLabel: e.target.value })}
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
              />
            </div>

            {/* Animation Settings */}
            <div className="space-y-4 pt-3 border-t border-solid border-[var(--a-line)]">
              <h4 className="text-[10px] font-mono text-[var(--a-soft)] uppercase tracking-wider">// Animation Presets</h4>
              
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Preset Style</label>
                <select
                  value={selectedSection.animationPresetSlug}
                  onChange={(e) => setSelectedSection({ ...selectedSection, animationPresetSlug: e.target.value })}
                  className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-white focus:outline-none focus:border-[var(--a-primary)]"
                >
                  <option value="fade-in">Fade In</option>
                  <option value="slide-up">Slide Up</option>
                  <option value="reveal-left">Reveal Left</option>
                  <option value="zoom-in">Zoom In</option>
                  <option value="magnetic">Magnetic Float</option>
                </select>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Delay (sec)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={selectedSection.animationDelay}
                    onChange={(e) => setSelectedSection({ ...selectedSection, animationDelay: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Stagger (sec)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={selectedSection.animationStagger}
                    onChange={(e) => setSelectedSection({ ...selectedSection, animationStagger: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
                  />
                </div>
              </div>
            </div>

            {/* Custom JSON configurations display */}
            <div className="space-y-2 pt-3 border-t border-solid border-[var(--a-line)]">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Component Custom Settings (JSON)</label>
              <textarea
                rows={4}
                value={JSON.stringify(selectedSection.settings, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setSelectedSection({ ...selectedSection, settings: parsed });
                  } catch {
                    // let typing continue
                  }
                }}
                className="w-full p-3 font-mono text-[10px] border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] bg-slate-50 text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full py-2 bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white text-xs font-semibold rounded-[var(--a-r-sm)] cursor-pointer disabled:opacity-50 transition-colors border-none"
            >
              <Save size={14} />
              Save Configuration
            </button>
          </form>
        ) : (
          <div className="p-8 text-center text-xs text-[var(--a-faint)] border border-dashed border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)]">
            // SELECT A SECTION FROM THE MIDDLE LIST TO CONFIGURE SETTINGS
          </div>
        )}
      </div>
    </div>
  );
}
