"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { initialAuthActionState, type AuthActionState } from "@/lib/auth/types";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  toFieldErrors,
} from "@/lib/auth/validation";

type AuthMode = "login" | "signup" | "forgot" | "reset";
type AuthAction = (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;

const copy: Record<AuthMode, { button: string; pending: string }> = {
  login: { button: "Log in", pending: "Logging in…" },
  signup: { button: "Create account", pending: "Creating account…" },
  forgot: { button: "Send reset instructions", pending: "Sending…" },
  reset: { button: "Set new password", pending: "Updating…" },
};

function validate(mode: AuthMode, formData: FormData) {
  const value = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };

  if (mode === "login") return loginSchema.safeParse(value);
  if (mode === "signup") return signupSchema.safeParse(value);
  if (mode === "forgot") return forgotPasswordSchema.safeParse(value);
  return resetPasswordSchema.safeParse(value);
}

export function AuthForm({ action, mode, next }: { action: AuthAction; mode: AuthMode; next?: string }) {
  const [state, formAction, pending] = useActionState(action, initialAuthActionState);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const errors = { ...clientErrors, ...state.fieldErrors };

  useEffect(() => {
    if (state.status === "error") {
      formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
    }
  }, [state]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const result = validate(mode, new FormData(event.currentTarget));
    if (result.success) {
      setClientErrors({});
      return;
    }

    event.preventDefault();
    const nextErrors = toFieldErrors(result.error);
    setClientErrors(nextErrors);
    requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
    });
  }

  const showEmail = mode === "login" || mode === "signup" || mode === "forgot";
  const showPassword = mode === "login" || mode === "signup" || mode === "reset";
  const showConfirmation = mode === "signup" || mode === "reset";

  return (
    <form ref={formRef} action={formAction} className="auth-form" noValidate onSubmit={handleSubmit}>
      {next ? <input name="next" type="hidden" value={next} /> : null}
      {showEmail ? (
        <label>
          <span>Email</span>
          <input
            aria-describedby={errors.email ? "email-error" : undefined}
            aria-invalid={Boolean(errors.email)}
            autoComplete="email"
            maxLength={320}
            name="email"
            required
            type="email"
          />
          {errors.email ? <small id="email-error">{errors.email}</small> : null}
        </label>
      ) : null}
      {showPassword ? (
        <label>
          <span>{mode === "reset" ? "New password" : "Password"}</span>
          <input
            aria-describedby={errors.password ? "password-error" : undefined}
            aria-invalid={Boolean(errors.password)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            maxLength={256}
            minLength={6}
            name="password"
            required
            type="password"
          />
          {errors.password ? <small id="password-error">{errors.password}</small> : null}
        </label>
      ) : null}
      {showConfirmation ? (
        <label>
          <span>Confirm password</span>
          <input
            aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
            aria-invalid={Boolean(errors.confirmPassword)}
            autoComplete="new-password"
            maxLength={256}
            name="confirmPassword"
            required
            type="password"
          />
          {errors.confirmPassword ? <small id="confirm-password-error">{errors.confirmPassword}</small> : null}
        </label>
      ) : null}
      <p aria-live="polite" className={`form-message ${state.status}`} role="status">
        {state.message}
      </p>
      <button disabled={pending} type="submit">
        {pending ? copy[mode].pending : copy[mode].button}
      </button>
    </form>
  );
}
