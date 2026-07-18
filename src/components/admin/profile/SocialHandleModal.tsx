"use client";

import { useState, useMemo } from "react";
import { X } from "lucide-react";
import { PLATFORM_META, PLATFORM_KEYS, type PlatformKey, domainMismatchWarning } from "@/lib/social-platforms";

export interface SocialHandleFormValue {
  platform: PlatformKey;
  label: string;
  url: string;
}

interface SocialHandleModalProps {
  initial?: { platform: string; label: string | null; url: string };
  onCancel: () => void;
  onSubmit: (value: SocialHandleFormValue) => Promise<{ success: boolean; error?: string; fieldErrors?: Record<string, string> }>;
  existingPlatforms: string[];
}

export default function SocialHandleModal({ initial, onCancel, onSubmit, existingPlatforms }: SocialHandleModalProps) {
  const isEdit = !!initial;
  const [platform, setPlatform] = useState<PlatformKey>((initial?.platform as PlatformKey) || "github");
  const [label, setLabel] = useState(initial?.label || "");
  const [url, setUrl] = useState(initial?.url.replace(/^mailto:/, "") || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const meta = PLATFORM_META[platform];
  const Icon = meta.icon;

  const availablePlatforms = useMemo(
    () =>
      PLATFORM_KEYS.filter(
        (key) => key === "custom" || key === initial?.platform || !existingPlatforms.includes(key)
      ),
    [existingPlatforms, initial?.platform]
  );

  const warning = domainMismatchWarning(platform, url);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    const result = await onSubmit({ platform, label, url });
    if (!result.success) {
      setError(result.error || "Something went wrong.");
      setFieldErrors(result.fieldErrors || {});
      setIsSubmitting(false);
    }
    // On success, the parent closes the modal.
  }

  const inputClass =
    "w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-surface)] focus:outline-none focus:border-[var(--a-primary)]";

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="social-handle-modal-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md p-6 bg-[var(--a-surface)] border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] shadow-lg space-y-5"
      >
        <div className="flex items-center justify-between">
          <h3 id="social-handle-modal-title" className="font-bold text-sm text-[var(--a-ink)]">
            {isEdit ? "Edit Social Handle" : "Add Social Handle"}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="p-1 text-[var(--a-soft)] hover:text-[var(--a-ink)] cursor-pointer border-none bg-transparent"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div role="alert" className="text-xs text-[var(--a-danger)] bg-red-500/10 border border-solid border-red-500/30 rounded-[var(--a-r-sm)] px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Platform</label>
            <div className="flex items-center gap-2">
              <span
                className="flex items-center justify-center w-8 h-8 rounded-[var(--a-r-sm)] border border-solid border-[var(--a-line)] shrink-0"
                style={{ color: "var(--a-primary)" }}
              >
                <Icon size={16} />
              </span>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as PlatformKey)}
                disabled={isSubmitting}
                className={inputClass}
              >
                {availablePlatforms.map((key) => (
                  <option key={key} value={key}>
                    {PLATFORM_META[key].label}
                  </option>
                ))}
              </select>
            </div>
            {fieldErrors.platform && <p className="text-[10px] text-[var(--a-danger)]">{fieldErrors.platform}</p>}
          </div>

          {platform === "custom" && (
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Label</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g. Dribbble, Mastodon, Blog"
                className={inputClass}
              />
              {fieldErrors.label && <p className="text-[10px] text-[var(--a-danger)]">{fieldErrors.label}</p>}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">
              {platform === "email" ? "Email address" : "URL"}
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isSubmitting}
              placeholder={meta.placeholder}
              className={inputClass}
            />
            {fieldErrors.url && <p className="text-[10px] text-[var(--a-danger)]">{fieldErrors.url}</p>}
            {!fieldErrors.url && warning && <p className="text-[10px] text-[var(--a-warn)]">{warning}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-[var(--a-r-sm)] border border-solid border-[var(--a-line)] text-[var(--a-soft)] hover:text-[var(--a-ink)] bg-transparent cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-[var(--a-r-sm)] bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white border-none cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Add Handle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
