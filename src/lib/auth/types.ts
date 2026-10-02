export type PersonStatus = "active" | "suspended" | "deactivated" | "deleted";

export type AccountState =
  | { kind: "anonymous" }
  | { kind: "profile_required"; userId: string }
  | { kind: "active"; userId: string; username: string }
  | { kind: "restricted"; userId: string; personStatus: Exclude<PersonStatus, "active"> };

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<"email" | "password" | "confirmPassword", string>>;
};

export const initialAuthActionState: AuthActionState = { status: "idle" };
