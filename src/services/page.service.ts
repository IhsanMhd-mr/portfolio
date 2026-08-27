import db from "@/lib/database";

/**
 * PageService — the `Page` singleton lookup.
 *
 * `db.page.findUnique({ where: { key: "home" } })` appears across the admin
 * shell, the page builder and its actions, the publish route, the templates
 * route and the dashboard, each with its own `select` and its own handling of
 * the missing-row case. The row itself is created by `npm run initialize`, so
 * "not found" means a broken install rather than an ordinary empty state —
 * which is worth saying once here instead of eight times at the call sites.
 *
 * Deliberately thin. This is a singleton lookup, not a domain: page
 * composition belongs to SectionGroupService and PageSectionService.
 */

/** The key of the one page this CMS manages. */
export const HOME_PAGE_KEY = "home";

export class PageService {
  /** The home page id, or null when the row is missing. */
  static async getHomePageId(): Promise<string | null> {
    const page = await db.page.findUnique({
      where: { key: HOME_PAGE_KEY },
      select: { id: true },
    });
    return page?.id ?? null;
  }

  /**
   * The home page id, throwing when absent.
   *
   * For callers that cannot render anything useful without it — a server
   * action has no way to show the "run npm run initialize" hint a page can.
   */
  static async requireHomePageId(): Promise<string> {
    const id = await PageService.getHomePageId();
    if (!id) {
      throw new Error(
        "Homepage record not found. Run `npm run initialize` to repair the installation."
      );
    }
    return id;
  }

  /** The home page row with its unpublished-changes flag. */
  static async getHomePage() {
    return db.page.findUnique({ where: { key: HOME_PAGE_KEY } });
  }

  /**
   * Flags the home page as having unpublished changes.
   *
   * `.catch(() => {})` matches the existing call sites: this is an advisory
   * indicator, and failing to set it must never fail the write that triggered
   * it.
   */
  static async markDirty(): Promise<void> {
    await db.page
      .update({ where: { key: HOME_PAGE_KEY }, data: { hasUnpublishedChanges: true } })
      .catch(() => {});
  }
}
