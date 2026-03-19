import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInWithPasswordMock, updateUserMock, rpcMock } = vi.hoisted(() => ({
   signInWithPasswordMock: vi.fn(),
   updateUserMock: vi.fn(),
   rpcMock: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
   supabase: {
      auth: {
         signInWithPassword: signInWithPasswordMock,
         updateUser: updateUserMock,
      },
      rpc: rpcMock,
   },
}));

import {
   deleteCurrentUserAccount,
   updateCurrentUserPassword,
   verifyCurrentPassword,
} from "../securityService";

describe("securityService", () => {
   beforeEach(() => {
      vi.clearAllMocks();
   });

   it("validates current password", async () => {
      signInWithPasswordMock.mockResolvedValue({ error: null });
      await expect(verifyCurrentPassword("user@mail.com", "123456")).resolves.toBeUndefined();
   });

   it("throws a friendly error when current password is invalid", async () => {
      signInWithPasswordMock.mockResolvedValue({ error: { message: "invalid" } });
      await expect(verifyCurrentPassword("user@mail.com", "bad")).rejects.toThrow("A senha atual está incorreta.");
   });

   it("updates user password", async () => {
      updateUserMock.mockResolvedValue({ error: null });
      await expect(updateCurrentUserPassword("654321")).resolves.toBeUndefined();
   });

   it("throws when updating user password fails", async () => {
      updateUserMock.mockResolvedValue({ error: new Error("update-password-failed") });
      await expect(updateCurrentUserPassword("654321")).rejects.toThrow("update-password-failed");
   });

   it("deletes current user account", async () => {
      rpcMock.mockResolvedValue({ error: null });
      await expect(deleteCurrentUserAccount()).resolves.toBeUndefined();
   });

   it("throws when deleting current user account fails", async () => {
      rpcMock.mockResolvedValue({ error: new Error("delete-user-failed") });
      await expect(deleteCurrentUserAccount()).rejects.toThrow("delete-user-failed");
   });
});
