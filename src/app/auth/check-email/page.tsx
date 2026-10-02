import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";

export default function CheckEmailPage() {
  return (
    <AuthShell
      title="Check your email"
      description="If the address can be registered, we've sent a confirmation link. Open it to continue to Clauble."
      footer={<><Link href="/login">Back to login</Link><Link href="/signup">Use another email</Link></>}
    />
  );
}
