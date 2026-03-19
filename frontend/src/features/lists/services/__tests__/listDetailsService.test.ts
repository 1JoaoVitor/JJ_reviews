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
   fetchListCollaborators,
   fetchListMovieIds,
   fetchListOwnerProfile,
   fetchPrivateListReviews,
   fetchSharedListReviews,
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

   it("subscribes list details channel without user specific reviews", () => {
      subscribeListDetailsChanges("l1", undefined, vi.fn());
      expect(onMock).toHaveBeenCalledTimes(2);
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

   it("fetches private list reviews", async () => {
      const inMock = vi.fn().mockResolvedValue({ data: [{ tmdb_id: 10 }], error: null });
      const eqMock = vi.fn().mockReturnValue({ in: inMock });
      selectMock.mockReturnValue({ eq: eqMock });

      const result = await fetchPrivateListReviews("u1", [10]);
      expect(result).toEqual([{ tmdb_id: 10 }]);
   });

   it("fetches shared list reviews", async () => {
      const inMock = vi.fn().mockResolvedValue({ data: [{ tmdb_id: 10 }], error: null });
      const eqMock = vi.fn().mockReturnValue({ in: inMock });
      selectMock.mockReturnValue({ eq: eqMock });

      const result = await fetchSharedListReviews("l1", [10]);
      expect(result).toEqual([{ tmdb_id: 10 }]);
   });

   it("fetches list owner profile", async () => {
      const eqMock = vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { username: "jv", avatar_url: null }, error: null }) });
      selectMock.mockReturnValue({ eq: eqMock });

      const owner = await fetchListOwnerProfile("u1");
      expect(owner).toEqual({ username: "jv", avatar_url: null });
   });

   it("fetches list collaborators", async () => {
      const eqMock = vi.fn().mockResolvedValue({ data: [{ user_id: "u2", status: "accepted" }], error: null });
      selectMock.mockReturnValue({ eq: eqMock });

      const collabs = await fetchListCollaborators("l1");
      expect(collabs).toEqual([{ user_id: "u2", status: "accepted" }]);
   });

   it("throws when fetching list movie ids fails", async () => {
      const eqMock = vi.fn().mockResolvedValue({ data: null, error: new Error("movie-ids-failed") });
      selectMock.mockReturnValue({ eq: eqMock });

      await expect(fetchListMovieIds("l1")).rejects.toThrow("movie-ids-failed");
   });

   it("throws when accepting list invite fails", async () => {
      const secondEq = vi.fn().mockResolvedValue({ error: new Error("accept-failed") });
      const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
      updateMock.mockReturnValue({ eq: firstEq });

      await expect(acceptListInvite("l1", "u1")).rejects.toThrow("accept-failed");
   });

   it("throws when rejecting list invite fails", async () => {
      const secondEq = vi.fn().mockResolvedValue({ error: new Error("reject-failed") });
      const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
      deleteMock.mockReturnValue({ eq: firstEq });

      await expect(rejectListInvite("l1", "u1")).rejects.toThrow("reject-failed");
   });

   it("throws when deleting list record fails", async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: new Error("delete-list-failed") });
      deleteMock.mockReturnValue({ eq: eqMock });

      await expect(deleteListRecord("l1")).rejects.toThrow("delete-list-failed");
   });

   it("throws when deleting user list reviews fails", async () => {
      const secondEq = vi.fn().mockResolvedValue({ error: new Error("delete-reviews-failed") });
      const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
      deleteMock.mockReturnValue({ eq: firstEq });

      await expect(deleteUserListReviews("l1", "u2")).rejects.toThrow("delete-reviews-failed");
   });

   it("throws when removing user from collaborators fails", async () => {
      const secondEq = vi.fn().mockResolvedValue({ error: new Error("remove-collab-failed") });
      const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
      deleteMock.mockReturnValue({ eq: firstEq });

      await expect(removeUserFromListCollaborators("l1", "u2")).rejects.toThrow("remove-collab-failed");
   });
});
