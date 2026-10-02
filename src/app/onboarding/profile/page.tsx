import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { getPostAuthDestination, resolveAccountState } from "@/lib/auth/account-state";
import { createClient } from "@/lib/supabase/server";

export default async function ProfileOnboardingPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = error ? null : data?.claims?.sub;
  if (!userId) redirect("/login?next=/onboarding/profile");

  const state = await resolveAccountState(supabase, userId);
  if (state.kind !== "profile_required") redirect(getPostAuthDestination(state));

  return (
    <AuthShell
      eyebrow="Cycle 01A"
      title="Profile setup comes next"
      description="Your email is confirmed and your session is active. Cycle 01B will add deliberate username and profile creation here."
    >
      <form action="/auth/signout" method="post"><button type="submit">Log out</button></form>
    </AuthShell>
  );
}
