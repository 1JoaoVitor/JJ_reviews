import { beforeEach, describe, expect, it, vi } from "vitest";

const {
   fromMock,
   channelMock,
   removeChannelMock,
   selectMock,
   eqMock,
   inMock,
   matchMock,
   maybeSingleMock,
   insertMock,
   updateMock,
   deleteMock,
   singleMock,
   subscribeMock,
   onMock,
} = vi.hoisted(() => ({
   fromMock: vi.fn(),
   channelMock: vi.fn(),
   removeChannelMock: vi.fn(),
   selectMock: vi.fn(),
   eqMock: vi.fn(),
   inMock: vi.fn(),
   matchMock: vi.fn(),
   maybeSingleMock: vi.fn(),
   insertMock: vi.fn(),
   updateMock: vi.fn(),
   deleteMock: vi.fn(),
   singleMock: vi.fn(),
   subscribeMock: vi.fn(),
   onMock: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
   supabase: {
      from: fromMock,
      channel: channelMock,
      removeChannel: removeChannelMock,
   },
}));

import {
   addMovieToListRecord,
   addCollaboratorsToList,
   createListRecord,
   fetchCollaborativeLists,
   fetchListCollaborators,
   fetchListOwnerProfile,
   fetchPrivateListReviews,
   fetchSharedListReviews,
   fetchOwnedLists,
   listMovieExists,
   notifyListCollaborators,
   removeMovieFromListRecord,
   subscribeListsChanges,
   updateListRecord,
} from "../listsService";

