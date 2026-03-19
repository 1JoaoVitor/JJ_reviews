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
   addCollaboratorsToList,
   createListRecord,
   fetchCollaborativeLists,
   fetchOwnedLists,
   listMovieExists,
   notifyListCollaborators,
   subscribeListsChanges,
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
});
