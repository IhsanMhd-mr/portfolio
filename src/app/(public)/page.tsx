import { cookies } from "next/headers";
import { getValidatedOwner } from "@/lib/require-admin";
import { PublicContentService } from "@/services/public-content.service";
import ProfessionalMinimalTemplate from "@/components/templates/ProfessionalMinimalTemplate";
import ModernGlassTemplate from "@/components/templates/ModernGlassTemplate";
import Interactive3DTemplate from "@/components/templates/Interactive3DTemplate";

/**
 * Public homepage — thin route layer.
 * All content resolution (draft/published, visibility, sections, template)
 * lives in PublicContentService; this file only authorizes preview mode,
 * gates owner-only UI, and picks the template component to render.
 */
export default async function HomePage() {
  const cookiesList = await cookies();

  // Secure preview mode authorization (httpOnly cookie set by admin-only action)
  const isPreview = cookiesList.get("portfolio_preview_mode")?.value === "true";

  // Owner-only UI gate. Validates against TrackedSession (not just the JWT), so
  // a revoked/expired session is treated as a guest. Guests get isOwner=false
  // and owner-only JSX is never rendered into the response.
  const isOwner = (await getValidatedOwner()) !== null;

  const { templateKey, ...data } = await PublicContentService.getHomePageData(isPreview);

  const templateProps = { ...data, isPreview, isOwner };

  if (templateKey === "PROFESSIONAL_MINIMAL") {
    return <ProfessionalMinimalTemplate {...templateProps} />;
  }

  if (templateKey === "INTERACTIVE_3D") {
    return <Interactive3DTemplate {...templateProps} />;
  }

  // Default fallback is MODERN_GLASS
  return <ModernGlassTemplate {...templateProps} />;
}
