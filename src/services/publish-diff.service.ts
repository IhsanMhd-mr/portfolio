import db from "@/lib/database";
import { SectionGroupService } from "./section-group.service";

/**
 * publish-diff.service — is there actually anything to publish?
 *
 * Why this exists: `Page.hasUnpublishedChanges` is a sticky one-way latch. Some
 * forty call sites across the services set it `true` on any write, and only a
 * successful publish sets it `false`. Nothing ever re-examines whether the edit
 * changed anything, so switching template A→B→A left it stuck `true` and the
 * publish page kept insisting there were changes to release.
 *
 * The old GET /api/publish check had the opposite failure too: it compared
 * section array *length*, so a reorder or a settings edit at equal count read
 * as "no changes".
 *
 * So this computes a real draft-vs-published comparison across all three axes
 * that a publish actually promotes: the template pointer, the section snapshot,
 * and the per-entity content versions.
 */

/**
 * The exact fields POST /api/publish copies DRAFT → PUBLISHED, per entity.
 *
 * This is the single source of truth: the publish route builds its `data`
 * objects from these lists and the diff compares on these lists. Keeping them
 * together is the point — a field added to promotion but not to the comparison
 * would be published while the UI reported nothing to publish.
 */
export const PROMOTED_FIELDS = {
  project: [
    "title", "summary", "category", "startDate", "endDate", "myRole", "problem",
    "solution", "mainFeatures", "systemArchitecture", "developmentProcess",
    "challenges", "solutionsDetail", "testing", "results", "lessonsLearned",
    "liveDemoUrl", "githubUrl", "reportUrl", "thumbnailId", "coverImageId",
    "architectureImageId", "visible", "manualOrder",
  ],
  technology: [
    "name", "category", "experienceLabel", "description", "logoId",
    "showInStack", "showInGame", "showOnResume", "visible", "order",
  ],
  timelineEntry: [
    "title", "entryType", "startDate", "endDate", "description", "status",
    "externalLinks", "visible", "order", "imageId",
  ],
  education: [
    "institution", "qualification", "startDate", "endDate", "isCurrent", "grade",
    "description", "modules", "showOnResume", "visible", "order", "logoId",
  ],
  experience: [
    "organization", "role", "startDate", "endDate", "isCurrent", "description",
    "responsibilities", "locationText", "workType", "showOnResume", "visible",
    "order", "logoId",
  ],
} as const;

/**
 * Project a draft version row down to just the promotable fields — the `data`
 * payload for the PUBLISHED upsert. Used by POST /api/publish so the promotion
 * and the diff above are driven by the identical field list.
 *
 * Generic on purpose: returning `Record<string, any>` would erase the field
 * types and Prisma's create() would stop enforcing that every required column
 * is present. `Pick<T, K>` keeps that check, so dropping a required field from
 * PROMOTED_FIELDS becomes a compile error rather than a runtime failure.
 */
export function pickPromoted<T, K extends keyof T>(row: T, fields: readonly K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const f of fields) out[f] = row[f];
  return out;
}

/**
 * Non-nullable Json columns that promotion coerces away from null.
 *
 * These matter to the diff, not just to the write. Publishing a timeline entry
 * whose draft `externalLinks` is null stores `{}` on the published row, and the
 * draft keeps its null — so a naive comparison reports that entry as changed on
 * every check, forever, and the publish button never goes quiet. Applying the
 * same defaults before comparing is what makes "already published" detectable.
 *
 * Shared with POST /api/publish for the same reason PROMOTED_FIELDS is: the
 * value written and the value compared have to be produced the same way.
 */
export const PROMOTION_DEFAULTS: Record<string, Record<string, unknown>> = {
  timelineEntry: { externalLinks: {} },
  experience: { responsibilities: [] },
};

export interface ChangedEntity {
  type: string;
  label: string;
}

export interface PublishDiff {
  hasTemplateDiff: boolean;
  hasSectionsDiff: boolean;
  hasContentDiff: boolean;
  draftTemplate: string;
  draftTemplateKey: string;
  publishedTemplate: string;
  draftSectionsCount: number;
  publishedSectionsCount: number;
  changedEntities: ChangedEntity[];
}

/**
 * Order-insensitive deep equality for the JSON-ish values these columns hold
 * (scalars, Dates, arrays, and Prisma Json objects).
 *
 * Dates are compared by epoch: the draft row and the published row are separate
 * database rows, so identical instants are never the same object, and a
 * reference or `toString` comparison would report every date field as changed
 * on every check.
 */
export function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a == null && b == null;

  if (a instanceof Date || b instanceof Date) {
    const at = a instanceof Date ? a.getTime() : new Date(a as string).getTime();
    const bt = b instanceof Date ? b.getTime() : new Date(b as string).getTime();
    return at === bt;
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => valuesEqual(v, b[i]));
  }

  if (typeof a === "object" && typeof b === "object") {
    const ak = Object.keys(a as object).sort();
    const bk = Object.keys(b as object).sort();
    if (ak.length !== bk.length || ak.some((k, i) => k !== bk[i])) return false;
    return ak.every((k) =>
      valuesEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])
    );
  }

  return false;
}

/**
 * Do the two version rows differ on any field publish would promote?
 *
 * Both sides are normalized through PROMOTION_DEFAULTS, not just the draft.
 * The coercion is genuinely two-directional in real data: timeline entries
 * have draft `externalLinks: null` against published `{}`, while the seeded
 * experience row has draft `responsibilities: []` against published `null`
 * (rows written before the coercion existed, or by the content scripts, which
 * do not apply it). Normalizing one side only leaves the other case reporting
 * a permanent phantom change.
 */
