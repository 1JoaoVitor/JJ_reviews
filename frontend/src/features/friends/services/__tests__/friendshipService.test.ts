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
   createFriendRequest,
   fetchFriendshipBetween,
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
});
