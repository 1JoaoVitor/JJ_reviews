import { beforeEach, describe, expect, it, vi } from "vitest";

const {
   fromMock,
   selectMock,
   updateMock,
   deleteMock,
   channelMock,
   removeChannelMock,
   onMock,
   subscribeMock,
} = vi.hoisted(() => ({
   fromMock: vi.fn(),
   selectMock: vi.fn(),
   updateMock: vi.fn(),
   deleteMock: vi.fn(),
   channelMock: vi.fn(),
   removeChannelMock: vi.fn(),
   onMock: vi.fn(),
   subscribeMock: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
   supabase: {
      from: fromMock,
      channel: channelMock,
      removeChannel: removeChannelMock,
   },
}));

import {
   acceptListInvite,
   deleteListRecord,
   deleteUserListReviews,
   fetchListMovieIds,
   rejectListInvite,
   removeUserFromListCollaborators,
   subscribeListDetailsChanges,
} from "../listsService";

describe("listsService ListDetails helpers", () => {
   beforeEach(() => {
      vi.clearAllMocks();

      onMock.mockReturnThis();
      subscribeMock.mockReturnValue({ id: "list-channel" });
      channelMock.mockReturnValue({ on: onMock, subscribe: subscribeMock });

      fromMock.mockReturnValue({
         select: selectMock,
         update: updateMock,
         delete: deleteMock,
      });
   });

   it("fetches tmdb ids for list", async () => {
      const eqMock = vi.fn().mockResolvedValue({
         data: [{ tmdb_id: 10 }, { tmdb_id: 20 }],
         error: null,
      });
      selectMock.mockReturnValue({ eq: eqMock });

      const result = await fetchListMovieIds("l1");
      expect(result).toEqual([10, 20]);
   });

   it("deletes list record", async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      deleteMock.mockReturnValue({ eq: eqMock });

      await expect(deleteListRecord("l1")).resolves.toBeUndefined();
      expect(fromMock).toHaveBeenCalledWith("lists");
   });

   it("accepts invite by updating collaborator status", async () => {
      const secondEq = vi.fn().mockResolvedValue({ error: null });
      const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
      updateMock.mockReturnValue({ eq: firstEq });

      await expect(acceptListInvite("l1", "u1")).resolves.toBeUndefined();
      expect(fromMock).toHaveBeenCalledWith("list_collaborators");
   });

   it("subscribes and unsubscribes list details channels", () => {
      const unsubscribe = subscribeListDetailsChanges("l1", "u1", vi.fn());
      expect(channelMock).toHaveBeenCalledWith("list_updates_l1");

      unsubscribe();
      expect(removeChannelMock).toHaveBeenCalledWith({ on: onMock, subscribe: subscribeMock });
   });

   it("rejects invite by deleting collaborator relation", async () => {
      const secondEq = vi.fn().mockResolvedValue({ error: null });
      const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
      deleteMock.mockReturnValue({ eq: firstEq });

      await expect(rejectListInvite("l1", "u2")).resolves.toBeUndefined();
      expect(fromMock).toHaveBeenCalledWith("list_collaborators");
   });

   it("deletes user list reviews", async () => {
      const secondEq = vi.fn().mockResolvedValue({ error: null });
      const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
      deleteMock.mockReturnValue({ eq: firstEq });

      await expect(deleteUserListReviews("l1", "u2")).resolves.toBeUndefined();
      expect(fromMock).toHaveBeenCalledWith("list_reviews");
   });

   it("removes user from list collaborators", async () => {
      const secondEq = vi.fn().mockResolvedValue({ error: null });
      const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
      deleteMock.mockReturnValue({ eq: firstEq });

      await expect(removeUserFromListCollaborators("l1", "u2")).resolves.toBeUndefined();
      expect(fromMock).toHaveBeenCalledWith("list_collaborators");
   });
});
