import type { Metadata } from "next";
import {
  Newsreader,
  Figtree,
  IBM_Plex_Mono,
  Space_Grotesk,
  DM_Sans,
  JetBrains_Mono,
  Syne,
  Manrope,
  Space_Mono,
} from "next/font/google";
import "./globals.css";

/* ==========================================================================
   Google Font Loaders
   See: frontend_design_spec.md §1.8
   Only the active template's fonts are actually rendered (CSS variable swap),
   but we load all upfront for instant template switching in the admin.
   ========================================================================== */

// --- Template 1: Professional Minimal ---
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

// --- Template 2: Modern Glass ---
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600"],
});

// --- Template 3: Interactive 3D ---
const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  display: "swap",
  weight: ["700", "800"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "700"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
});

/* Combine all font CSS variable classes */
const fontVariables = [
  newsreader.variable,
  figtree.variable,
  ibmPlexMono.variable,
  spaceGrotesk.variable,
  dmSans.variable,
  jetbrainsMono.variable,
  syne.variable,
  manrope.variable,
  spaceMono.variable,
].join(" ");

/* ==========================================================================
   Metadata
   ========================================================================== */

export const metadata: Metadata = {
  title: "Developer Portfolio",
  description:
    "Full-stack developer portfolio with admin CMS, visual page builder, and three selectable templates.",
};

/* ==========================================================================
   Root Layout
   ========================================================================== */

import { PublicContentService } from "@/services/public-content.service";
import { ThemeProvider } from "@/components/providers/theme-provider";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /**
   * The admin zone does not use the public template.
   * `[data-admin="true"]` (src/styles/admin.css) redefines every template token
   * admin renders with, so resolving which public skin is active costs three
   * queries (pages + page_versions + templates) whose result is discarded on
   * every admin request.
   *
   * This skips ALL admin routes. `/admin/templates` used to be excepted so its
   * live preview started from the real skin, but that exception was doing
   * nothing useful and could not work in the common case:
   *
   *   - The page resolves its own skin anyway. admin/templates/page.tsx fetches
   *     /api/publish in a useEffect and writes `data-template` onto
   *     documentElement itself, overwriting whatever was server-rendered.
   *   - A root layout is shared by every route, and the App Router does not
   *     re-render shared layouts on client-side navigation. Reaching
   *     /admin/templates from the sidebar — the normal way in — never re-ran
   *     this code, so the exception simply did not apply.
   *
   * So it only ever fired on a hard load, where it spent three queries whose
   * result was immediately replaced. Trade-off of removing it: on a hard load
   * of /admin/templates the preview cards may show the default skin for the few
   * hundred ms before that effect runs.
   *
   * NOTE the direction of the test. `x-pathname` is set by proxy.ts, whose
   * matcher is ["/admin/:path*", "/"] — it is EMPTY on /about, /projects, etc.
   * So this must skip only when we positively know we're on an admin route;
   * inverting it ("resolve only if known") would strip the template from every
   * non-homepage public page.
   */
  let templateKey = "MODERN_GLASS";
  let defaultTheme = "light";

  try {
    // Both go through PublicContentService so they share its request-cached
    // page/profile reads with the page and its metadata, instead of issuing a
    // third independent copy of the same two queries per render.
    // getSiteProfile() is always needed — admin reads defaultTheme from it.
    const [resolvedTemplateKey, siteProfile] = await Promise.all([
      PublicContentService.resolveTemplateKey(),
      PublicContentService.getSiteProfile(),
    ]);
    templateKey = resolvedTemplateKey;
    if (siteProfile?.defaultTheme) {
      defaultTheme = siteProfile.defaultTheme;
    }
  } catch (error) {
    console.error("Failed to load active template from database:", error);
  }

  const templateMap: Record<string, string> = {
    PROFESSIONAL_MINIMAL: "minimal",
    MODERN_GLASS: "glass",
    INTERACTIVE_3D: "threed",
  };
  const templateSlug = templateMap[templateKey] || "glass";

  return (
    <html
      lang="en"
      data-template={templateSlug}
      className={`${fontVariables} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider
          attribute={["class", "data-theme"]}
          defaultTheme={defaultTheme}
          enableSystem
          disableTransitionOnChange
          storageKey="portfolio-theme"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