describe("listsService", () => {
   beforeEach(() => {
      vi.clearAllMocks();

      selectMock.mockReturnValue({ eq: eqMock, match: matchMock });
      eqMock.mockReturnValue({ in: inMock, single: singleMock });
      matchMock.mockReturnValue({ maybeSingle: maybeSingleMock });
      inMock.mockResolvedValue({ data: [], error: null });
      insertMock.mockReturnValue({ select: () => ({ single: singleMock }) });
      updateMock.mockReturnValue({ eq: eqMock });
      deleteMock.mockReturnValue({ match: matchMock });

      onMock.mockReturnThis();
      subscribeMock.mockReturnValue({ id: "channel-id" });
      channelMock.mockReturnValue({ on: onMock, subscribe: subscribeMock });

      fromMock.mockReturnValue({
         select: selectMock,
         match: matchMock,
         insert: insertMock,
         update: updateMock,
         delete: deleteMock,
      });
   });

   it("fetches owned lists", async () => {
      eqMock.mockResolvedValue({ data: [{ id: "l1" }], error: null });
      const result = await fetchOwnedLists("u1");
      expect(result).toEqual([{ id: "l1" }]);
   });

   it("flattens collaborative lists response", async () => {
      inMock.mockResolvedValue({
         data: [
            { lists: { id: "a" } },
            { lists: [{ id: "b" }, { id: "c" }] },
            { lists: null },
         ],
         error: null,
      });

      const result = await fetchCollaborativeLists("u1");
      expect(result).toEqual([{ id: "a" }, { id: "b" }, { id: "c" }]);
   });

   it("creates list record", async () => {
      singleMock.mockResolvedValue({ data: { id: "new-list" }, error: null });
      const result = await createListRecord({
         ownerId: "u1",
         name: "Lista",
         description: "desc",
         type: "private",
         has_rating: false,
         rating_type: null,
         manual_rating: null,
         auto_sync: false,
      });
      expect(result.id).toBe("new-list");
   });

   it("subscribes and unsubscribes list channels", () => {
      const onChange = vi.fn();
      const unsubscribe = subscribeListsChanges("u1", onChange);

      expect(channelMock).toHaveBeenCalledWith("custom-all-lists-changes");
      unsubscribe();
      expect(removeChannelMock).toHaveBeenCalledWith({ id: "channel-id" });
   });

   it("does not insert collaborators when list is empty", async () => {
      await expect(addCollaboratorsToList("l1", [])).resolves.toBeUndefined();
      expect(fromMock).not.toHaveBeenCalledWith("list_collaborators");
   });

   it("skips notifications for private lists", async () => {
      await expect(notifyListCollaborators("u1", "l1", "private", ["u2"])).resolves.toBeUndefined();
      expect(fromMock).not.toHaveBeenCalledWith("notifications");
   });

   it("checks movie existence by list and tmdb id", async () => {
      maybeSingleMock.mockResolvedValue({ data: { tmdb_id: 10 }, error: null });
      const exists = await listMovieExists("l1", 10);
      expect(exists).toBe(true);
   });

   it("returns false when movie does not exist", async () => {
      maybeSingleMock.mockResolvedValue({ data: null, error: null });
      const exists = await listMovieExists("l1", 99);
      expect(exists).toBe(false);
   });

   it("adds collaborators when list is not empty", async () => {
      insertMock.mockResolvedValue({ error: null });
      await expect(addCollaboratorsToList("l1", ["u2", "u3"]))
         .resolves.toBeUndefined();
      expect(fromMock).toHaveBeenCalledWith("list_collaborators");
   });

   it("sends notifications for shared lists", async () => {
      insertMock.mockResolvedValue({ error: null });
      await expect(notifyListCollaborators("u1", "l1", "full_shared", ["u2"]))
         .resolves.toBeUndefined();
      expect(fromMock).toHaveBeenCalledWith("notifications");
   });

   it("adds movie to list", async () => {
      insertMock.mockResolvedValue({ error: null });
      await expect(addMovieToListRecord("l1", 10, "u1")).resolves.toBeUndefined();
      expect(fromMock).toHaveBeenCalledWith("list_movies");
   });

   it("updates list record", async () => {
      const updateEqMock = vi.fn().mockResolvedValue({ error: null });
      updateMock.mockReturnValue({ eq: updateEqMock });

      await expect(updateListRecord("l1", {
         name: "Nova Lista",
         description: "desc",
         has_rating: true,
         rating_type: "manual",
         manual_rating: 8,
         auto_sync: false,
      })).resolves.toBeUndefined();
      expect(fromMock).toHaveBeenCalledWith("lists");
   });

   it("removes movie from list", async () => {
      matchMock.mockResolvedValue({ error: null });
      await expect(removeMovieFromListRecord("l1", 10)).resolves.toBeUndefined();
      expect(fromMock).toHaveBeenCalledWith("list_movies");
   });

   it("fetches private list reviews and short-circuits empty ids", async () => {
      const inLocalMock = vi.fn().mockResolvedValue({ data: [{ id: "r1" }], error: null });
      const eqLocalMock = vi.fn().mockReturnValue({ in: inLocalMock });
      const selectLocalMock = vi.fn().mockReturnValue({ eq: eqLocalMock });

      fromMock.mockImplementation((table: string) => {
         if (table === "reviews") {
            return { select: selectLocalMock };
         }
         return {
            select: selectMock,
            match: matchMock,
            insert: insertMock,
            update: updateMock,
            delete: deleteMock,
         };
      });

      await expect(fetchPrivateListReviews("u1", [])).resolves.toEqual([]);
      const result = await fetchPrivateListReviews("u1", [10]);
      expect(result).toEqual([{ id: "r1" }]);
   });

   it("fetches shared list reviews and short-circuits empty ids", async () => {
      const inLocalMock = vi.fn().mockResolvedValue({ data: [{ tmdb_id: 10 }], error: null });
      const eqLocalMock = vi.fn().mockReturnValue({ in: inLocalMock });
      const selectLocalMock = vi.fn().mockReturnValue({ eq: eqLocalMock });

      fromMock.mockImplementation((table: string) => {
         if (table === "list_reviews") {
            return { select: selectLocalMock };
         }
         return {
            select: selectMock,
            match: matchMock,
            insert: insertMock,
            update: updateMock,
            delete: deleteMock,
         };
      });

      await expect(fetchSharedListReviews("l1", [])).resolves.toEqual([]);
      const result = await fetchSharedListReviews("l1", [10]);
      expect(result).toEqual([{ tmdb_id: 10 }]);
   });

   it("fetches list owner profile", async () => {
      const eqLocalMock = vi.fn().mockReturnValue({ single: singleMock });
      const selectLocalMock = vi.fn().mockReturnValue({ eq: eqLocalMock });
      singleMock.mockResolvedValue({ data: { username: "joao", avatar_url: "x" }, error: null });

      fromMock.mockImplementation((table: string) => {
         if (table === "profiles") {
            return { select: selectLocalMock };
         }
         return {
            select: selectMock,
            match: matchMock,
            insert: insertMock,
            update: updateMock,
            delete: deleteMock,
         };
      });

      const owner = await fetchListOwnerProfile("u1");
      expect(owner).toEqual({ username: "joao", avatar_url: "x" });
   });

   it("fetches list collaborators", async () => {
      const eqLocalMock = vi.fn().mockResolvedValue({ data: [{ user_id: "u2", status: "accepted" }], error: null });
      const selectLocalMock = vi.fn().mockReturnValue({ eq: eqLocalMock });

      fromMock.mockImplementation((table: string) => {
         if (table === "list_collaborators") {
            return { select: selectLocalMock, insert: insertMock };
         }
         return {
            select: selectMock,
            match: matchMock,
            insert: insertMock,
            update: updateMock,
            delete: deleteMock,
         };
      });

      const collabs = await fetchListCollaborators("l1");
      expect(collabs).toEqual([{ user_id: "u2", status: "accepted" }]);
   });

   it("throws when movie existence query fails", async () => {
      maybeSingleMock.mockResolvedValue({ data: null, error: new Error("exists-failed") });
      await expect(listMovieExists("l1", 99)).rejects.toThrow("exists-failed");
   });

   it("throws when adding collaborators fails", async () => {
      insertMock.mockResolvedValue({ error: new Error("collab-failed") });
      await expect(addCollaboratorsToList("l1", ["u2"]))
         .rejects.toThrow("collab-failed");
   });

   it("throws when adding movie to list fails", async () => {
      insertMock.mockResolvedValue({ error: new Error("add-movie-failed") });
      await expect(addMovieToListRecord("l1", 10, "u1")).rejects.toThrow("add-movie-failed");
   });

   it("throws when updating list fails", async () => {
      const updateEqMock = vi.fn().mockResolvedValue({ error: new Error("update-list-failed") });
      updateMock.mockReturnValue({ eq: updateEqMock });

      await expect(updateListRecord("l1", {
         name: "Nova Lista",
         description: "desc",
         has_rating: true,
         rating_type: "manual",
         manual_rating: 8,
         auto_sync: false,
      })).rejects.toThrow("update-list-failed");
   });

   it("throws when removing movie from list fails", async () => {
      matchMock.mockResolvedValue({ error: new Error("remove-movie-failed") });
      await expect(removeMovieFromListRecord("l1", 10)).rejects.toThrow("remove-movie-failed");
   });
});
