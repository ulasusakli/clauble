import Link from "next/link";

import { forgotPasswordAction } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      description="Enter your email and we'll send recovery instructions if an account exists."
      footer={<Link href="/login">Back to login</Link>}
    >
      <AuthForm action={forgotPasswordAction} mode="forgot" />
    </AuthShell>
  );
}
