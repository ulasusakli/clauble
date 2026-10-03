"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { updateProfileAction } from "@/app/settings/profile/actions";
import type { ProfileEditActionState } from "@/lib/people/types";
import { normalizeUsername } from "@/lib/people/usernames";
import { profileEditSchema, toProfileFieldErrors } from "@/lib/people/validation";

type ProfileEditFormProps = {
  profile: {
    bio: string | null;
    displayName: string;
    headline: string | null;
    updatedAt: string;
    username: string;
    website: string | null;
  };
};

const initialState: ProfileEditActionState = { status: "idle" };

export function ProfileEditForm({ profile }: ProfileEditFormProps) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [username, setUsername] = useState(profile.username);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = { ...clientErrors, ...state.fieldErrors };

  useEffect(() => {
    if (state.status === "error") {
      formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
    }
  }, [state]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const result = profileEditSchema.safeParse({
      username: String(formData.get("username") ?? ""),
      displayName: String(formData.get("displayName") ?? ""),
      headline: String(formData.get("headline") ?? ""),
      bio: String(formData.get("bio") ?? ""),
      website: String(formData.get("website") ?? ""),
      version: String(formData.get("version") ?? ""),
    });

    if (result.success) {
      setClientErrors({});
      setUsername(result.data.username);
      return;
    }

    event.preventDefault();
    setClientErrors(toProfileFieldErrors(result.error));
  }

  return (
    <form ref={formRef} action={formAction} className="settings-form" noValidate onSubmit={handleSubmit}>
      <input name="version" type="hidden" value={profile.updatedAt} />
      <label>
        <span>Username</span>
        <div className="username-input">
          <span aria-hidden="true">clauble.com/u/</span>
          <input
            aria-describedby={errors.username ? "edit-username-error" : "edit-username-help"}
            aria-invalid={Boolean(errors.username)}
            autoCapitalize="none"
            autoComplete="username"
            maxLength={100}
            name="username"
            onBlur={() => setUsername((value) => normalizeUsername(value))}
            onChange={(event) => setUsername(event.target.value)}
            required
            spellCheck={false}
            type="text"
            value={username}
          />
        </div>
        {errors.username ? (
          <small id="edit-username-error">{errors.username}</small>
        ) : (
          <small className="field-help" id="edit-username-help">
            Changing this immediately moves your public profile. Old profile URLs do not redirect.
          </small>
        )}
      </label>
      <label>
        <span>Display name</span>
        <input aria-invalid={Boolean(errors.displayName)} defaultValue={profile.displayName} maxLength={80} name="displayName" required />
        {errors.displayName ? <small>{errors.displayName}</small> : null}
      </label>
      <label>
        <span>Headline <em>Optional</em></span>
        <input aria-invalid={Boolean(errors.headline)} defaultValue={profile.headline ?? ""} maxLength={120} name="headline" />
        {errors.headline ? <small>{errors.headline}</small> : null}
      </label>
      <label>
        <span>Bio <em>Optional</em></span>
        <textarea aria-invalid={Boolean(errors.bio)} defaultValue={profile.bio ?? ""} maxLength={500} name="bio" rows={6} />
        {errors.bio ? <small>{errors.bio}</small> : null}
      </label>
      <label>
        <span>Website <em>Optional</em></span>
        <input aria-invalid={Boolean(errors.website)} defaultValue={profile.website ?? ""} maxLength={2048} name="website" placeholder="https://example.com" type="url" />
        {errors.website ? <small>{errors.website}</small> : null}
      </label>
      <p aria-live="polite" className={`form-message ${state.status}`} role="status">{state.message}</p>
      <button disabled={pending} type="submit">{pending ? "Saving…" : "Save profile"}</button>
    </form>
  );
}
