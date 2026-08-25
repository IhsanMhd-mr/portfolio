import type { Metadata } from "next";
import { resolvePreviewMode } from "@/lib/preview-mode";
import { PublicContentService } from "@/services/public-content.service";
import ProfessionalMinimalTemplate from "@/components/templates/ProfessionalMinimalTemplate";
import ModernGlassTemplate from "@/components/templates/ModernGlassTemplate";
import Interactive3DTemplate from "@/components/templates/Interactive3DTemplate";

export async function generateMetadata(): Promise<Metadata> {
  const isPreview = await resolvePreviewMode();
  const { profile } = await PublicContentService.getHomePageData(isPreview);

  const fullName = profile?.fullName || "Jane Doe";
  const title = profile?.title || "Full-Stack Software Engineer";
  const description =
    profile?.tagline ||
    profile?.heroIntro ||
    "Full-stack developer portfolio with admin CMS, visual page builder, and three selectable templates.";
  const pageTitle = `${fullName} — ${title}`;

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
 * All content resolution (draft/published, visibility, sections, template)
 * lives in PublicContentService; this file only authorizes preview mode,
 * gates owner-only UI, and picks the template component to render.
 */
export default async function HomePage() {
  // Preview is authorized against the session, not the cookie alone — the
  // cookie is client-supplied and forgeable. See lib/preview-mode.ts.
  const isPreview = await resolvePreviewMode();

  // NOTE: no owner-gate here. No public section renders owner-only UI, so
  // validating the session on every homepage request bought nothing while
  // costing two queries for a signed-in owner. Reintroduce
  // `getValidatedOwner()` from lib/require-admin if owner-only JSX is added.
  const { templateKey, ...data } = await PublicContentService.getHomePageData(isPreview);

  const templateProps = { ...data, isPreview };

  if (templateKey === "PROFESSIONAL_MINIMAL") {
    return <ProfessionalMinimalTemplate {...templateProps} />;
  }

  if (templateKey === "INTERACTIVE_3D") {
    return <Interactive3DTemplate {...templateProps} />;
  }

  // Default fallback is MODERN_GLASS
  return <ModernGlassTemplate {...templateProps} />;
}
