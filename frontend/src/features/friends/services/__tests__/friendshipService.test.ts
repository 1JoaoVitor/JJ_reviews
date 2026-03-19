import { beforeEach, describe, expect, it, vi } from "vitest";

const { fromMock, selectMock, orMock, maybeSingleMock, insertMock, updateMock, matchMock, deleteMock } = vi.hoisted(() => ({
   fromMock: vi.fn(),
   selectMock: vi.fn(),
   orMock: vi.fn(),
   maybeSingleMock: vi.fn(),
   insertMock: vi.fn(),
   updateMock: vi.fn(),
   matchMock: vi.fn(),
   deleteMock: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
   supabase: {
      from: fromMock,
   },
}));

import {
   acceptFriendRequest,
   deleteFriendshipBetween,
   deleteIncomingFriendRequest,
   createFriendRequest,
   fetchFriendshipsForTargets,
   fetchFriendshipBetween,
   notifyFriendAccepted,
   notifyFriendRequest,
} from "../friendshipService";

describe("friendshipService", () => {
   beforeEach(() => {
      vi.clearAllMocks();
      selectMock.mockReturnValue({ or: orMock });
      orMock.mockReturnValue({ maybeSingle: maybeSingleMock });
      updateMock.mockReturnValue({ match: matchMock });
      deleteMock.mockReturnValue({ match: matchMock, or: matchMock });

      fromMock.mockReturnValue({
         select: selectMock,
         insert: insertMock,
         update: updateMock,
         delete: deleteMock,
      });
    });

   it("fetches friendship between two users", async () => {
      maybeSingleMock.mockResolvedValue({
         data: { requester_id: "u1", receiver_id: "u2", status: "pending" },
         error: null,
      });

      const result = await fetchFriendshipBetween("u1", "u2");
      expect(result?.status).toBe("pending");
   });

   it("creates friend request", async () => {
      insertMock.mockResolvedValue({ error: null });
      await expect(createFriendRequest("u1", "u2")).resolves.toBeUndefined();
   });

   it("accepts friend request", async () => {
      matchMock.mockResolvedValue({ error: null });
      await expect(acceptFriendRequest("u1", "u2")).resolves.toBeUndefined();
   });

   it("notifies friend request", async () => {
      insertMock.mockResolvedValue({ error: null });
      await expect(notifyFriendRequest("u2", "u1")).resolves.toBeUndefined();
      expect(fromMock).toHaveBeenCalledWith("notifications");
   });

   it("notifies friend accepted", async () => {
      insertMock.mockResolvedValue({ error: null });
      await expect(notifyFriendAccepted("u1", "u2")).resolves.toBeUndefined();
      expect(fromMock).toHaveBeenCalledWith("notifications");
   });

   it("deletes incoming friend request", async () => {
      matchMock.mockResolvedValue({ error: null });
      await expect(deleteIncomingFriendRequest("u1", "u2")).resolves.toBeUndefined();
      expect(fromMock).toHaveBeenCalledWith("friendships");
   });

   it("deletes friendship in both directions", async () => {
      matchMock.mockResolvedValue({ error: null });
      await expect(deleteFriendshipBetween("u1", "u2")).resolves.toBeUndefined();
      expect(fromMock).toHaveBeenCalledWith("friendships");
   });

   it("throws when fetch friendship fails", async () => {
      maybeSingleMock.mockResolvedValue({ data: null, error: new Error("fetch-failed") });
      await expect(fetchFriendshipBetween("u1", "u2")).rejects.toThrow("fetch-failed");
   });

   it("throws when create friend request fails", async () => {
      insertMock.mockResolvedValue({ error: new Error("insert-failed") });
      await expect(createFriendRequest("u1", "u2")).rejects.toThrow("insert-failed");
   });

   it("throws when accept friend request fails", async () => {
      matchMock.mockResolvedValue({ error: new Error("update-failed") });
      await expect(acceptFriendRequest("u1", "u2")).rejects.toThrow("update-failed");
   });

   it("throws when deleting incoming request fails", async () => {
      matchMock.mockResolvedValue({ error: new Error("delete-failed") });
      await expect(deleteIncomingFriendRequest("u1", "u2")).rejects.toThrow("delete-failed");
   });

   it("throws when deleting friendship fails", async () => {
      matchMock.mockResolvedValue({ error: new Error("delete-both-failed") });
      await expect(deleteFriendshipBetween("u1", "u2")).rejects.toThrow("delete-both-failed");
   });

   it("returns empty array when target list is empty", async () => {
      const result = await fetchFriendshipsForTargets("u1", []);
      expect(result).toEqual([]);
      expect(fromMock).not.toHaveBeenCalled();
   });

   it("fetches friendships in batch for target users", async () => {
      const orBatchMock = vi.fn().mockResolvedValue({
         data: [{ requester_id: "u1", receiver_id: "u2", status: "accepted" }],
         error: null,
      });

      fromMock.mockReturnValueOnce({
         select: vi.fn().mockReturnValue({ or: orBatchMock }),
      });

      const result = await fetchFriendshipsForTargets("u1", ["u2", "u3"]);

      expect(result).toEqual([{ requester_id: "u1", receiver_id: "u2", status: "accepted" }]);
      expect(orBatchMock).toHaveBeenCalledTimes(1);
   });

   it("throws when batch friendship query fails", async () => {
      const orBatchMock = vi.fn().mockResolvedValue({ data: null, error: new Error("batch-failed") });

      fromMock.mockReturnValueOnce({
         select: vi.fn().mockReturnValue({ or: orBatchMock }),
      });

      await expect(fetchFriendshipsForTargets("u1", ["u2"]))
         .rejects
         .toThrow("batch-failed");
   });
});
