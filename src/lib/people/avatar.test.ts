import { describe, expect, it } from "vitest";

import {
  AVATAR_MAX_BYTES,
  createAvatarPath,
  isOwnedAvatarPath,
  validateAvatarFile,
} from "./avatar";

const userId = "12345678-1234-1234-1234-123456789abc";
const objectId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

describe("avatar validation", () => {
  it.each([
    ["image/jpeg", "jpg", [0xff, 0xd8, 0xff, 0x00]],
    ["image/png", "png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    ["image/webp", "webp", [...new TextEncoder().encode("RIFF0000WEBP")]],
  ] as const)("accepts a genuine %s signature", async (contentType, extension, signature) => {
    const result = await validateAvatarFile(
      new File([new Uint8Array(signature)], `avatar.${extension}`, { type: contentType }),
    );
    expect(result.success).toBe(true);
    if (result.success) expect(result.extension).toBe(extension);
  });

  it("rejects a spoofed MIME type", async () => {
    await expect(
      validateAvatarFile(new File(["not a png"], "avatar.png", { type: "image/png" })),
    ).resolves.toEqual({ success: false, message: "The selected file is not a valid image." });
  });

  it("rejects unsupported and oversized files", async () => {
    await expect(
      validateAvatarFile(new File(["GIF89a"], "avatar.gif", { type: "image/gif" })),
    ).resolves.toMatchObject({ success: false });
    await expect(
      validateAvatarFile(
        new File([new Uint8Array(AVATAR_MAX_BYTES + 1)], "avatar.png", { type: "image/png" }),
      ),
    ).resolves.toEqual({ success: false, message: "Avatar must be 1 MB or smaller." });
  });
});

describe("avatar paths", () => {
  it("creates and recognizes only canonical owner paths", () => {
    const path = createAvatarPath(userId, objectId, "webp");
    expect(path).toBe(`${userId}/${objectId}.webp`);
    expect(isOwnedAvatarPath(path, userId)).toBe(true);
    expect(isOwnedAvatarPath(path, "00000000-0000-0000-0000-000000000000")).toBe(false);
    expect(isOwnedAvatarPath(`${userId}/avatar.webp`, userId)).toBe(false);
  });
});
