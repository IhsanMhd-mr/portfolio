import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { safeRequireAdmin } from "@/lib/require-admin";
import { TechnologyService } from "@/services/technology.service";

/**
 * Minimal technology endpoints backing the inline "add skill" picker on the
 * project and experience edit pages.
 *
 * Deliberately narrow: the picker only ever needs `{ id, name }`, so neither
 * handler returns a full Technology row. Admin edit pages read the DRAFT
 * version (the admin works on drafts), so these do too — a newly added skill
 * is usable immediately without publishing.
 */

/** GET /api/technologies — list for the picker. Not used on mount (the page
 *  seeds the list server-side); this exists for an explicit resync. */
export async function GET(request: Request) {
  const { response } = await safeRequireAdmin(request);
  if (response) return response;

  const items = await TechnologyService.listPickerOptions();

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

  // Dedupe rules, slug derivation and the create-race resolution all live in
  // TechnologyService.quickAdd — they are domain rules about what counts as
  // "the same skill", not HTTP concerns.
  const reqHeaders = await headers();
  try {
    const result = await TechnologyService.quickAdd(name, {
      actorId: context.userId,
      loginMethod: context.loginMethod,
      loginAccountId: context.loginAccountId,
      ipAddress: reqHeaders.get("x-forwarded-for") || reqHeaders.get("x-real-ip") || undefined,
      userAgent: reqHeaders.get("user-agent") || undefined,
    });

    return NextResponse.json(result, { status: result.existed ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/no usable letters or numbers/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    throw error;
  }
}
