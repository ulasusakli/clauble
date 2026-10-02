import Link from "next/link";

import { loginAction } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { redirectAuthenticatedFromAuthPage } from "@/lib/auth/server";
import { sanitizeRedirectPath } from "@/lib/auth/redirects";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; status?: string }>;
}) {
  await redirectAuthenticatedFromAuthPage();
  const params = await searchParams;
  const next = sanitizeRedirectPath(params.next, "/");

  return (
    <AuthShell
      title="Welcome back"
      description="Log in with your email and password."
      footer={<><Link href="/forgot-password">Forgot password?</Link><span>New to Clauble? <Link href="/signup">Create an account</Link></span></>}
    >
      {params.status === "password-updated" ? <p className="form-message success">Password updated. Log in again.</p> : null}
      <AuthForm action={loginAction} mode="login" next={next} />
    </AuthShell>
  );
}
