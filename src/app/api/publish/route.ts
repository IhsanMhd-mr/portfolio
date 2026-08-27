import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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

    // Timestamp stamped onto every PUBLISHED row this run touches. It is NOT a
    // promoted field — copying the draft's value would be meaningless, and
    // including it in PROMOTED_FIELDS would make every entity compare unequal on
    // every check. Nothing set this column before, so the admin project list's
    // "Published: <date>" display could never render.
    const publishedAt = new Date();

    const runPublish = () => db.$transaction(async (tx) => {
      // Version numbering lives inside the transaction so it reads through `tx`.
      // That alone does not serialize concurrent publishes at READ COMMITTED —
      // two callers can still observe the same max — so the real guard is the
      // @@unique([pageId, versionNumber]) constraint plus the P2002 retry below.
      const latestVersion = await tx.pageVersion.findFirst({
        where: { pageId: page.id },
        orderBy: { versionNumber: "desc" },
      });
      const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

      // Soft-deleted content is excluded from promotion: publishing should not
      // write to entities the admin has deleted. Consequence: a deleted entity's
      // PUBLISHED row stays frozen, so after restore() its draft may differ and
      // it correctly reappears as a pending change. The public site is unaffected
      // either way — every public read already filters deletedAt.
      const draftProjects = await tx.projectVersion.findMany({
        where: { state: "DRAFT", project: { deletedAt: null } },
      });
      const publishedprojectVersion = new Map(
        (await tx.projectVersion.findMany({ where: { state: "PUBLISHED" } })).map((r) => [r.projectId, r])
      );
      for (const draft of draftProjects) {
        const pub = publishedprojectVersion.get(draft.projectId);
        // `metrics` is a NULLABLE Json column, so a bare null is not a valid
        // write — Prisma requires the DbNull sentinel to mean "SQL NULL" (a
        // plain null is reserved for "leave unchanged"). Reading it back yields
        // null again, so the diff still compares equal without a defaults entry.
        const data = {
          ...pickPromoted(draft, PROMOTED_FIELDS.project),
          metrics: draft.metrics ?? Prisma.DbNull,
          publishedAt,
        };
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
        where: { state: "DRAFT", technology: { deletedAt: null } },
      });
      const publishedtechnologyVersion = new Map(
        (await tx.technologyVersion.findMany({ where: { state: "PUBLISHED" } })).map((r) => [r.technologyId, r])
      );
      for (const draft of draftTechs) {
        const pub = publishedtechnologyVersion.get(draft.technologyId);
        const data = { ...pickPromoted(draft, PROMOTED_FIELDS.technology), publishedAt };
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
        where: { state: "DRAFT", timelineEntry: { deletedAt: null } },
      });
      const publishedtimelineEntryVersion = new Map(
        (await tx.timelineEntryVersion.findMany({ where: { state: "PUBLISHED" } })).map((r) => [r.timelineEntryId, r])
      );
      for (const draft of draftTimeline) {
        const pub = publishedtimelineEntryVersion.get(draft.timelineEntryId);
        // externalLinks is a non-nullable Json column; PROMOTION_DEFAULTS holds
        // the same coercion the diff applies before comparing.
        const data = {
          ...pickPromoted(draft, PROMOTED_FIELDS.timelineEntry),
          externalLinks: draft.externalLinks ?? (PROMOTION_DEFAULTS.timelineEntry.externalLinks as object),
          publishedAt,
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
        where: { state: "DRAFT", education: { deletedAt: null } },
      });
      const publishededucationVersion = new Map(
        (await tx.educationVersion.findMany({ where: { state: "PUBLISHED" } })).map((r) => [r.educationId, r])
      );
      for (const draft of draftEdu) {
        const pub = publishededucationVersion.get(draft.educationId);
        const data = { ...pickPromoted(draft, PROMOTED_FIELDS.education), publishedAt };
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
        where: { state: "DRAFT", experience: { deletedAt: null } },
      });
      const publishedexperienceVersion = new Map(
        (await tx.experienceVersion.findMany({ where: { state: "PUBLISHED" } })).map((r) => [r.experienceId, r])
      );
      for (const draft of draftExp) {
        const pub = publishedexperienceVersion.get(draft.experienceId);
        // responsibilities is a non-nullable Json column; see PROMOTION_DEFAULTS.
        const data = {
          ...pickPromoted(draft, PROMOTED_FIELDS.experience),
          responsibilities: draft.responsibilities ?? (PROMOTION_DEFAULTS.experience.responsibilities as object),
          publishedAt,
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
    }, {
      // Prisma's interactive-transaction default is 5s, and this transaction was
      // already close to it: promotion touches five entity types and writes one
      // row each. It tipped over once the DRAFT queries gained a deletedAt join.
      // The N+1 `findFirst` per draft has since been batched into the five Maps
      // above, which is the real fix; this is headroom for a cold Neon connection
      // (measured 5-14s) rather than a licence to do more work in here.
      timeout: 30_000,
      maxWait: 10_000,
    });

    // Retry once on a version-number collision. Two publishes racing can read the
    // same max inside their own transactions and both try to write it; the loser
    // hits @@unique([pageId, versionNumber]) as P2002. Retrying re-reads the max,
    // which is now committed, so the second attempt lands on the next number.
    // A single retry is enough for the realistic case (a double-click, two tabs);
    // a genuine stampede would be a different problem.
    let newVersion;
    try {
      newVersion = await runPublish();
    } catch (error: any) {
      if (error?.code === "P2002") {
        newVersion = await runPublish();
      } else {
        throw error;
      }
    }

    // Invalidate caches
    revalidatePath("/");
    revalidatePath("/projects");
    revalidatePath("/timeline");
    revalidatePath("/resume");

    return NextResponse.json({ success: true, version: newVersion.versionNumber });
  } catch (error: any) {
    console.error("POST publish error:", error);
    return NextResponse.json({ error: error.message || "Failed to publish page" }, { status: 500 });
  }
}
