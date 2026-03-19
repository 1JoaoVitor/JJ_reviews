import { beforeEach, describe, expect, it, vi } from "vitest";

const {
   authGetUserMock,
   fromMock,
   selectMock,
   eqMock,
   maybeSingleMock,
   updateMock,
   insertMock,
   isMock,
   rpcMock,
} = vi.hoisted(() => ({
   authGetUserMock: vi.fn(),
   fromMock: vi.fn(),
   selectMock: vi.fn(),
   eqMock: vi.fn(),
   maybeSingleMock: vi.fn(),
   updateMock: vi.fn(),
   insertMock: vi.fn(),
   isMock: vi.fn(),
   rpcMock: vi.fn(),
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
            upload: vi.fn(),
            getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.com/file.jpg" } })),
         })),
      },
   },
}));

import {
   getAuthenticatedUser,
   getExistingProfileReview,
   hasUserReview,
   syncReviewToListMembers,
   upsertFullSharedListReview,
} from "../moviePersistenceService";

describe("moviePersistenceService", () => {
   beforeEach(() => {
      vi.clearAllMocks();

      selectMock.mockReturnValue({ eq: eqMock });
      eqMock.mockReturnValue({
         eq: eqMock,
         maybeSingle: maybeSingleMock,
         is: isMock,
      });
      isMock.mockReturnValue({ maybeSingle: maybeSingleMock });
      updateMock.mockReturnValue({ eq: eqMock });

      fromMock.mockReturnValue({
         select: selectMock,
         update: updateMock,
         insert: insertMock,
      });
   });

   it("returns null when user is unauthenticated", async () => {
      authGetUserMock.mockResolvedValue({ data: { user: null }, error: null });
      const user = await getAuthenticatedUser();
      expect(user).toBeNull();
   });

   it("checks if user review exists", async () => {
      maybeSingleMock.mockResolvedValue({ data: { id: "r1" }, error: null });
      const exists = await hasUserReview("u1", 10);
      expect(exists).toBe(true);
   });

   it("gets existing profile review with status", async () => {
      maybeSingleMock.mockResolvedValue({ data: { id: "r2", status: "watched" }, error: null });
      const review = await getExistingProfileReview("u1", 20);
      expect(review).toEqual({ id: "r2", status: "watched" });
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
});
