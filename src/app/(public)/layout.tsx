import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import { auth } from "@/lib/auth";
import { SessionProvider } from "next-auth/react";
import { PublicContentService } from "@/services/public-content.service";
import { text } from "@/lib/text";
import { Suspense } from "react";

async function SessionAwareNavbar({
  logoText,
  cvUrl,
  navLinks,
}: {
  logoText: string | null;
  cvUrl: string;
  navLinks: { label: string; href: string }[];
}) {
  // Auth reads request cookies. Stream it so the public CMS shell remains
  // cacheable while the owner-only navigation control stays request-correct.
  const session = await auth();
  return (
    <SessionProvider session={session}>
      <Navbar logoText={logoText} cvUrl={cvUrl} navLinks={navLinks} />
    </SessionProvider>
  );
}

function NavbarPlaceholder() {
  return <header className="pm-nav fixed top-0 left-0 right-0 h-[68px] z-[100]" aria-hidden="true" />;
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Social links apply immediately (no draft state) — they are simple
  // metadata, not page content. Resolution lives in PublicContentService.
  const { profile, socialLinks, navLinks } = await PublicContentService.getPublicChrome();

  // The wordmark falls back to the real name, never to a placeholder person.
  // An unset contact email yields null so the footer omits the link entirely
  // rather than publishing an address nobody owns.
  const logoText = text(profile?.logoText) || text(profile?.fullName);
  const cvUrl = profile?.cvFile?.url || "/resume";
  const contactEmail = text(profile?.contactEmail);

  return (
    <div className="public-cursor-zone min-h-screen flex flex-col transition-colors duration-300" style={{ backgroundColor: "var(--bg)" }}>

        {/* Dynamic Navbar */}
        <Suspense fallback={<NavbarPlaceholder />}>
          <SessionAwareNavbar logoText={logoText} cvUrl={cvUrl} navLinks={navLinks} />
        </Suspense>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col pt-[68px]">{children}</main>

        {/* Public Footer */}
        <Footer logoText={logoText} contactEmail={contactEmail} socialLinks={socialLinks} />
    </div>
  );
}
