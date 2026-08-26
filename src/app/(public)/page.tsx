import type { Metadata } from "next";
import { PublicContentService } from "@/services/public-content.service";
import ProfessionalMinimalTemplate from "@/components/templates/ProfessionalMinimalTemplate";
import ModernGlassTemplate from "@/components/templates/ModernGlassTemplate";
import Interactive3DTemplate from "@/components/templates/Interactive3DTemplate";
import { text } from "@/lib/text";

export async function generateMetadata(): Promise<Metadata> {
  const { profile } = await PublicContentService.getHomePageData();

  // Never name a fictional person in metadata; fall back to the site's own
  // generic label instead. The description fallback describes the site, not
  // the owner, so it stays.
  const fullName = text(profile?.fullName);
  const title = text(profile?.title);
  const description =
    text(profile?.tagline) ||
    text(profile?.heroIntro) ||
    "Full-stack developer portfolio with admin CMS, visual page builder, and three selectable templates.";
  const pageTitle = [fullName, title].filter(Boolean).join(" — ") || "Portfolio";

  return {
    title: pageTitle,
    description,
    openGraph: {
      title: pageTitle,
      description,
      type: "website",
      images: profile?.profileImage?.url ? [{ url: profile.profileImage.url }] : undefined,
    },
  };
}

/**
 * Public homepage — thin route layer.
 * All content resolution (published versions, visibility, sections, template)
 * lives in PublicContentService; this file only picks the template component
 * to render.
 */
export default async function HomePage() {
  // NOTE: no owner-gate here. No public section renders owner-only UI, so
  // validating the session on every homepage request bought nothing while
  // costing two queries for a signed-in owner. Reintroduce
  // `getValidatedOwner()` from lib/require-admin if owner-only JSX is added.
  const { templateKey, ...templateProps } = await PublicContentService.getHomePageData();

  if (templateKey === "PROFESSIONAL_MINIMAL") {
    return <ProfessionalMinimalTemplate {...templateProps} />;
  }

  if (templateKey === "INTERACTIVE_3D") {
    return <Interactive3DTemplate {...templateProps} />;
  }

  // Default fallback is MODERN_GLASS
  return <ModernGlassTemplate {...templateProps} />;
}
