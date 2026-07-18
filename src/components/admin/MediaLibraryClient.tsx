"use client";

import { useState } from "react";
import { 
  ImageIcon, Plus, Trash2, Save, File, 
  Upload, Check, AlertTriangle, RefreshCw 
} from "lucide-react";
import { deleteMediaAction, updateMediaMetadataAction } from "@/app/admin/media/actions";

interface MediaAsset {
  id: string;
  url: string;
  kind: string;
  filename: string;
  altText: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: Date;
}

interface MediaLibraryClientProps {
  mediaAssets: MediaAsset[];
}

export default function MediaLibraryClient({ mediaAssets }: MediaLibraryClientProps) {
  const [assets, setAssets] = useState<MediaAsset[]>(mediaAssets);
  const [uploading, setUploading] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Metadata edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAlt, setEditAlt] = useState("");

  const refreshPage = () => {
    window.location.reload();
  };

  // Upload file handler
  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setUploading(true);

    const formData = new FormData(e.currentTarget);
    const file = formData.get("file") as File;
    const altText = formData.get("altText") as string;

    if (!file || file.size === 0) {
      setErrorMsg("Please select a file to upload.");
      setUploading(false);
      return;
    }

    try {
      const res = await fetch("/api/media", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to upload file.");
      }

      setSuccessMsg(`File '${result.asset.filename}' uploaded successfully!`);
      // Reset form
      e.currentTarget.reset();
      refreshPage();
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected upload error occurred.");
    } finally {
      setUploading(false);
    }
  };

  // Replace file handler
  const handleReplace = async (id: string, file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setReplacingId(id);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("replaceId", id);

    try {
      const res = await fetch("/api/media", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to replace file.");
      }

      setSuccessMsg(`File content replaced successfully!`);
      refreshPage();
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected replacement error occurred.");
    } finally {
      setReplacingId(null);
    }
  };

  // Deletion handler catching usage guard rejections
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this media asset?")) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await deleteMediaAction(id);
      setSuccessMsg("Media asset deleted successfully.");
      refreshPage();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete media asset.");
    }
  };

  // Metadata update handler
  const handleSaveMetadata = async (id: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await updateMediaMetadataAction(id, editAlt || null);
      setSuccessMsg("Metadata updated successfully.");
      setEditingId(null);
      refreshPage();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update metadata.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Messages */}
      {errorMsg && (
        <div className="p-4 border border-solid border-red-200 bg-red-50 text-red-700 text-xs font-mono rounded-[var(--a-r-sm)] whitespace-pre-wrap flex items-start gap-2">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold">Operation Blocked / Failed</h4>
            <p className="mt-1">{errorMsg}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 border border-solid border-green-200 bg-green-50 text-green-700 text-xs font-mono rounded-[var(--a-r-sm)] flex items-center gap-2">
          <Check size={14} />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Left list of media */}
        <div className="lg:col-span-8 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] overflow-hidden" style={{ boxShadow: "var(--a-shadow)" }}>
          <div className="p-4 border-b border-solid border-[var(--a-line)] bg-slate-50 flex items-center gap-2 text-xs font-mono text-[var(--a-faint)]">
            <ImageIcon size={14} />
            <span>LIBRARY ASSETS ({assets.length})</span>
          </div>

          <div className="p-6 grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
            {assets.map((asset) => {
              const isImage = asset.kind === "IMAGE" || asset.kind === "LOGO";
              const isEditing = editingId === asset.id;

              return (
                <div 
                  key={asset.id} 
                  className="group relative flex flex-col justify-between border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] bg-[var(--a-bg)] overflow-hidden transition-all hover:border-[var(--a-primary)]"
                >
                  {/* Preview aspect box */}
                  <div className="aspect-square w-full bg-slate-950 overflow-hidden flex items-center justify-center relative border-b border-solid border-[var(--a-line)]">
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={asset.url} 
                        alt={asset.altText || asset.filename} 
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <File size={32} className="text-slate-500" />
                    )}

                    {/* Loader overlays */}
                    {replacingId === asset.id && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[10px] font-bold font-mono">
                        REPLACING...
                      </div>
                    )}

                    {/* Operations Hover Cover */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2.5 transition-opacity">
                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(asset.id)}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full cursor-pointer border-none"
                        title="Delete asset"
                      >
                        <Trash2 size={14} />
                      </button>

                      {/* Replace */}
                      <label className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full cursor-pointer border-none flex items-center justify-center">
                        <RefreshCw size={14} />
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleReplace(asset.id, file);
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Metadata display / inline edit */}
                  <div className="p-3 text-[10px] space-y-1">
                    <p className="font-bold text-[var(--a-ink)] truncate font-mono" title={asset.filename}>
                      {asset.filename}
                    </p>
                    <div className="flex justify-between text-[9px] font-mono text-[var(--a-faint)] uppercase">
                      <span>{asset.kind}</span>
                      <span>{asset.sizeBytes ? `${(asset.sizeBytes / 1024).toFixed(1)} KB` : ""}</span>
                    </div>

                    {isEditing ? (
                      <div className="space-y-1 pt-1.5 border-t border-solid border-slate-100">
                        <input
                          type="text"
                          value={editAlt}
                          onChange={(e) => setEditAlt(e.target.value)}
                          placeholder="Alt text description..."
                          className="w-full px-1.5 py-0.5 border border-solid border-[var(--a-line)] rounded text-[9px] focus:outline-none"
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleSaveMetadata(asset.id)}
                            className="px-1.5 py-0.5 bg-green-600 text-white rounded text-[8px] border-none cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[8px] border-none cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-1.5 border-t border-solid border-slate-100 flex items-center justify-between">
                        <span className="text-[9px] text-slate-400 italic truncate max-w-[80px]">
                          {asset.altText || "No alt text"}
                        </span>
                        <button
                          onClick={() => {
                            setEditingId(asset.id);
                            setEditAlt(asset.altText || "");
                          }}
                          className="text-[9px] text-[var(--a-primary)] hover:underline cursor-pointer border-none bg-transparent"
                        >
                          Edit Alt
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {assets.length === 0 && (
              <div className="col-span-full text-center py-12 text-[var(--a-faint)] font-mono">// NO LIBRARY ASSETS RECORDED</div>
            )}
          </div>
        </div>

        {/* Right Uploader Form */}
        <div className="lg:col-span-4 p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-6" style={{ boxShadow: "var(--a-shadow)" }}>
          <h3 className="font-bold text-sm text-[var(--a-ink)] border-b border-solid border-[var(--a-line)] pb-3 mb-2 flex items-center gap-2">
            <Upload size={16} className="text-[var(--a-primary)]" />
            Upload File Asset
          </h3>

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Select File (Max 5MB)</label>
              <input
                type="file"
                name="file"
                required
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-slate-50 focus:outline-none focus:border-[var(--a-primary)]"
              />
              <span className="text-[9px] text-[var(--a-faint)] block">Allowed: JPG, PNG, WEBP, AVIF, SVG, PDF</span>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Alternative Text (Alt)</label>
              <input
                type="text"
                name="altText"
                placeholder="Description of image visual..."
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-slate-50 focus:outline-none focus:border-[var(--a-primary)]"
              />
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="flex items-center justify-center gap-2 w-full py-2 bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white text-xs font-semibold rounded-[var(--a-r-sm)] transition-colors cursor-pointer border-none disabled:opacity-50"
            >
              {uploading ? "Uploading File..." : "Upload File Asset"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
