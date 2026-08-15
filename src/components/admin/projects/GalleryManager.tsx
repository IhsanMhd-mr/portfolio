"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { X } from "lucide-react";

const MediaPickerModal = dynamic(() => import("@/components/admin/MediaPickerModal"));

interface GalleryItem {
  mediaId: string;
  url: string;
  filename: string;
  caption: string;
}

/**
 * Gallery selection for the project edit form. Renders only the currently
 * selected images (a small, bounded set) plus an on-demand picker to add
 * more — instead of the old pattern of rendering every media asset in the
 * library as a checkbox row.
 *
 * Still integrates with the surrounding native <form action={serverAction}>
 * via hidden inputs (`gallery_count`, `gallery_media_{idx}`,
 * `gallery_caption_{idx}`), matching what the server action already parses.
 */
export default function GalleryManager({ initialItems }: { initialItems: GalleryItem[] }) {
  const [items, setItems] = useState(initialItems);

  const addItem = (id: string, preview: { filename: string; url: string }) => {
    setItems((prev) => (prev.some((i) => i.mediaId === id) ? prev : [...prev, { mediaId: id, url: preview.url, filename: preview.filename, caption: "" }]));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.mediaId !== id));
  };

  const updateCaption = (id: string, caption: string) => {
    setItems((prev) => prev.map((i) => (i.mediaId === id ? { ...i, caption } : i)));
  };

  return (
    <div className="space-y-3">
      <input type="hidden" name="gallery_count" value={items.length} />

      {items.map((item, idx) => (
        <div key={item.mediaId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border border-solid border-[var(--a-line)] rounded hover:bg-[var(--a-inset)]">
          <input type="hidden" name={`gallery_media_${idx}`} value={item.mediaId} />
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-8 h-8 rounded bg-[var(--a-inset)] border border-solid border-[var(--a-line)] overflow-hidden flex items-center justify-center shrink-0">
              <img src={item.url} alt="" className="w-full h-full object-contain" />
            </span>
            <span className="text-xs font-semibold text-[var(--a-ink)] truncate">{item.filename}</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              name={`gallery_caption_${idx}`}
              defaultValue={item.caption}
              onChange={(e) => updateCaption(item.mediaId, e.target.value)}
              placeholder="Caption for this project image..."
              className="w-full sm:w-72 px-2 py-1 border border-solid border-[var(--a-line)] rounded text-xs focus:outline-none"
            />
            <button
              type="button"
              onClick={() => removeItem(item.mediaId)}
              className="p-1.5 text-[var(--a-danger-ink)] hover:bg-[var(--a-danger-bg)] rounded cursor-pointer border-none bg-transparent shrink-0"
              title="Remove from gallery"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <p className="text-xs text-[var(--a-faint)] py-2">No images selected yet.</p>
      )}

      <MediaPickerModal mode="multi" label="Add from Media Library" onSelect={addItem} />
    </div>
  );
}
