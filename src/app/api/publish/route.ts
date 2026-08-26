import { NextResponse } from "next/server";
import db from "@/lib/database";
import { safeRequireAdmin } from "@/lib/require-admin";
import { recordAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { SectionGroupService } from "@/services/section-group.service";
import {
  computePublishDiff,
  buildSectionsSnapshot,
  PROMOTED_FIELDS,
  PROMOTION_DEFAULTS,
  pickPromoted,
} from "@/services/publish-diff.service";

// GET - Real draft-vs-live difference (template, section snapshot, entity content)
export async function GET(request: Request) {
  const { response } = await safeRequireAdmin(request);
  if (response) return response;

  try {
    const page = await db.page.findUnique({
      where: { key: "home" },
      select: { id: true, hasUnpublishedChanges: true },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const diff = await computePublishDiff("home");
    if (!diff) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const anyChange = diff.hasTemplateDiff || diff.hasSectionsDiff || diff.hasContentDiff;

    // Self-heal the sticky latch. `hasUnpublishedChanges` is set true by every
    // service write and cleared only on publish, so an edit that was reverted
    // (template A→B→A being the reported case) left it stuck true forever.
    // Now that we can tell there is genuinely nothing to publish, clear it —
    // this is also what drops the "unpublished changes" chip in the admin
    // sidebar, which reads the same flag on every admin page load.
    if (!anyChange && page.hasUnpublishedChanges) {
      await db.page.update({ where: { id: page.id }, data: { hasUnpublishedChanges: false } });
    }

    // The admin-facing section list still shows hidden groups — it is a summary
    // of what exists, not of what would ship.
    const allSections = await SectionGroupService.flattenOrdered(page.id, { visibleGroupsOnly: false });

    return NextResponse.json({
      ...diff,
      hasUnpublishedChanges: anyChange,
      sectionsList: allSections.map((s) => ({
        id: s.id,
        label: s.internalLabel,
        type: s.type,
        visible: s.visible,
        order: s.order,
      })),
    });
  } catch (error) {
    console.error("GET publish info error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Atomic Transactional Promotion of all Draft Content to Published State
export async function POST(request: Request) {
  const { context, response } = await safeRequireAdmin(request);
  if (response) return response;

  try {
    const page = await db.page.findUnique({
      where: { key: "home" },
      include: { draftTemplate: true },
    });

    if (!page || !page.draftTemplate) {
      return NextResponse.json({ error: "Draft template or page not found" }, { status: 400 });
    }

    const latestVersion = await db.pageVersion.findFirst({
      where: { pageId: page.id },
      orderBy: { versionNumber: "desc" },
    });
    const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    // Bake the live grouped ordering into the snapshot at publish time, using
    // the SAME algorithm preview uses (Phase 5 §11/§18/§19) — hidden groups
    // excluded here, matching how individually-hidden sections have always
    // been excluded from what actually ships (their own `visible` flag is
    // still carried per-entry for the admin diff view / potential rollback).
    const orderedSections = await SectionGroupService.flattenOrdered(page.id, { visibleGroupsOnly: true });
    // buildSectionsSnapshot is shared with the GET diff, so the snapshot we
    // write is byte-for-byte the thing the diff compared against.
    const sectionsSnapshot = buildSectionsSnapshot(orderedSections);

    const auditCtx = {
      actorId: context.userId,
      loginMethod: context.loginMethod,
      loginAccountId: context.loginAccountId,
    };

    const newVersion = await db.$transaction(async (tx) => {
      // 1. Projects versions promotion
      const draftProjects = await tx.projectVersion.findMany({
        where: { state: "DRAFT" },
      });
      for (const draft of draftProjects) {
        const pub = await tx.projectVersion.findFirst({
          where: { projectId: draft.projectId, state: "PUBLISHED" },
        });
        const data = pickPromoted(draft, PROMOTED_FIELDS.project);
        if (pub) {
          await tx.projectVersion.update({ where: { id: pub.id }, data });
        } else {
          await tx.projectVersion.create({
            data: { ...data, projectId: draft.projectId, state: "PUBLISHED" },
          });
        }
      }

      // 2. Technologies versions promotion
      const draftTechs = await tx.technologyVersion.findMany({
        where: { state: "DRAFT" },
      });
      for (const draft of draftTechs) {
        const pub = await tx.technologyVersion.findFirst({
          where: { technologyId: draft.technologyId, state: "PUBLISHED" },
        });
        const data = pickPromoted(draft, PROMOTED_FIELDS.technology);
        if (pub) {
          await tx.technologyVersion.update({ where: { id: pub.id }, data });
        } else {
          await tx.technologyVersion.create({
            data: { ...data, technologyId: draft.technologyId, state: "PUBLISHED" },
          });
        }
      }

      // 3. Timeline Entries versions promotion
      const draftTimeline = await tx.timelineEntryVersion.findMany({
        where: { state: "DRAFT" },
      });
      for (const draft of draftTimeline) {
        const pub = await tx.timelineEntryVersion.findFirst({
          where: { timelineEntryId: draft.timelineEntryId, state: "PUBLISHED" },
        });
        // externalLinks is a non-nullable Json column; PROMOTION_DEFAULTS holds
        // the same coercion the diff applies before comparing.
        const data = {
          ...pickPromoted(draft, PROMOTED_FIELDS.timelineEntry),
          externalLinks: draft.externalLinks ?? (PROMOTION_DEFAULTS.timelineEntry.externalLinks as object),
        };
        if (pub) {
          await tx.timelineEntryVersion.update({ where: { id: pub.id }, data });
        } else {
          await tx.timelineEntryVersion.create({
            data: { ...data, timelineEntryId: draft.timelineEntryId, state: "PUBLISHED" },
          });
        }
      }

      // 4. Education versions promotion
      const draftEdu = await tx.educationVersion.findMany({
        where: { state: "DRAFT" },
      });
      for (const draft of draftEdu) {
        const pub = await tx.educationVersion.findFirst({
          where: { educationId: draft.educationId, state: "PUBLISHED" },
        });
        const data = pickPromoted(draft, PROMOTED_FIELDS.education);
        if (pub) {
          await tx.educationVersion.update({ where: { id: pub.id }, data });
        } else {
          await tx.educationVersion.create({
            data: { ...data, educationId: draft.educationId, state: "PUBLISHED" },
          });
        }
      }

      // 5. Experience versions promotion
      const draftExp = await tx.experienceVersion.findMany({
        where: { state: "DRAFT" },
      });
      for (const draft of draftExp) {
        const pub = await tx.experienceVersion.findFirst({
          where: { experienceId: draft.experienceId, state: "PUBLISHED" },
        });
        // responsibilities is a non-nullable Json column; see PROMOTION_DEFAULTS.
        const data = {
          ...pickPromoted(draft, PROMOTED_FIELDS.experience),
          responsibilities: draft.responsibilities ?? (PROMOTION_DEFAULTS.experience.responsibilities as object),
        };
        if (pub) {
          await tx.experienceVersion.update({ where: { id: pub.id }, data });
        } else {
          await tx.experienceVersion.create({
            data: { ...data, experienceId: draft.experienceId, state: "PUBLISHED" },
          });
        }
      }

      // 6. Save current layout snapshot as page version record
      await tx.pageVersion.updateMany({
        where: { pageId: page.id, isActive: true },
        data: { isActive: false },
      });

      const newVer = await tx.pageVersion.create({
        data: {
          pageId: page.id,
          versionNumber: nextVersionNumber,
          templateKey: page.draftTemplate!.key,
          snapshot: sectionsSnapshot,
          isActive: true,
          publishedById: context.userId,
        },
      });

      await tx.page.update({ where: { id: page.id }, data: { hasUnpublishedChanges: false } });

      await tx.template.updateMany({ data: { isActiveLive: false } });
      await tx.template.update({
        where: { id: page.draftTemplateId! },
        data: { isActiveLive: true },
      });

      await recordAudit({
        action: "PAGE_PUBLISHED",
        entityType: "PageVersion",
        entityId: newVer.id,
        summary: `Published layout snapshot version #${nextVersionNumber}`,
        context: auditCtx,
        tx,
      });

      return newVer;
    });

    // Invalidate caches
    revalidatePath("/");
    revalidatePath("/projects");
    revalidatePath("/timeline");
    revalidatePath("/resume");

    return NextResponse.json({ success: true, version: nextVersionNumber });
  } catch (error: any) {
    console.error("POST publish error:", error);
    return NextResponse.json({ error: error.message || "Failed to publish page" }, { status: 500 });
  }
}
