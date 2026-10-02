import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { getPostAuthDestination, resolveAccountState } from "@/lib/auth/account-state";
import { createClient } from "@/lib/supabase/server";

export default async function RestrictedAccountPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = error ? null : data?.claims?.sub;
  if (!userId) redirect("/login");

  const state = await resolveAccountState(supabase, userId);
  if (state.kind !== "restricted") redirect(getPostAuthDestination(state));

  return (
    <AuthShell
      title="Account access is restricted"
      description="This account cannot access the normal application right now. Detailed account-management workflows are outside this cycle."
    >
      <form action="/auth/signout" method="post"><button type="submit">Log out</button></form>
    </AuthShell>
  );
}
