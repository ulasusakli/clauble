import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { AVATAR_BUCKET } from "@/lib/people/avatar";
import { getProfileInitials, getSafePublicWebsite } from "@/lib/people/public-profile";
import { isUsernameFormatValid } from "@/lib/people/usernames";
import { createClient } from "@/lib/supabase/server";

type ProfilePageProps = { params: Promise<{ username: string }> };

async function getPublicProfile(requestedUsername: string) {
  const canonicalUsername = requestedUsername.toLowerCase();
  if (!isUsernameFormatValid(canonicalUsername)) notFound();
  if (requestedUsername !== canonicalUsername) {
    permanentRedirect(`/u/${canonicalUsername}` as Route);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("people")
    .select("username, display_name, headline, bio, website_url, avatar_path")
    .eq("username", canonicalUsername)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw new Error("Unable to load public profile.", { cause: error });
  if (!data) notFound();
  return {
    ...data,
    avatarUrl: data.avatar_path
      ? supabase.storage.from(AVATAR_BUCKET).getPublicUrl(data.avatar_path).data.publicUrl
      : null,
  };
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  return {
    title: `${profile.display_name} (@${profile.username}) · Clauble`,
    description: profile.headline ?? `View @${profile.username} on Clauble.`,
  };
}

export default async function PublicProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  const website = getSafePublicWebsite(profile.website_url);

  return (
    <main className="profile-page">
      <article aria-labelledby="profile-name" className="profile-card">
        <Link className="auth-brand" href="/">Clauble</Link>
        <div className="profile-avatar">
          {profile.avatarUrl ? (
            // Supabase public Storage serves immutable, CDN-cached image URLs.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={`${profile.display_name}'s avatar`}
              height="80"
              src={profile.avatarUrl}
              width="80"
            />
          ) : (
            <span aria-hidden="true">
              {getProfileInitials(profile.display_name, profile.username)}
            </span>
          )}
        </div>
        <header>
          <h1 id="profile-name">{profile.display_name}</h1>
          <p className="profile-username">@{profile.username}</p>
        </header>
        {profile.headline ? <p className="profile-headline">{profile.headline}</p> : null}
        {profile.bio ? <p className="profile-bio">{profile.bio}</p> : null}
        {website ? (
          <a className="profile-website" href={website} rel="nofollow noreferrer" target="_blank">
            {new URL(website).hostname}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : null}
      </article>
    </main>
  );
}
