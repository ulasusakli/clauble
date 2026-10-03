"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { completeProfileAction } from "@/app/onboarding/profile/actions";
import { initialProfileCompletionActionState } from "@/lib/people/types";
import { normalizeUsername } from "@/lib/people/usernames";
import {
  profileCompletionSchema,
  toProfileFieldErrors,
} from "@/lib/people/validation";

export function ProfileCompletionForm() {
  const [state, formAction, pending] = useActionState(
    completeProfileAction,
    initialProfileCompletionActionState,
  );
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [username, setUsername] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const errors = { ...clientErrors, ...state.fieldErrors };

  useEffect(() => {
    if (state.status === "error") {
      formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
    }
  }, [state]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const result = profileCompletionSchema.safeParse({
      username: String(formData.get("username") ?? ""),
      displayName: String(formData.get("displayName") ?? ""),
      headline: String(formData.get("headline") ?? ""),
      website: String(formData.get("website") ?? ""),
    });

    if (result.success) {
      setClientErrors({});
      setUsername(result.data.username);
      return;
    }

    event.preventDefault();
    setClientErrors(toProfileFieldErrors(result.error));
    requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
    });
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="auth-form profile-form"
      noValidate
      onSubmit={handleSubmit}
    >
      <label>
        <span>Username</span>
        <div className="username-input">
          <span aria-hidden="true">clauble.com/u/</span>
          <input
            aria-describedby={errors.username ? "username-error" : "username-help"}
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
          <small id="username-error">{errors.username}</small>
        ) : (
          <small className="field-help" id="username-help">
            3–30 lowercase letters, numbers, or underscores.
          </small>
        )}
      </label>
      <label>
        <span>Display name</span>
        <input
          aria-describedby={errors.displayName ? "display-name-error" : undefined}
          aria-invalid={Boolean(errors.displayName)}
          autoComplete="name"
          maxLength={80}
          name="displayName"
          required
          type="text"
        />
        {errors.displayName ? <small id="display-name-error">{errors.displayName}</small> : null}
      </label>
      <label>
        <span>Headline <em>Optional</em></span>
        <input
          aria-describedby={errors.headline ? "headline-error" : undefined}
          aria-invalid={Boolean(errors.headline)}
          maxLength={120}
          name="headline"
          type="text"
        />
        {errors.headline ? <small id="headline-error">{errors.headline}</small> : null}
      </label>
      <label>
        <span>Website <em>Optional</em></span>
        <input
          aria-describedby={errors.website ? "website-error" : undefined}
          aria-invalid={Boolean(errors.website)}
          autoComplete="url"
          maxLength={2048}
          name="website"
          placeholder="https://example.com"
          type="url"
        />
        {errors.website ? <small id="website-error">{errors.website}</small> : null}
      </label>
      <p aria-live="polite" className={`form-message ${state.status}`} role="status">
        {state.message}
      </p>
      <button disabled={pending} type="submit">
        {pending ? "Creating profile…" : "Create profile"}
      </button>
    </form>
  );
}
