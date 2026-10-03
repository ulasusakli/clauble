import type { ProfileFieldErrors } from "./validation";

export type ProfileCompletionActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: ProfileFieldErrors;
};

export const initialProfileCompletionActionState: ProfileCompletionActionState = {
  status: "idle",
};

export type ProfileInsertError = { code?: string | null };

export type ProfileEditActionState = {
  status: "idle" | "error" | "conflict" | "success";
  message?: string;
  fieldErrors?: ProfileFieldErrors;
  username?: string;
  version?: string;
};

export type AvatarActionState = {
  status: "idle" | "error" | "conflict" | "success" | "warning";
  message?: string;
  avatarPath?: string | null;
  version?: string;
};
