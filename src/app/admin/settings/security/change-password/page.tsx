import { requireAdmin } from "@/lib/require-admin";
import ChangePasswordForm from "@/components/auth/ChangePasswordForm";

export const metadata = { title: "Change Password — Admin" };

export default async function ChangePasswordPage() {
  const ctx = await requireAdmin("/admin/settings/security/change-password");

  return (
    <div className="max-w-md mx-auto mt-8">
      <h1 className="text-2xl font-bold text-[var(--a-ink)] mb-2">Change Password</h1>
      {ctx.mustChangePassword ? (
        <p className="text-sm text-[var(--a-warn)] mb-6">
          You must change your temporary password before using the admin area.
        </p>
      ) : (
        <p className="text-sm text-[var(--a-soft)] mb-6">
          Choose a strong new password. Other active sessions will be signed out.
        </p>
      )}
      <ChangePasswordForm />
    </div>
  );
}
