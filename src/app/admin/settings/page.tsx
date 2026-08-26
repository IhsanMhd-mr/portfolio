import db from "@/lib/database";
import { requireAdmin } from "@/lib/require-admin";
import { revalidatePath } from "next/cache";
import { Settings, Save } from "lucide-react";
import PendingButton from "@/components/ui/PendingButton";

export default async function AdminSettingsPage() {
  let profile = await db.siteProfile.findFirst();

  if (!profile) {
    profile = await db.siteProfile.create({
      // Bootstrap an EMPTY profile. These columns are NOT NULL so they must be
      // written, but "" is what the public site treats as absent — it renders
      // nothing rather than publishing a fictional identity and an unowned
      // email address that the owner never entered.
      data: {
        fullName: "",
        logoText: "",
        title: "",
        aboutBio: "",
        contactEmail: "",
      },
    });
  }

  // Server action to update settings
  async function updateProfile(formData: FormData) {
    "use server";
    // Server Actions are independently invocable POST endpoints — the admin
    // layout guards page RENDERING, not this. Without its own check, anyone
    // able to reach the action id could invoke it unauthenticated.
    await requireAdmin();
    const id = formData.get("id") as string;
    const fullName = formData.get("fullName") as string;
    const logoText = formData.get("logoText") as string;
    const title = formData.get("title") as string;
    const tagline = formData.get("tagline") as string;
    const contactEmail = formData.get("contactEmail") as string;
    const locationText = formData.get("locationText") as string;
    const availabilityStatus = formData.get("availabilityStatus") as string;
    const heroIntro = formData.get("heroIntro") as string;
    const aboutBio = formData.get("aboutBio") as string;
    const technicalInterests = formData.get("technicalInterests") as string;
    const developmentApproach = formData.get("developmentApproach") as string;
    const currentGoals = formData.get("currentGoals") as string;
    const defaultTheme = formData.get("defaultTheme") as string;

    await db.siteProfile.update({
      where: { id },
      data: {
        fullName,
        logoText,
        title,
        tagline,
        contactEmail,
        locationText,
        availabilityStatus,
        heroIntro,
        aboutBio,
        technicalInterests,
        developmentApproach,
        currentGoals,
        defaultTheme,
      },
    });

    // Mark changes on page
    await db.page.update({
      where: { key: "home" },
      data: { hasUnpublishedChanges: true },
    });

    revalidatePath("/admin/settings");
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">Global Site Settings</h1>
        <p className="text-sm text-[var(--a-soft)] mt-1.5">
          Configure your visual brand, contact information, bio summaries, and goals.
        </p>
      </div>

      <form 
        action={updateProfile} 
        className="p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-6"
        style={{ boxShadow: "var(--a-shadow)" }}
      >
        <input type="hidden" name="id" value={profile.id} />

        <h3 className="font-bold text-sm text-[var(--a-ink)] border-b border-solid border-[var(--a-line)] pb-3 mb-2 flex items-center gap-2">
          <Settings size={16} className="text-[var(--a-primary)]" />
          Identity & Branding
        </h3>

        <div className="grid gap-6 sm:grid-cols-3">
          {/* Full Name */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Full Name</label>
            <input
              type="text"
              name="fullName"
              defaultValue={profile.fullName}
              className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
            />
          </div>

          {/* Logo Text */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Logo Text</label>
            <input
              type="text"
              name="logoText"
              defaultValue={profile.logoText}
              className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Job Title</label>
            <input
              type="text"
              name="title"
              defaultValue={profile.title}
              className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
            />
          </div>
        </div>

        {/* Tagline */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Tagline / Subheading</label>
          <input
            type="text"
            name="tagline"
            defaultValue={profile.tagline || ""}
            className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {/* Contact Email */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Contact Email</label>
            <input
              type="email"
              name="contactEmail"
              defaultValue={profile.contactEmail}
              className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
            />
          </div>

          {/* Location Text */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Location</label>
            <input
              type="text"
              name="locationText"
              defaultValue={profile.locationText || ""}
              className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
            />
          </div>

          {/* Availability status */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Availability</label>
            <input
              type="text"
              name="availabilityStatus"
              defaultValue={profile.availabilityStatus || ""}
              className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
            />
          </div>
        </div>

        <h3 className="font-bold text-sm text-[var(--a-ink)] border-b border-solid border-[var(--a-line)] pb-3 mb-2 flex items-center gap-2 pt-4">
          <Settings size={16} className="text-[var(--a-primary)]" />
          Biographies & Copy details
        </h3>

        {/* Hero Intro */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Hero Intro Description</label>
          <textarea
            name="heroIntro"
            rows={3}
            defaultValue={profile.heroIntro || ""}
            className="w-full px-3 py-2 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] resize-y"
          />
        </div>

        {/* About Bio */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">About Me Detailed Bio</label>
          <textarea
            name="aboutBio"
            rows={4}
            defaultValue={profile.aboutBio}
            className="w-full px-3 py-2 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] resize-y"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {/* Tech Interests */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Technical Interests</label>
            <textarea
              name="technicalInterests"
              rows={3}
              defaultValue={profile.technicalInterests || ""}
              className="w-full px-3 py-2 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] resize-y"
            />
          </div>

          {/* Development Approach */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Dev Approach</label>
            <textarea
              name="developmentApproach"
              rows={3}
              defaultValue={profile.developmentApproach || ""}
              className="w-full px-3 py-2 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] resize-y"
            />
          </div>

          {/* Current Goals */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Current Focus / Goals</label>
            <textarea
              name="currentGoals"
              rows={3}
              defaultValue={profile.currentGoals || ""}
              className="w-full px-3 py-2 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] resize-y"
            />
          </div>
        </div>

        <h3 className="font-bold text-sm text-[var(--a-ink)] border-b border-solid border-[var(--a-line)] pb-3 mb-2 flex items-center gap-2 pt-4">
          <Settings size={16} className="text-[var(--a-primary)]" />
          Appearance
        </h3>

        {/* Default Theme */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Default Theme</label>
          <select
            name="defaultTheme"
            defaultValue={profile.defaultTheme}
            className="w-full sm:w-64 px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-inset)] focus:outline-none focus:border-[var(--a-primary)]"
          >
            <option value="system">System (match device)</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          <p className="text-[10px] text-[var(--a-faint)]">
            Applied on a visitor&apos;s first visit, before they&apos;ve chosen a theme themselves.
          </p>
        </div>

        {/* Submit */}
        <PendingButton
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white text-xs font-semibold rounded-[var(--a-r-sm)] transition-colors cursor-pointer border-none disabled:opacity-60"
          pendingLabel="Saving…"
        >
          <Save size={14} />
          Save Global Settings
        </PendingButton>
      </form>
    </div>
  );
}
