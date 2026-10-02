import { resetPasswordAction } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { requireUser } from "@/lib/auth/server";

export default async function ResetPasswordPage() {
  await requireUser();
  return (
    <AuthShell title="Choose a new password" description="After updating your password, you'll log in again.">
      <AuthForm action={resetPasswordAction} mode="reset" />
    </AuthShell>
  );
}