function versionsDiffer(
  draft: Record<string, unknown>,
  published: Record<string, unknown> | undefined,
  fields: readonly string[],
  defaults: Record<string, unknown> = {}
): boolean {
  if (!published) return true; // never published → publishing it is a change
  const norm = (row: Record<string, unknown>, f: string) =>
    f in defaults && row[f] == null ? defaults[f] : row[f];
  return fields.some((f) => !valuesEqual(norm(draft, f), norm(published, f)));
}

/**
 * The section snapshot shape, built exactly as POST /api/publish bakes it.
 * `order` is the final array index, not the per-container DB value — the array
 * order is authoritative (see the publish route).
 */
export function buildSectionsSnapshot(sections: any[]) {
  return sections.map((s, index) => ({
    id: s.id,
    type: s.type,
    internalLabel: s.internalLabel,
    order: index,
    visible: s.visible,
    settings: typeof s.settings === "string" ? JSON.parse(s.settings) : s.settings || {},
    animationPresetSlug: s.animationPresetSlug,
    animationDelay: s.animationDelay,
    animationStagger: s.animationStagger,
  }));
}

/**
 * Compare every draft against what is currently live.
 *
 * With no active PageVersion at all, everything counts as a change — that
 * matches the previous behaviour and is the correct answer for a site that has
 * never been published.
 */
export async function computePublishDiff(pageKey = "home"): Promise<PublishDiff | null> {
  const page = await db.page.findUnique({
    where: { key: pageKey },
    include: {
      draftTemplate: true,
      versions: { where: { isActive: true }, take: 1 },
    },
  });
  if (!page) return null;

  const draftTemplateKey = page.draftTemplate?.key || "MODERN_GLASS";
  const activeVersion = page.versions?.[0];

  // Same ordering algorithm and same visibility rule the publish route uses, so
  // the thing we compare is literally the snapshot a publish would write.
  const draftSections = await SectionGroupService.flattenOrdered(page.id, {
    visibleGroupsOnly: true,
  });
  const draftSnapshot = buildSectionsSnapshot(draftSections);

  let publishedSnapshot: any[] = [];
  if (activeVersion?.snapshot) {
    const parsed =
      typeof activeVersion.snapshot === "string"
        ? JSON.parse(activeVersion.snapshot)
        : activeVersion.snapshot;
    if (Array.isArray(parsed)) publishedSnapshot = parsed;
  }

  const hasTemplateDiff = activeVersion ? draftTemplateKey !== activeVersion.templateKey : true;
  const hasSectionsDiff = activeVersion ? !valuesEqual(draftSnapshot, publishedSnapshot) : true;

  const changedEntities = await collectChangedEntities();

  return {
    hasTemplateDiff,
    hasSectionsDiff,
    hasContentDiff: changedEntities.length > 0,
    draftTemplate: page.draftTemplate?.name || "None",
    draftTemplateKey,
    publishedTemplate: activeVersion?.templateKey || "None",
    draftSectionsCount: draftSnapshot.length,
    publishedSectionsCount: publishedSnapshot.length,
    changedEntities,
  };
}

/**
 * Per-entity DRAFT-vs-PUBLISHED comparison.
 *
 * Loads both states for all five versioned types and pairs them in memory:
 * `@@unique([entityId, state])` guarantees at most one version per state, so a
 * Map keyed by the parent id is an exact pairing. Ten queries total rather than
 * one lookup per draft row.
 */
async function collectChangedEntities(): Promise<ChangedEntity[]> {
  const changed: ChangedEntity[] = [];

  const [
    projects, technologies, timeline, education, experience,
  ] = await Promise.all([
    db.projectVersion.findMany(),
    db.technologyVersion.findMany(),
    db.timelineEntryVersion.findMany(),
    db.educationVersion.findMany(),
    db.experienceVersion.findMany(),
  ]);

  const groups = [
    { type: "Project", rows: projects, key: "projectId", entity: "project", fields: PROMOTED_FIELDS.project, label: (r: any) => r.title },
    { type: "Technology", rows: technologies, key: "technologyId", entity: "technology", fields: PROMOTED_FIELDS.technology, label: (r: any) => r.name },
    { type: "Timeline", rows: timeline, key: "timelineEntryId", entity: "timelineEntry", fields: PROMOTED_FIELDS.timelineEntry, label: (r: any) => r.title },
    { type: "Education", rows: education, key: "educationId", entity: "education", fields: PROMOTED_FIELDS.education, label: (r: any) => r.institution },
    { type: "Experience", rows: experience, key: "experienceId", entity: "experience", fields: PROMOTED_FIELDS.experience, label: (r: any) => r.organization },
  ] as const;

  for (const g of groups) {
    const defaults = PROMOTION_DEFAULTS[g.entity] ?? {};
    const publishedByParent = new Map<string, any>();
    for (const row of g.rows as any[]) {
      if (row.state === "PUBLISHED") publishedByParent.set(row[g.key], row);
    }
    for (const row of g.rows as any[]) {
      if (row.state !== "DRAFT") continue;
      if (versionsDiffer(row, publishedByParent.get(row[g.key]), g.fields, defaults)) {
        changed.push({ type: g.type, label: g.label(row) || "(untitled)" });
      }
    }
  }

  return changed;
}
