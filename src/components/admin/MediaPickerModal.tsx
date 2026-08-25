"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, File, Search, X } from "lucide-react";
import { useBackdropDismiss } from "@/lib/use-backdrop-dismiss";

interface PickerAsset {
  id: string;
  filename: string;
  url: string;
  mimeType: string | null;
  kind: string;
}

interface MediaListResponse {
  assets: PickerAsset[];
  page: number;
  totalPages: number;
  total: number;
}

/**
 * On-demand media picker — fetches a paginated/searchable list from
 * /api/media only when opened (never the full table), and renders its own
 * hidden input(s) so it drops into an existing <form action={serverAction}>
 * unchanged.
 *
 * mode="single": one hidden input named `name`, value = selected asset id.
 * mode="multi": one hidden input per selected id, all named `name` (submits
 * as a repeated form field, e.g. formData.getAll(name)).
 */
export default function MediaPickerModal({
  name,
  label,
  mode = "single",
  defaultValue,
  defaultPreview,
  onSelect,
}: {
  /** Uncontrolled mode: renders a hidden input with this name for native form submission. Omit when using onSelect. */
  name?: string;
  label: string;
  mode?: "single" | "multi";
  /** Single mode: the currently selected asset id, if any. */
  defaultValue?: string | null;
  /** Single mode: filename/URL to preview before the picker has been opened. */
  defaultPreview?: { filename: string; url: string } | null;
  /** Controlled mode: called with the picked asset's id instead of rendering a hidden input — for client-managed forms (e.g. onSubmit + useState) that need the value in JS, not FormData. */
  onSelect?: (id: string, preview: { filename: string; url: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  // Picker holds no unsaved text, so outside-click dismissal is safe here —
  // but it must be a complete press+release on the backdrop, never a stray
  // release that started inside the dialog.
  const backdrop = useBackdropDismiss(() => setOpen(false));
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<MediaListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(defaultValue ?? null);
  const [selectedPreview, setSelectedPreview] = useState(defaultPreview ?? null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("search", search);
    fetch(`/api/media?${params.toString()}`)
      .then((res) => res.json())
      .then((json: MediaListResponse) => setData(json))
      .finally(() => setLoading(false));
  }, [open, page, search]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };

  const isImage = (a: PickerAsset) => a.kind === "IMAGE" || a.kind === "LOGO";

  const pick = (asset: PickerAsset) => {
    if (mode === "single") {
      setSelectedId(asset.id);
      setSelectedPreview({ filename: asset.filename, url: asset.url });
      onSelect?.(asset.id, { filename: asset.filename, url: asset.url });
      setOpen(false);
    } else if (onSelect) {
      // Controlled multi mode: caller owns the selection list (e.g. GalleryManager) —
      // each click is reported once, not tracked internally.
      onSelect(asset.id, { filename: asset.filename, url: asset.url });
    } else {
      setSelectedIds((prev) =>
        prev.includes(asset.id) ? prev.filter((id) => id !== asset.id) : [...prev, asset.id]
      );
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">{label}</label>

      {name && mode === "single" && selectedId && <input type="hidden" name={name} value={selectedId} />}
      {name && mode === "multi" && selectedIds.map((id) => <input key={id} type="hidden" name={name} value={id} />)}

      {mode === "single" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-inset)] hover:border-[var(--a-primary)] cursor-pointer transition-colors"
        >
          {selectedPreview ? (
            <>
              <span className="w-6 h-6 rounded bg-[var(--a-surface)] border border-solid border-[var(--a-line)] overflow-hidden flex items-center justify-center shrink-0">
                <img src={selectedPreview.url} alt="" className="w-full h-full object-contain" />
              </span>
              <span className="truncate">{selectedPreview.filename}</span>
            </>
          ) : (
            <span className="text-[var(--a-faint)]">-- Choose from Media Library --</span>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-primary)] hover:bg-[var(--a-inset)] cursor-pointer transition-colors"
        >
          <ImageIcon size={12} /> Add from Media Library {selectedIds.length > 0 && `(${selectedIds.length} selected)`}
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          {...backdrop}
        >
          <div className="w-full max-w-2xl max-h-[80vh] flex flex-col bg-[var(--a-surface)] border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] overflow-hidden">
            <div className="p-4 border-b border-solid border-[var(--a-line)] flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-[var(--a-faint)]" size={14} />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search media..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-inset)] focus:outline-none focus:border-[var(--a-primary)]"
                />
              </div>
              {mode === "multi" && (
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white text-xs font-semibold rounded-[var(--a-r-sm)] cursor-pointer border-none"
                >
                  Done
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} className="p-1.5 text-[var(--a-soft)] hover:text-[var(--a-ink)] cursor-pointer border-none bg-transparent">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading && <p className="text-xs text-[var(--a-faint)] text-center py-8">Loading…</p>}
              {!loading && data && data.assets.length === 0 && (
                <p className="text-xs text-[var(--a-faint)] text-center py-8">No media found.</p>
              )}
              {!loading && data && data.assets.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {data.assets.map((asset) => {
                    const isSelected = mode === "single" ? asset.id === selectedId : selectedIds.includes(asset.id);
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => pick(asset)}
                        className={`flex flex-col border border-solid rounded-[var(--a-r-sm)] overflow-hidden text-left cursor-pointer transition-colors ${
                          isSelected ? "border-[var(--a-primary)] ring-2 ring-[var(--a-primary)]" : "border-[var(--a-line)] hover:border-[var(--a-primary)]"
                        }`}
                      >
                        <span className="aspect-square w-full bg-[var(--a-inset)] flex items-center justify-center overflow-hidden">
                          {isImage(asset) ? (
                            <img src={asset.url} alt="" className="w-full h-full object-contain p-1" />
                          ) : (
                            <File size={24} className="text-[var(--a-faint)]" />
                          )}
                        </span>
                        <span className="px-1.5 py-1 text-[9px] font-mono text-[var(--a-ink)] truncate" title={asset.filename}>
                          {asset.filename}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {data && data.totalPages > 1 && (
              <div className="p-3 border-t border-solid border-[var(--a-line)] flex items-center justify-between text-xs">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] disabled:opacity-30 cursor-pointer bg-transparent text-[var(--a-soft)]"
                >
                  Prev
                </button>
                <span className="text-[var(--a-faint)] font-mono">Page {data.page} of {data.totalPages}</span>
                <button
                  type="button"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] disabled:opacity-30 cursor-pointer bg-transparent text-[var(--a-soft)]"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
