import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { ProfileCompletionForm } from "@/components/people/profile-completion-form";
import { getProfileOnboardingDestination, resolveAccountState } from "@/lib/auth/account-state";
import { createClient } from "@/lib/supabase/server";

export default async function ProfileOnboardingPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = error ? null : (data?.claims?.sub ?? null);
  const state = await resolveAccountState(supabase, userId);
  const destination = getProfileOnboardingDestination(state);
  if (destination) redirect(destination);

  return (
    <AuthShell
      title="Complete your Clauble profile"
      description="Choose how you will appear publicly. You can add more profile details later."
      footer={<form action="/auth/signout" method="post"><button className="text-link" type="submit">Log out</button></form>}
    >
      <ProfileCompletionForm />
    </AuthShell>
  );
}
