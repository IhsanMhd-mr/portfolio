import db from "@/lib/database";
import { requireAdmin } from "@/lib/require-admin";
import ProfileForm from "@/components/admin/profile/ProfileForm";
import SocialHandlesManager from "@/components/admin/profile/SocialHandlesManager";

export const metadata = { title: "Profile & Social Handles — Admin" };

export default async function AdminProfilePage() {
  await requireAdmin({ pathname: "/admin/profile" });

  let profile = await db.siteProfile.findFirst({
    include: { profileImage: true, cvFile: true },
  });

  if (!profile) {
    profile = await db.siteProfile.create({
      data: {
        fullName: "Jane Doe",
        logoText: "JD",
        title: "Software Engineer",
        aboutBio: "Passionate about web systems and clean code.",
        contactEmail: "admin@portfolio.com",
      },
      include: { profileImage: true, cvFile: true },
    });
  }

  const [allMedia, socialHandles] = await Promise.all([
    db.mediaAsset.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" } }),
    db.socialLink.findMany({ orderBy: { order: "asc" } }),
  ]);

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">Profile & Social Handles</h1>
        <p className="text-sm text-[var(--a-soft)] mt-1.5">
          Your public identity, avatar, resume, and the social links shown across the site.
        </p>
      </div>

      <ProfileForm profile={profile} allMedia={allMedia} />

      <SocialHandlesManager initialHandles={socialHandles} />
    </div>
  );
}
