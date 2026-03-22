import { beforeEach, describe, expect, it, vi } from "vitest";

const {
   authGetUserMock,
   fromMock,
   selectMock,
   eqMock,
   maybeSingleMock,
   updateMock,
   insertMock,
   upsertMock,
   isMock,
   rpcMock,
   notifyFriendsDiaryActivityMock,
   storageUploadMock,
   storagePublicUrlMock,
} = vi.hoisted(() => ({
   authGetUserMock: vi.fn(),
   fromMock: vi.fn(),
   selectMock: vi.fn(),
   eqMock: vi.fn(),
   maybeSingleMock: vi.fn(),
   updateMock: vi.fn(),
   insertMock: vi.fn(),
   upsertMock: vi.fn(),
   isMock: vi.fn(),
   rpcMock: vi.fn(),
   notifyFriendsDiaryActivityMock: vi.fn(),
   storageUploadMock: vi.fn(),
   storagePublicUrlMock: vi.fn(),
}));

vi.mock("@/features/diary/services/diaryService", () => ({
   notifyFriendsDiaryActivity: notifyFriendsDiaryActivityMock,
}));

vi.mock("@/lib/supabase", () => ({
   supabase: {
      auth: {
         getUser: authGetUserMock,
      },
      from: fromMock,
      rpc: rpcMock,
      storage: {
         from: vi.fn(() => ({
            upload: storageUploadMock,
            getPublicUrl: storagePublicUrlMock,
         })),
      },
   },
}));

import {
   getAuthenticatedUser,
   getExistingProfileReview,
   hasUserReview,
   syncReviewToListMembers,
   uploadReviewAttachment,
   upsertPartialSharedListReview,
   upsertPersonalReview,
   upsertFullSharedListReview,
} from "../moviePersistenceService";

