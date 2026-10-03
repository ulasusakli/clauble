export const AVATAR_BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 1024 * 1024;
export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";

const AVATAR_FILE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type AvatarContentType = keyof typeof AVATAR_FILE_TYPES;
export type AvatarExtension = (typeof AVATAR_FILE_TYPES)[AvatarContentType];

export type AvatarValidationResult =
  | { success: true; bytes: ArrayBuffer; contentType: AvatarContentType; extension: AvatarExtension }
  | { success: false; message: string };

function hasBytes(bytes: Uint8Array, expected: readonly number[], offset = 0): boolean {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function hasAscii(bytes: Uint8Array, expected: string, offset: number): boolean {
  return [...expected].every((value, index) => bytes[offset + index] === value.charCodeAt(0));
}

function matchesSignature(contentType: AvatarContentType, bytes: Uint8Array): boolean {
  switch (contentType) {
    case "image/jpeg":
      return hasBytes(bytes, [0xff, 0xd8, 0xff]);
    case "image/png":
      return hasBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/webp":
      return hasAscii(bytes, "RIFF", 0) && hasAscii(bytes, "WEBP", 8);
  }
}

export async function validateAvatarFile(value: FormDataEntryValue | null): Promise<AvatarValidationResult> {
  if (!(value instanceof File) || value.size === 0) {
    return { success: false, message: "Choose a JPEG, PNG, or WebP image." };
  }

  if (value.size > AVATAR_MAX_BYTES) {
    return { success: false, message: "Avatar must be 1 MB or smaller." };
  }

  if (!(value.type in AVATAR_FILE_TYPES)) {
    return { success: false, message: "Choose a JPEG, PNG, or WebP image." };
  }

  const contentType = value.type as AvatarContentType;
  const bytes = await value.arrayBuffer();
  if (!matchesSignature(contentType, new Uint8Array(bytes))) {
    return { success: false, message: "The selected file is not a valid image." };
  }

  return {
    success: true,
    bytes,
    contentType,
    extension: AVATAR_FILE_TYPES[contentType],
  };
}

export function createAvatarPath(
  userId: string,
  objectId: string,
  extension: AvatarExtension,
): string {
  return `${userId}/${objectId}.${extension}`;
}

export function isOwnedAvatarPath(path: string, userId: string): boolean {
  const escapedUserId = userId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `^${escapedUserId}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp)$`,
  ).test(path);
}
