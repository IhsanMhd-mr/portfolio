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

import { resolvePreviewMode } from "@/lib/preview-mode";
import { PublicContentService } from "@/services/public-content.service";
import { ThemeProvider } from "@/components/providers/theme-provider";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Session-validated, not cookie-trusted — see lib/preview-mode.ts
  const isPreview = await resolvePreviewMode();

  let templateKey = "MODERN_GLASS";
  let defaultTheme = "light";

  try {
    // Both go through PublicContentService so they share its request-cached
    // page/profile reads with the page and its metadata, instead of issuing a
    // third independent copy of the same two queries per render.
    const [resolvedTemplateKey, siteProfile] = await Promise.all([
      PublicContentService.resolveTemplateKey(isPreview),
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

