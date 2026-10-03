"use client";

import { useActionState } from "react";

import { deleteAvatarAction, uploadAvatarAction } from "@/app/settings/profile/actions";
import { AVATAR_ACCEPT } from "@/lib/people/avatar";
import type { AvatarActionState } from "@/lib/people/types";

type AvatarManagerProps = {
  avatarUrl: string | null;
  displayName: string;
  initials: string;
  updatedAt: string;
};

const initialState: AvatarActionState = { status: "idle" };

export function AvatarManager({ avatarUrl, displayName, initials, updatedAt }: AvatarManagerProps) {
  const [uploadState, uploadAction, uploading] = useActionState(uploadAvatarAction, initialState);
  const [deleteState, deleteAction, deleting] = useActionState(deleteAvatarAction, initialState);

  return (
    <section aria-labelledby="avatar-heading" className="settings-section avatar-settings">
      <div>
        <h2 id="avatar-heading">Avatar</h2>
        <p>JPEG, PNG, or WebP. Maximum 1 MB.</p>
      </div>
      <div className="avatar-preview">
        {avatarUrl ? (
          // Supabase public Storage serves immutable, CDN-cached image URLs.
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={`${displayName}'s avatar`} height="96" src={avatarUrl} width="96" />
        ) : (
          <span aria-hidden="true">{initials}</span>
        )}
      </div>
      <form action={uploadAction} className="avatar-form">
        <input name="version" type="hidden" value={updatedAt} />
        <label>
          <span>{avatarUrl ? "Replace avatar" : "Upload avatar"}</span>
          <input accept={AVATAR_ACCEPT} name="avatar" required type="file" />
        </label>
        <p aria-live="polite" className={`form-message ${uploadState.status}`} role="status">{uploadState.message}</p>
        <button disabled={uploading || deleting} type="submit">{uploading ? "Uploading…" : avatarUrl ? "Replace avatar" : "Upload avatar"}</button>
      </form>
      {avatarUrl ? (
        <form action={deleteAction} className="avatar-delete-form">
          <input name="version" type="hidden" value={updatedAt} />
          <p aria-live="polite" className={`form-message ${deleteState.status}`} role="status">{deleteState.message}</p>
          <button disabled={uploading || deleting} type="submit">{deleting ? "Removing…" : "Remove avatar"}</button>
        </form>
      ) : null}
    </section>
  );
}
