import LoginForm from "@/components/auth/LoginForm";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";

export default async function AdminLoginPage() {
  const session = await auth();

  return (
    <SessionProvider session={session}>
      <div
        className="min-h-screen w-full flex items-center justify-center p-4 transition-colors duration-300"
        style={{
          backgroundColor: "var(--bg)",
        }}
      >
        <LoginForm standalone={true} />
      </div>
    </SessionProvider>
  );
}
