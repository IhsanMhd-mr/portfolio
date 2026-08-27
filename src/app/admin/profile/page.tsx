import { SiteProfileService } from "@/services/site-profile.service";
import { SocialLinkService } from "@/services/social-link.service";
import dynamic from "next/dynamic";
import { requireAdmin } from "@/lib/require-admin";
import { currentPathname } from "@/lib/current-pathname";
import ProfileForm from "@/components/admin/profile/ProfileForm";

// dnd-kit (used by the handle-reorder drag-and-drop) is only needed on this
// route — dynamic() keeps it out of shared admin chunks/other pages' initial JS.
const SocialHandlesManager = dynamic(() => import("@/components/admin/profile/SocialHandlesManager"));

export const metadata = { title: "Profile & Social Handles — Admin" };

export default async function AdminProfilePage() {
  await requireAdmin(await currentPathname());

  const profile = await SiteProfileService.getOrCreateWithMedia();
  const socialHandles = await SocialLinkService.list();

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">Profile & Social Handles</h1>
        <p className="text-sm text-[var(--a-soft)] mt-1.5">
          Your public identity, avatar, resume, and the social links shown across the site.
        </p>
      </div>

      <ProfileForm profile={profile} />

      <SocialHandlesManager initialHandles={socialHandles} />
    </div>
  );
}
