import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ backgroundColor: "var(--bg)" }}>
      {/* Dynamic Navbar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col pt-[68px]">{children}</main>

      {/* Public Footer */}
      <Footer />
    </div>
  );
}
