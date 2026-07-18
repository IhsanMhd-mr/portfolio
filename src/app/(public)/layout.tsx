import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import { auth } from "@/lib/auth";
import { SessionProvider } from "next-auth/react";
import { PublicContentService } from "@/services/public-content.service";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Social links apply immediately (no draft state) — they are simple
  // metadata, not page content. Resolution lives in PublicContentService.
  const { profile, socialLinks } = await PublicContentService.getPublicChrome();

  const session = await auth();

  const logoText = profile?.logoText || "Jane Doe";
  const cvUrl = profile?.cvFile?.url || "/resume";
  const contactEmail = profile?.contactEmail || "admin@portfolio.com";

  return (
    <SessionProvider session={session}>
      <div className="public-cursor-zone min-h-screen flex flex-col transition-colors duration-300" style={{ backgroundColor: "var(--bg)" }}>

        {/* Dynamic Navbar */}
        <Navbar logoText={logoText} cvUrl={cvUrl} />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col pt-[68px]">{children}</main>

        {/* Public Footer */}
        <Footer logoText={logoText} contactEmail={contactEmail} socialLinks={socialLinks} />
      </div>
    </SessionProvider>
  );
}