describe("moviePersistenceService", () => {
   beforeEach(() => {
      vi.clearAllMocks();
      storageUploadMock.mockResolvedValue({ error: null });
      storagePublicUrlMock.mockReturnValue({ data: { publicUrl: "https://example.com/file.jpg" } });

      selectMock.mockReturnValue({ eq: eqMock });
      eqMock.mockReturnValue({
         eq: eqMock,
         maybeSingle: maybeSingleMock,
         is: isMock,
      });
      isMock.mockReturnValue({ maybeSingle: maybeSingleMock });
      updateMock.mockReturnValue({ eq: eqMock });
      upsertMock.mockResolvedValue({ error: null });
      notifyFriendsDiaryActivityMock.mockResolvedValue(undefined);

      fromMock.mockReturnValue({
         select: selectMock,
         update: updateMock,
         insert: insertMock,
         upsert: upsertMock,
      });
   });

   it("returns null when user is unauthenticated", async () => {
      authGetUserMock.mockResolvedValue({ data: { user: null }, error: null });
      const user = await getAuthenticatedUser();
      expect(user).toBeNull();
   });

    it("returns authenticated user", async () => {
      authGetUserMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
      const user = await getAuthenticatedUser();
      expect(user).toEqual({ id: "u1" });
   });

   it("checks if user review exists", async () => {
      maybeSingleMock.mockResolvedValue({ data: { id: "r1" }, error: null });
      const exists = await hasUserReview("u1", 10);
      expect(exists).toBe(true);
   });

   it("returns false when user review does not exist", async () => {
      maybeSingleMock.mockResolvedValue({ data: null, error: null });
      const exists = await hasUserReview("u1", 10);
      expect(exists).toBe(false);
   });

   it("gets existing profile review with status", async () => {
      maybeSingleMock.mockResolvedValue({ data: { id: "r2", status: "watched" }, error: null });
      const review = await getExistingProfileReview("u1", 20);
      expect(review).toEqual({ id: "r2", status: "watched" });
   });

   it("returns null when profile review does not exist", async () => {
      maybeSingleMock.mockResolvedValue({ data: null, error: null });
      const review = await getExistingProfileReview("u1", 20);
      expect(review).toBeNull();
   });

   it("uploads review attachment and returns public url", async () => {
      const file = new File(["abc"], "ticket.jpg", { type: "image/jpeg" });
      const url = await uploadReviewAttachment("u1", file);
      expect(url).toBe("https://example.com/file.jpg");
      expect(storageUploadMock).toHaveBeenCalled();
   });

   it("throws when uploading review attachment fails", async () => {
      const file = new File(["abc"], "ticket.jpg", { type: "image/jpeg" });
      storageUploadMock.mockResolvedValue({ error: new Error("upload-failed") });
      await expect(uploadReviewAttachment("u1", file)).rejects.toThrow("upload-failed");
   });

   it("upserts full shared list review by updating when record exists", async () => {
      maybeSingleMock.mockResolvedValue({ data: { id: "lr1" }, error: null });
      const updateEqMock = vi.fn().mockResolvedValue({ error: null });
      updateMock.mockReturnValue({ eq: updateEqMock });

      await expect(
         upsertFullSharedListReview("l1", 50, { rating: 8, review: "ok", recommended: "Vale a pena assistir" })
      ).resolves.toBeUndefined();

      expect(updateMock).toHaveBeenCalled();
   });

   it("syncs list review through rpc", async () => {
      rpcMock.mockResolvedValue({ error: null });
      await expect(
         syncReviewToListMembers({
            listId: "l1",
            tmdbId: 99,
            rating: 9,
            review: "Bom",
            recommended: "Assista com certeza",
            status: "watched",
            addedBy: "u1",
            location: "Casa",
            runtime: 120,
         })
      ).resolves.toBeUndefined();
   });

   it("upserts full shared list review by inserting when record does not exist", async () => {
      maybeSingleMock.mockResolvedValue({ data: null, error: null });
      insertMock.mockResolvedValue({ error: null });

      await expect(
         upsertFullSharedListReview("l1", 50, { rating: 8, review: "ok", recommended: "Vale a pena assistir" })
      ).resolves.toBeUndefined();

      expect(insertMock).toHaveBeenCalled();
   });

   it("upserts partial shared list review by inserting when record does not exist", async () => {
      maybeSingleMock.mockResolvedValue({ data: null, error: null });
      insertMock.mockResolvedValue({ error: null });

      await expect(
         upsertPartialSharedListReview("l1", 50, "u1", {
            rating: 7,
            review: "bom",
            recommended: "Vale a pena assistir",
            location: "Casa",
            runtime: 130,
         })
      ).resolves.toBeUndefined();

      expect(insertMock).toHaveBeenCalled();
   });

   it("upserts personal review by updating when record exists", async () => {
      maybeSingleMock.mockResolvedValue({ data: { id: "r1" }, error: null });
      const updateEqMock = vi.fn().mockResolvedValue({ error: null });
      updateMock.mockReturnValue({ eq: updateEqMock });

      await expect(
         upsertPersonalReview("u1", 77, {
            rating: 9,
            review: "excelente",
            recommended: "Assista com certeza",
            runtime: 120,
            location: "Cinema",
            status: "watched",
            attachment_url: null,
         })
      ).resolves.toBeUndefined();
   });

   it("upserts personal review by inserting when record does not exist", async () => {
      maybeSingleMock.mockResolvedValue({ data: null, error: null });
      insertMock.mockResolvedValue({ error: null });

      await expect(
         upsertPersonalReview("u1", 77, {
            rating: 9,
            review: "excelente",
            recommended: "Assista com certeza",
            runtime: 120,
            location: "Cinema",
            status: "watched",
            attachment_url: null,
         })
      ).resolves.toBeUndefined();
   });

   it("throws when sync rpc returns error", async () => {
      rpcMock.mockResolvedValue({ error: new Error("sync-failed") });
      await expect(
         syncReviewToListMembers({
            listId: "l1",
            tmdbId: 99,
            rating: 9,
            review: "Bom",
            recommended: "Assista com certeza",
            status: "watched",
            addedBy: "u1",
            location: "Casa",
            runtime: 120,
         })
      ).rejects.toThrow("sync-failed");
   });

   it("returns null when get authenticated user receives auth error", async () => {
      authGetUserMock.mockResolvedValue({ data: { user: null }, error: new Error("auth-failed") });
      const user = await getAuthenticatedUser();
      expect(user).toBeNull();
   });

   it("throws when hasUserReview query fails", async () => {
      maybeSingleMock.mockResolvedValue({ data: null, error: new Error("has-review-failed") });
      await expect(hasUserReview("u1", 10)).rejects.toThrow("has-review-failed");
   });

   it("throws when getExistingProfileReview query fails", async () => {
      maybeSingleMock.mockResolvedValue({ data: null, error: new Error("profile-review-failed") });
      await expect(getExistingProfileReview("u1", 10)).rejects.toThrow("profile-review-failed");
   });

   it("throws when upserting personal review fails on update", async () => {
      maybeSingleMock.mockResolvedValue({ data: { id: "r1" }, error: null });
      const updateEqMock = vi.fn().mockResolvedValue({ error: new Error("personal-update-failed") });
      updateMock.mockReturnValue({ eq: updateEqMock });

      await expect(
         upsertPersonalReview("u1", 77, {
            rating: 9,
            review: "excelente",
            recommended: "Assista com certeza",
            runtime: 120,
            location: "Cinema",
            status: "watched",
            attachment_url: null,
         })
      ).rejects.toThrow("personal-update-failed");
   });

   it("throws when upserting full shared review lookup fails", async () => {
      maybeSingleMock.mockResolvedValue({ data: null, error: new Error("lookup-full-failed") });
      await expect(
         upsertFullSharedListReview("l1", 50, { rating: 8, review: "ok", recommended: "Vale a pena assistir" })
      ).rejects.toThrow("lookup-full-failed");
   });

   it("throws when upserting partial shared review update fails", async () => {
      maybeSingleMock.mockResolvedValue({ data: { id: "lr1" }, error: null });
      const updateEqMock = vi.fn().mockResolvedValue({ error: new Error("partial-update-failed") });
      updateMock.mockReturnValue({ eq: updateEqMock });

      await expect(
         upsertPartialSharedListReview("l1", 50, "u1", {
            rating: 7,
            review: "bom",
            recommended: "Vale a pena assistir",
            location: "Casa",
            runtime: 130,
         })
      ).rejects.toThrow("partial-update-failed");
   });
});
