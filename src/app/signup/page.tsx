import Link from "next/link";

import { signupAction } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { redirectAuthenticatedFromAuthPage } from "@/lib/auth/server";

export default async function SignupPage() {
  await redirectAuthenticatedFromAuthPage();
  return (
    <AuthShell
      title="Create your account"
      description="Use email and password. You'll confirm your email before continuing."
      footer={<span>Already have an account? <Link href="/login">Log in</Link></span>}
    >
      <AuthForm action={signupAction} mode="signup" />
    </AuthShell>
  );
}
