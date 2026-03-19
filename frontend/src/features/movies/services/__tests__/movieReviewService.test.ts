import { beforeEach, describe, expect, it, vi } from "vitest";

const {
   fromMock,
   deleteMock,
   eqMock,
   inMock,
} = vi.hoisted(() => ({
   fromMock: vi.fn(),
   deleteMock: vi.fn(),
   eqMock: vi.fn(),
   inMock: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
   supabase: {
      from: fromMock,
   },
}));

import { deleteReviewById, removeMovieFromPrivateLists } from "../movieReviewService";

describe("movieReviewService", () => {
   beforeEach(() => {
      vi.clearAllMocks();
      eqMock.mockReturnValue({ in: inMock });
      deleteMock.mockReturnValue({ eq: eqMock });
      fromMock.mockReturnValue({ delete: deleteMock });
   });

   it("deletes review by id", async () => {
      eqMock.mockResolvedValue({ error: null });
      await expect(deleteReviewById("review-1")).resolves.toBeUndefined();
      expect(fromMock).toHaveBeenCalledWith("reviews");
   });

   it("throws when deleting review by id fails", async () => {
      eqMock.mockResolvedValue({ error: new Error("delete-review-failed") });
      await expect(deleteReviewById("review-1")).rejects.toThrow("delete-review-failed");
   });

   it("removes movie from private lists", async () => {
      inMock.mockResolvedValue({ error: null });
      await expect(removeMovieFromPrivateLists(10, ["l1", "l2"]))
         .resolves.toBeUndefined();
      expect(fromMock).toHaveBeenCalledWith("list_movies");
   });

   it("skips delete when private list ids are empty", async () => {
      await expect(removeMovieFromPrivateLists(10, [])).resolves.toBeUndefined();
      expect(fromMock).not.toHaveBeenCalled();
   });

   it("throws when removing movie from private lists fails", async () => {
      inMock.mockResolvedValue({ error: new Error("remove-private-failed") });
      await expect(removeMovieFromPrivateLists(10, ["l1"])).rejects.toThrow("remove-private-failed");
   });
});
