import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { safeRequireAdmin } from "@/lib/require-admin";
import { TechnologyService } from "@/services/technology.service";
import db from "@/lib/database";

/**
 * Minimal technology endpoints backing the inline "add skill" picker on the
 * project and experience edit pages.
 *
 * Deliberately narrow: the picker only ever needs `{ id, name }`, so neither
 * handler returns a full Technology row. Admin edit pages read the DRAFT
 * version (the admin works on drafts), so these do too — a newly added skill
 * is usable immediately without publishing.
 */

/** Admin edit pages resolve names off the DRAFT version; keep that consistent. */
const DRAFT_NAME_SELECT = {
  id: true,
  slug: true,
  versions: {
    where: { state: "DRAFT" as const },
    take: 1,
    orderBy: { createdAt: "desc" as const },
    select: { name: true, order: true },
  },
};

type TechRow = { id: string; slug: string; versions: { name: string; order: number }[] };

/** A technology has no name of its own — it lives on the version. */
function toPickerShape(t: TechRow) {
  return { id: t.id, name: t.versions[0]?.name || t.slug };
}

/** "React Native" -> "react-native". Matches the slug rules the service expects. */
function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** GET /api/technologies — list for the picker. Not used on mount (the page
 *  seeds the list server-side); this exists for an explicit resync. */
export async function GET(request: Request) {
  const { response } = await safeRequireAdmin(request);
  if (response) return response;

  const techs = await db.technology.findMany({
    where: { deletedAt: null },
    select: DRAFT_NAME_SELECT,
  });

  const items = techs
    .map((t) => ({ ...toPickerShape(t as TechRow), order: (t as TechRow).versions[0]?.order ?? 0 }))
    .sort((a, b) => a.order - b.order)
    .map(({ id, name }) => ({ id, name }));

  return NextResponse.json({ technologies: items });
}

/**
 * POST /api/technologies — quick-add a skill by name.
 *
 * Typing a skill that already exists is treated as "select that one" rather
 * than an error: it returns the existing record with `existed: true` and
 * creates nothing. For a skills list a repeated name almost always means the
 * skill is already there, and silently creating `react-2` would be a
 * data-quality problem.
 */
export async function POST(request: Request) {
  const { context, response } = await safeRequireAdmin(request);
  if (response) return response;

  let body: { name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "A skill name is required." }, { status: 400 });
  }
  if (name.length > 80) {
    return NextResponse.json({ error: "Skill name is too long (max 80 characters)." }, { status: 400 });
  }

  const slug = slugify(name);
  if (!slug) {
    return NextResponse.json(
      { error: "That name has no usable letters or numbers." },
      { status: 400 }
    );
  }

  // Already present → hand back the existing row; do not create a near-duplicate.
  //
  // Match on slug OR display name. Slug alone is not enough: existing rows
  // don't always agree with slugify() — "Node.js" is stored as `nodejs` while
  // slugify gives `node-js`, and "Express.js" as `expressjs` vs `express-js`.
  // A slug-only check would sail past those and create a second "Node.js".
  const existing = await db.technology.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { slug },
        { versions: { some: { state: "DRAFT", name: { equals: name, mode: "insensitive" } } } },
      ],
    },
    select: DRAFT_NAME_SELECT,
  });
  if (existing) {
    return NextResponse.json({ ...toPickerShape(existing as TechRow), existed: true });
  }

  // Same audit shape as admin/technologies/actions.ts getAuditContext().
  const reqHeaders = await headers();
  try {
    const created = await TechnologyService.createTechnology(
      { name, slug },
      {
        actorId: context.userId,
        loginMethod: context.loginMethod,
        loginAccountId: context.loginAccountId,
        ipAddress: reqHeaders.get("x-forwarded-for") || reqHeaders.get("x-real-ip") || undefined,
        userAgent: reqHeaders.get("user-agent") || undefined,
      }
    );

    return NextResponse.json(
      { id: created.tech.id, name: created.draft.name, existed: false },
      { status: 201 }
    );
  } catch (error: any) {
    // The duplicate check above is check-then-create, so two requests for the
    // same name can both pass it and race to the insert. The loser hits the slug
    // unique constraint. That is the same situation the check was guarding
    // against, so resolve it the same way — return the row that won — instead of
    // surfacing a 500 for what is really "that skill already exists".
    const isDuplicate =
      error?.code === "P2002" || /already exists/i.test(error?.message ?? "");
    if (isDuplicate) {
      // `deletedAt: null` matters here: the service's own slug check is not
      // scoped to live rows, so a soft-deleted technology can own the slug and
      // block creation. Handing that row back would silently link deleted
      // content to the project, so let it fall through to a real error instead.
      const winner = await db.technology.findFirst({
        where: { slug, deletedAt: null },
        select: DRAFT_NAME_SELECT,
      });
      if (winner) {
        return NextResponse.json({ ...toPickerShape(winner as TechRow), existed: true });
      }
    }
    throw error;
  }
}
