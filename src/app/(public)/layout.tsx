import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import { auth } from "@/lib/auth";
import { SessionProvider } from "next-auth/react";
import { PublicContentService } from "@/services/public-content.service";
import { text } from "@/lib/text";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Social links apply immediately (no draft state) — they are simple
  // metadata, not page content. Resolution lives in PublicContentService.
  const { profile, socialLinks, navLinks } = await PublicContentService.getPublicChrome();

  const session = await auth();

  // The wordmark falls back to the real name, never to a placeholder person.
  // An unset contact email yields null so the footer omits the link entirely
  // rather than publishing an address nobody owns.
  const logoText = text(profile?.logoText) || text(profile?.fullName);
  const cvUrl = profile?.cvFile?.url || "/resume";
  const contactEmail = text(profile?.contactEmail);

  return (
    <SessionProvider session={session}>
      <div className="public-cursor-zone min-h-screen flex flex-col transition-colors duration-300" style={{ backgroundColor: "var(--bg)" }}>

        {/* Dynamic Navbar */}
        <Navbar logoText={logoText} cvUrl={cvUrl} navLinks={navLinks} />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col pt-[68px]">{children}</main>

        {/* Public Footer */}
        <Footer logoText={logoText} contactEmail={contactEmail} socialLinks={socialLinks} />
      </div>
    </SessionProvider>
  );
}
