import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AvatarManager } from "@/components/people/avatar-manager";
import { ProfileEditForm } from "@/components/people/profile-edit-form";
import { resolveAccountState } from "@/lib/auth/account-state";
import { AVATAR_BUCKET } from "@/lib/people/avatar";
import { getProfileInitials } from "@/lib/people/public-profile";
import { createClient } from "@/lib/supabase/server";

type SettingsProfilePageProps = { searchParams: Promise<{ cleanup?: string; updated?: string }> };

export default async function SettingsProfilePage({ searchParams }: SettingsProfilePageProps) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsError ? null : (claimsData?.claims?.sub ?? null);
  const state = await resolveAccountState(supabase, userId);

  if (state.kind === "anonymous") redirect("/login?next=/settings/profile");
  if (state.kind === "profile_required") redirect("/onboarding/profile");
  if (state.kind === "restricted") redirect("/account/restricted");

  const { data: profile, error } = await supabase
    .from("people")
    .select("username, display_name, headline, bio, website_url, avatar_path, updated_at")
    .eq("id", state.userId)
    .single();
  if (error || !profile) throw new Error("Unable to load profile settings.", { cause: error });

  const avatarUrl = profile.avatar_path
    ? supabase.storage.from(AVATAR_BUCKET).getPublicUrl(profile.avatar_path).data.publicUrl
    : null;
  const notice = await searchParams;
  const updatedMessage = notice.updated === "profile"
    ? "Profile saved."
    : notice.updated === "avatar"
      ? "Avatar saved."
      : notice.updated === "avatar-removed"
        ? "Avatar removed."
        : null;

  return (
    <main className="settings-page">
      <header className="settings-header">
        <Link className="auth-brand" href="/">Clauble</Link>
        <div>
          <p className="settings-eyebrow">Settings</p>
          <h1>Profile</h1>
          <p>Edit the public information shown on your Clauble profile.</p>
        </div>
        <Link href={`/u/${profile.username}` as Route}>View public profile</Link>
      </header>
      {updatedMessage ? <p className="settings-notice success">{updatedMessage}</p> : null}
      {notice.cleanup === "pending" ? (
        <p className="settings-notice warning">Your profile is up to date, but an old avatar could not be cleaned up. The next avatar change will retry cleanup.</p>
      ) : null}
      <AvatarManager
        avatarUrl={avatarUrl}
        displayName={profile.display_name}
        initials={getProfileInitials(profile.display_name, profile.username)}
        updatedAt={profile.updated_at}
      />
      <section aria-labelledby="details-heading" className="settings-section">
        <div>
          <h2 id="details-heading">Public profile</h2>
          <p>Your username is public and may be changed immediately.</p>
        </div>
        <ProfileEditForm profile={{
          bio: profile.bio,
          displayName: profile.display_name,
          headline: profile.headline,
          updatedAt: profile.updated_at,
          username: profile.username,
          website: profile.website_url,
        }} />
      </section>
    </main>
  );
}
