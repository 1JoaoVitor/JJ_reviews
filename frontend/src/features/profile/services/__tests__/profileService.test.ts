import { beforeEach, describe, expect, it, vi } from "vitest";

const {
   fromMock,
   selectMock,
   eqMock,
   singleMock,
   updateMock,
   storageFromMock,
   uploadMock,
   getPublicUrlMock,
} = vi.hoisted(() => ({
   fromMock: vi.fn(),
   selectMock: vi.fn(),
   eqMock: vi.fn(),
   singleMock: vi.fn(),
   updateMock: vi.fn(),
   storageFromMock: vi.fn(),
   uploadMock: vi.fn(),
   getPublicUrlMock: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
   supabase: {
      from: fromMock,
      storage: {
         from: storageFromMock,
      },
   },
}));

import { fetchUserProfile, updateUserProfileName, uploadUserAvatar } from "../profileService";

describe("profileService", () => {
   beforeEach(() => {
      vi.clearAllMocks();

      fromMock.mockReturnValue({
         select: selectMock,
         update: updateMock,
      });

      selectMock.mockReturnValue({ eq: eqMock });
      eqMock.mockReturnValue({ single: singleMock });
      updateMock.mockReturnValue({ eq: eqMock });

      storageFromMock.mockReturnValue({
         upload: uploadMock,
         getPublicUrl: getPublicUrlMock,
      });
   });

   it("fetches and normalizes user profile", async () => {
      singleMock.mockResolvedValue({
         data: { username: "joao", avatar_url: "https://img" },
         error: null,
      });

      const result = await fetchUserProfile("u1");

      expect(result).toEqual({ username: "joao", avatarUrl: "https://img" });
   });

   it("normalizes empty profile fields", async () => {
      singleMock.mockResolvedValue({
         data: { username: null, avatar_url: null },
         error: null,
      });

      const result = await fetchUserProfile("u1");
      expect(result).toEqual({ username: "", avatarUrl: null });
   });

   it("throws when fetching user profile fails", async () => {
      singleMock.mockResolvedValue({ data: null, error: new Error("profile-fetch-failed") });
      await expect(fetchUserProfile("u1")).rejects.toThrow("profile-fetch-failed");
   });

   it("updates username", async () => {
      eqMock.mockResolvedValue({ error: null });

      await expect(updateUserProfileName("u1", "novo_nome")).resolves.toBeUndefined();
   });

   it("throws when updating username fails", async () => {
      eqMock.mockResolvedValue({ error: new Error("update-name-failed") });
      await expect(updateUserProfileName("u1", "novo_nome")).rejects.toThrow("update-name-failed");
   });

   it("uploads avatar and persists public url", async () => {
      vi.spyOn(Math, "random").mockReturnValue(0.123);
      uploadMock.mockResolvedValue({ error: null });
      getPublicUrlMock.mockReturnValue({ data: { publicUrl: "https://cdn/avatar.jpg" } });
      eqMock.mockResolvedValue({ error: null });

      const blob = new Blob(["img"], { type: "image/jpeg" });
      const result = await uploadUserAvatar("u1", blob);

      expect(result).toBe("https://cdn/avatar.jpg");
   });

   it("throws when upload fails", async () => {
      uploadMock.mockResolvedValue({ error: new Error("upload fail") });

      const blob = new Blob(["img"], { type: "image/jpeg" });
      await expect(uploadUserAvatar("u1", blob)).rejects.toThrow("upload fail");
   });

   it("throws when profile update with avatar url fails", async () => {
      uploadMock.mockResolvedValue({ error: null });
      getPublicUrlMock.mockReturnValue({ data: { publicUrl: "https://cdn/avatar.jpg" } });
      eqMock.mockResolvedValue({ error: new Error("avatar-update-failed") });

      const blob = new Blob(["img"], { type: "image/jpeg" });
      await expect(uploadUserAvatar("u1", blob)).rejects.toThrow("avatar-update-failed");
   });
});
