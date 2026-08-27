import db from "@/lib/database";
import { recordAudit, type ServiceAuditContext } from "@/lib/audit";
import { HOME_PAGE_KEY } from "./page.service";

/**
 * TemplateService — the three selectable homepage skins.
 *
 * Selecting a template writes `Page.draftTemplateId`, i.e. it is a DRAFT
 * change: the public site normally renders the template baked into the active
 * PageVersion. The one exception is a site that has never been published,
 * where `resolveTemplateKey` falls through to the draft pointer — which is why
 * the caller revalidates "/" as well as the admin route.
 */
export class TemplateService {
  static async list() {
    return db.template.findMany({ orderBy: { key: "asc" } });
  }

  /**
   * Points the home page's draft at a template.
   *
   * The before/after values are captured inside the transaction so the audit
   * entry records the actual transition rather than a value re-read afterwards.
   */
  static async selectDraftTemplate(templateId: string, auditContext: ServiceAuditContext) {
    const template = await db.template.findUnique({ where: { id: templateId } });
    if (!template) return null;

    await db.$transaction(async (tx) => {
      const before = await tx.page.findUnique({
        where: { key: HOME_PAGE_KEY },
        select: { draftTemplateId: true },
      });

      await tx.page.update({
        where: { key: HOME_PAGE_KEY },
        data: { draftTemplateId: template.id, hasUnpublishedChanges: true },
      });

      await recordAudit({
        action: "TEMPLATE_CHANGED",
        entityType: "Page",
        summary: `Changed draft template to: ${template.name}`,
        before: { draftTemplateId: before?.draftTemplateId },
        after: { draftTemplateId: template.id, templateName: template.name },
        context: auditContext,
        tx,
      });
    });

    return template;
  }
}
