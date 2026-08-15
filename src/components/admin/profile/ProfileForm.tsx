"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { User, Save } from "lucide-react";
import { updateProfileAction } from "@/app/admin/profile/actions";

const MediaPickerModal = dynamic(() => import("@/components/admin/MediaPickerModal"));

interface ProfileFormProps {
  profile: {
    id: string;
    fullName: string;
    tagline: string | null;
    aboutBio: string;
    profileImageId: string | null;
    cvFileId: string | null;
    profileImage: { filename: string; url: string } | null;
    cvFile: { filename: string; url: string } | null;
  };
}

export default function ProfileForm({ profile }: ProfileFormProps) {
  const [fullName, setFullName] = useState(profile.fullName);
  const [tagline, setTagline] = useState(profile.tagline || "");
  const [aboutBio, setAboutBio] = useState(profile.aboutBio);
  const [profileImageId, setProfileImageId] = useState(profile.profileImageId || "");
  const [profileImagePreview, setProfileImagePreview] = useState(profile.profileImage);
  const [cvFileId, setCvFileId] = useState(profile.cvFileId || "");
  const [cvFilePreview, setCvFilePreview] = useState(profile.cvFile);

  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await updateProfileAction({
        fullName,
        tagline: tagline || null,
        aboutBio,
        profileImageId: profileImageId || null,
        cvFileId: cvFileId || null,
      });

      if (result.success) {
        setStatus({ type: "success", message: "Profile saved." });
      } else {
        setStatus({ type: "error", message: result.error });
        setFieldErrors(result.fieldErrors || {});
      }
    });
  }

  const inputClass =
    "w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-surface)] focus:outline-none focus:border-[var(--a-primary)]";

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-6"
      style={{ boxShadow: "var(--a-shadow)" }}
    >
      <h3 className="font-bold text-sm text-[var(--a-ink)] border-b border-solid border-[var(--a-line)] pb-3 mb-2 flex items-center gap-2">
        <User size={16} className="text-[var(--a-primary)]" />
        Profile
      </h3>

      {status && (
        <div
          role={status.type === "error" ? "alert" : "status"}
          className="text-xs px-3 py-2 rounded-[var(--a-r-sm)] border border-solid"
          style={
            status.type === "success"
              ? { color: "var(--a-success)", borderColor: "var(--a-success)", backgroundColor: "color-mix(in srgb, var(--a-success) 10%, transparent)" }
              : { color: "var(--a-danger)", borderColor: "var(--a-danger)", backgroundColor: "color-mix(in srgb, var(--a-danger) 10%, transparent)" }
          }
        >
          {status.message}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={isPending}
            className={inputClass}
          />
          {fieldErrors.fullName && <p className="text-[10px] text-[var(--a-danger)]">{fieldErrors.fullName}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Tagline</label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            disabled={isPending}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Bio</label>
        <textarea
          value={aboutBio}
          onChange={(e) => setAboutBio(e.target.value)}
          disabled={isPending}
          rows={4}
          className={`${inputClass} resize-y`}
        />
        {fieldErrors.aboutBio && <p className="text-[10px] text-[var(--a-danger)]">{fieldErrors.aboutBio}</p>}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <MediaPickerModal
            mode="single"
            label="Avatar (from Media Library)"
            defaultValue={profileImageId || null}
            defaultPreview={profileImagePreview}
            onSelect={(id, preview) => {
              setProfileImageId(id);
              setProfileImagePreview(preview);
            }}
          />
          <p className="text-[10px] text-[var(--a-faint)]">
            Upload new images from the Media Library, then select one here.
          </p>
        </div>

        <div className="space-y-2">
          <MediaPickerModal
            mode="single"
            label="Resume / CV (from Media Library)"
            defaultValue={cvFileId || null}
            defaultPreview={cvFilePreview}
            onSelect={(id, preview) => {
              setCvFileId(id);
              setCvFilePreview(preview);
            }}
          />
          <p className="text-[10px] text-[var(--a-faint)]">
            Upload a PDF as a Document in the Media Library, then select it here.
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white text-xs font-semibold rounded-[var(--a-r-sm)] transition-colors cursor-pointer border-none disabled:opacity-50"
      >
        <Save size={14} />
        {isPending ? "Saving..." : "Save Profile"}
      </button>
    </form>
  );
}
