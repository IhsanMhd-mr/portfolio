import db from "@/lib/database";
import dynamic from "next/dynamic";
import { requireAdmin } from "@/lib/require-admin";
import ProfileForm from "@/components/admin/profile/ProfileForm";

// dnd-kit (used by the handle-reorder drag-and-drop) is only needed on this
// route — dynamic() keeps it out of shared admin chunks/other pages' initial JS.
const SocialHandlesManager = dynamic(() => import("@/components/admin/profile/SocialHandlesManager"));

export const metadata = { title: "Profile & Social Handles — Admin" };

export default async function AdminProfilePage() {
  await requireAdmin("/admin/profile");

  let profile = await db.siteProfile.findFirst({
    include: { profileImage: true, cvFile: true },
  });

  if (!profile) {
    profile = await db.siteProfile.create({
      // Bootstrap an EMPTY profile — see the matching comment in
      // src/app/admin/settings/page.tsx. Never seed a fictional identity.
      data: {
        fullName: "",
        logoText: "",
        title: "",
        aboutBio: "",
        contactEmail: "",
      },
      include: { profileImage: true, cvFile: true },
    });
  }

  const socialHandles = await db.socialLink.findMany({ orderBy: { order: "asc" } });

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
