import { Prisma } from "@prisma/client";
import db from "@/lib/database";
import { recordAudit } from "@/lib/audit";
import { SectionGroupService } from "./section-group.service";
import { HOME_PAGE_KEY } from "./page.service";
import {
  computePublishDiff,
  buildSectionsSnapshot,
  PROMOTED_FIELDS,
  PROMOTION_DEFAULTS,
  pickPromoted,
} from "./publish-diff.service";

type AuditContext = {
  actorId: string;
  loginMethod: string;
  loginAccountId: string | null;
};

/**
 * PublishService — DRAFT → PUBLISHED promotion for the whole site.
 *
 * This is the highest-consequence operation in the codebase: it decides what
 * every visitor sees. A few properties are load-bearing and easy to break.
 *
 *   - **PROMOTED_FIELDS is the single source of truth.** It drives promotion
 *     here AND change detection in publish-diff.service. A column missing from
 *     it is invisible to both at once, so publishing silently never updates it
 *     while the UI truthfully reports "nothing to publish". That happened once
 *     already, to `status`, `featured` and `showOnResume`.
 *     `scripts/check-promoted-fields.js` fails the build on a new omission —
 *     keep `npm run check:promoted` green.
 *
 *   - **Soft-deleted content is excluded.** Publishing must not write to
 *     entities the admin deleted. Consequence: a deleted entity's PUBLISHED row
 *     stays frozen, so after restore its draft may differ and it correctly
 *     reappears as a pending change. Public reads filter `deletedAt` anyway.
 *
 *   - **The snapshot is built with the same function the diff compares
 *     against**, so what ships is byte-for-byte what the confirmation screen
 *     showed.
 */
export type PublishResult =
  | { ok: true; versionNumber: number }
  | { ok: false; reason: "no-page-or-template" };

export class PublishService {
  /**
   * What a publish would change, for the confirmation screen.
   *
   * Also self-heals `hasUnpublishedChanges`. That flag is a sticky latch — set
   * by every service write, cleared only on publish — so an edit that was
   * reverted (template A→B→A was the reported case) left it stuck true
   * forever. Now that the diff can tell there is genuinely nothing to publish,
   * clear it; this is what drops the "unpublished changes" chip in the sidebar.
   */
  static async getStatus() {
    const page = await db.page.findUnique({
      where: { key: HOME_PAGE_KEY },
      select: { id: true, hasUnpublishedChanges: true },
    });
    if (!page) return null;

    const diff = await computePublishDiff(HOME_PAGE_KEY);
    if (!diff) return null;

    const anyChange = diff.hasTemplateDiff || diff.hasSectionsDiff || diff.hasContentDiff;

    if (!anyChange && page.hasUnpublishedChanges) {
      await db.page.update({ where: { id: page.id }, data: { hasUnpublishedChanges: false } });
    }

    // The admin-facing section list still shows hidden groups — it is a summary
    // of what exists, not of what would ship.
    const allSections = await SectionGroupService.flattenOrdered(page.id, {
      visibleGroupsOnly: false,
    });

    return {
      ...diff,
      hasUnpublishedChanges: anyChange,
      sectionsList: allSections.map((s) => ({
        id: s.id,
        label: s.internalLabel,
        type: s.type,
        visible: s.visible,
        order: s.order,
      })),
    };
  }

