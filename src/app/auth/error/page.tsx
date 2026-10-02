import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";

export default function AuthErrorPage() {
  return (
    <AuthShell
      title="That link didn't work"
      description="The link may be invalid, expired, or already used. Request a new link and try again."
      footer={<><Link href="/signup">Create account</Link><Link href="/forgot-password">Reset password</Link></>}
    />
  );
}
