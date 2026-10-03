import type {
  ProfileCompletionActionState,
  ProfileEditActionState,
  ProfileInsertError,
} from "./types";

export function mapProfileInsertError(error: ProfileInsertError): ProfileCompletionActionState {
  if (error.code === "23505") {
    return {
      status: "error",
      message: "This username is unavailable.",
      fieldErrors: { username: "This username is unavailable." },
    };
  }

  if (error.code === "23514") {
    return { status: "error", message: "Check the highlighted profile details." };
  }

  return { status: "error", message: "We couldn't create your profile. Please try again." };
}

export function mapProfileUpdateError(error: ProfileInsertError): ProfileEditActionState {
  if (error.code === "23505") {
    return {
      status: "error",
      message: "This username is unavailable.",
      fieldErrors: { username: "This username is unavailable." },
    };
  }

  if (error.code === "23514") {
    return { status: "error", message: "Check the highlighted profile details." };
  }

  return { status: "error", message: "We couldn't save your profile. Please try again." };
}