  /** Promotes every draft, writes a new PageVersion snapshot, activates the template. */
  static async publishHomePage(context: AuditContext & { userId: string }): Promise<PublishResult> {
    const page = await db.page.findUnique({
      where: { key: HOME_PAGE_KEY },
      include: { draftTemplate: true },
    });

    if (!page || !page.draftTemplate) return { ok: false, reason: "no-page-or-template" };

    // Bake the live grouped ordering into the snapshot at publish time, using
    // the SAME algorithm the public render uses — hidden groups excluded here,
    // matching how individually-hidden sections have always been excluded from
    // what actually ships (their own `visible` flag is still carried per-entry
    // for the admin diff view).
    const orderedSections = await SectionGroupService.flattenOrdered(page.id, {
      visibleGroupsOnly: true,
    });
    const sectionsSnapshot = buildSectionsSnapshot(orderedSections);

    const auditCtx: AuditContext = {
      actorId: context.actorId,
      loginMethod: context.loginMethod,
      loginAccountId: context.loginAccountId,
    };

    // Stamped onto every PUBLISHED row this run touches. NOT a promoted field —
    // copying the draft's value would be meaningless, and including it in
    // PROMOTED_FIELDS would make every entity compare unequal on every check.
    const publishedAt = new Date();

    const runPublish = () =>
      db.$transaction(
        async (tx) => {
          // Version numbering reads through `tx`. That alone does not serialize
          // concurrent publishes at READ COMMITTED — two callers can still
          // observe the same max — so the real guard is
          // @@unique([pageId, versionNumber]) plus the P2002 retry below.
          const latestVersion = await tx.pageVersion.findFirst({
            where: { pageId: page.id },
            orderBy: { versionNumber: "desc" },
          });
          const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

          // Each entity type: read all drafts, read all published into a Map,
          // then upsert. The Map is what keeps this out of an N+1 — an earlier
          // version issued a findFirst per draft and pushed the transaction
          // past its timeout.
          const draftProjects = await tx.projectVersion.findMany({
            where: { state: "DRAFT", project: { deletedAt: null } },
          });
          const publishedProjects = new Map(
            (await tx.projectVersion.findMany({ where: { state: "PUBLISHED" } })).map((r) => [
              r.projectId,
              r,
            ])
          );
          for (const draft of draftProjects) {
            const pub = publishedProjects.get(draft.projectId);
            // `metrics` is a NULLABLE Json column, so a bare null is not a valid
            // write — Prisma requires the DbNull sentinel to mean "SQL NULL" (a
            // plain null is reserved for "leave unchanged"). Reading it back
            // yields null again, so the diff still compares equal.
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

          const draftTechs = await tx.technologyVersion.findMany({
            where: { state: "DRAFT", technology: { deletedAt: null } },
          });
          const publishedTechs = new Map(
            (await tx.technologyVersion.findMany({ where: { state: "PUBLISHED" } })).map((r) => [
              r.technologyId,
              r,
            ])
          );
          for (const draft of draftTechs) {
            const pub = publishedTechs.get(draft.technologyId);
            const data = { ...pickPromoted(draft, PROMOTED_FIELDS.technology), publishedAt };
            if (pub) {
              await tx.technologyVersion.update({ where: { id: pub.id }, data });
            } else {
              await tx.technologyVersion.create({
                data: { ...data, technologyId: draft.technologyId, state: "PUBLISHED" },
              });
            }
          }

          const draftTimeline = await tx.timelineEntryVersion.findMany({
            where: { state: "DRAFT", timelineEntry: { deletedAt: null } },
          });
          const publishedTimeline = new Map(
            (await tx.timelineEntryVersion.findMany({ where: { state: "PUBLISHED" } })).map((r) => [
              r.timelineEntryId,
              r,
            ])
          );
          for (const draft of draftTimeline) {
            const pub = publishedTimeline.get(draft.timelineEntryId);
            // externalLinks is a non-nullable Json column; PROMOTION_DEFAULTS
            // holds the same coercion the diff applies before comparing.
            const data = {
              ...pickPromoted(draft, PROMOTED_FIELDS.timelineEntry),
              externalLinks:
                draft.externalLinks ?? (PROMOTION_DEFAULTS.timelineEntry.externalLinks as object),
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

          const draftEdu = await tx.educationVersion.findMany({
            where: { state: "DRAFT", education: { deletedAt: null } },
          });
          const publishedEdu = new Map(
            (await tx.educationVersion.findMany({ where: { state: "PUBLISHED" } })).map((r) => [
              r.educationId,
              r,
            ])
          );
          for (const draft of draftEdu) {
            const pub = publishedEdu.get(draft.educationId);
            const data = { ...pickPromoted(draft, PROMOTED_FIELDS.education), publishedAt };
            if (pub) {
              await tx.educationVersion.update({ where: { id: pub.id }, data });
            } else {
              await tx.educationVersion.create({
                data: { ...data, educationId: draft.educationId, state: "PUBLISHED" },
              });
            }
          }

          const draftExp = await tx.experienceVersion.findMany({
            where: { state: "DRAFT", experience: { deletedAt: null } },
          });
          const publishedExp = new Map(
            (await tx.experienceVersion.findMany({ where: { state: "PUBLISHED" } })).map((r) => [
              r.experienceId,
              r,
            ])
          );
          for (const draft of draftExp) {
            const pub = publishedExp.get(draft.experienceId);
            // responsibilities is a non-nullable Json column; see PROMOTION_DEFAULTS.
            const data = {
              ...pickPromoted(draft, PROMOTED_FIELDS.experience),
              responsibilities:
                draft.responsibilities ??
                (PROMOTION_DEFAULTS.experience.responsibilities as object),
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

          // Layout snapshot.
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

          await tx.page.update({
            where: { id: page.id },
            data: { hasUnpublishedChanges: false },
          });

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
        },
        {
          // Prisma's interactive-transaction default is 5s, and this was already
          // close to it. The batched Maps above are the real fix; this is
          // headroom for a cold Neon connection (measured 5-14s) rather than a
          // licence to do more work in here.
          timeout: 30_000,
          maxWait: 10_000,
        }
      );

    // Retry once on a version-number collision. Two publishes racing can read
    // the same max inside their own transactions and both try to write it; the
    // loser hits @@unique([pageId, versionNumber]) as P2002. Retrying re-reads
    // the max, now committed, so the second attempt lands on the next number.
    // One retry covers the realistic case (a double-click, two tabs); a genuine
    // stampede would be a different problem.
    let newVersion;
    try {
      newVersion = await runPublish();
    } catch (error: unknown) {
      if ((error as { code?: string })?.code === "P2002") {
        newVersion = await runPublish();
      } else {
        throw error;
      }
    }

    return { ok: true, versionNumber: newVersion.versionNumber };
  }

  /**
   * Public routes whose content a publish can change.
   *
   * `/contact` is deliberately absent: it renders the site profile and social
   * links, both of which are UNVERSIONED and already live at the moment they
   * are edited, so a publish cannot change what it shows.
   *
   * `/about` and `/projects/[slug]` were both missing before — /about renders
   * education and experience, and the detail pages render project versions.
   */
  static readonly REVALIDATE_PATHS = [
    "/",
    "/projects",
    "/timeline",
    "/resume",
    "/about",
  ] as const;

  /** Dynamic routes need the "page" variant to invalidate every instance. */
  static readonly REVALIDATE_DYNAMIC_PATHS = ["/projects/[slug]"] as const;
}

