import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import db from "@/lib/database";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await db.siteProfile.findFirst({
    include: {
      cvFile: true,
      logoImage: true,
    },
  });

  const { getServerSession } = await import("@/lib/auth");
  const session = await getServerSession();
  const isLoggedIn = !!session;

  const logoText = profile?.logoText || "Jane Doe";
  const cvUrl = profile?.cvFile?.url || "/resume";
  const contactEmail = profile?.contactEmail || "admin@portfolio.com";

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ backgroundColor: "var(--bg)" }}>
      {/* Dynamic Navbar */}
      <Navbar logoText={logoText} cvUrl={cvUrl} isLoggedIn={isLoggedIn} />


      {/* Main Content Area */}
      <main className="flex-1 flex flex-col pt-[68px]">{children}</main>

      {/* Public Footer */}
      <Footer logoText={logoText} contactEmail={contactEmail} />
    </div>
  );
}

