import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cloneListService,
  fetchListLikers,
  toggleListLike,
} from "../listSocialService";
import * as listsService from "../listsService";
import type { CustomList } from "@/types";

vi.mock("../listsService", () => ({
  createListRecord: vi.fn(),
  addCollaboratorsToList: vi.fn(),
  notifyListCollaborators: vi.fn(),
}));

const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

function mockListLikesSelectMaybeSingle(result: { data: unknown; error: unknown }) {
  const maybeSingleMock = vi.fn().mockResolvedValue(result);
  const eqSecond = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
  const eqFirst = vi.fn().mockReturnValue({ eq: eqSecond });

  fromMock.mockReturnValueOnce({
    select: vi.fn().mockReturnValue({ eq: eqFirst }),
  });

  return { maybeSingleMock };
}

function mockListLikesDelete(result: { error: unknown }) {
  const eqSecond = vi.fn().mockReturnValue(result);
  const eqFirst = vi.fn().mockReturnValue({ eq: eqSecond });

  fromMock.mockReturnValueOnce({
    delete: vi.fn().mockReturnValue({ eq: eqFirst }),
  });
}

function mockListLikesInsert(result: { error: unknown }) {
  fromMock.mockReturnValueOnce({
    insert: vi.fn().mockResolvedValue(result),
  });
}

function mockListsSingle(result: { data: unknown; error: unknown }) {
  const singleMock = vi.fn().mockResolvedValue(result);
  const eqMock = vi.fn().mockReturnValue({ single: singleMock });

  fromMock.mockReturnValueOnce({
    select: vi.fn().mockReturnValue({ eq: eqMock }),
  });
}

function mockListMoviesSelect(result: { data: unknown; error: unknown }) {
  const eqMock = vi.fn().mockResolvedValue(result);

  fromMock.mockReturnValueOnce({
    select: vi.fn().mockReturnValue({ eq: eqMock }),
  });
}

function mockListMoviesInsert(result: { error: unknown }) {
  fromMock.mockReturnValueOnce({
    insert: vi.fn().mockResolvedValue(result),
  });
}

function mockReviewsSelect(result: { data: unknown; error: unknown }) {
  const inMock = vi.fn().mockResolvedValue(result);
  const eqMock = vi.fn().mockReturnValue({ in: inMock });

  fromMock.mockReturnValueOnce({
    select: vi.fn().mockReturnValue({ eq: eqMock }),
  });
}

function mockListReviewsSelect(result: { data: unknown; error: unknown }) {
  const inMock = vi.fn().mockResolvedValue(result);
  const eqMock = vi.fn().mockReturnValue({ in: inMock });

  fromMock.mockReturnValueOnce({
    select: vi.fn().mockReturnValue({ eq: eqMock }),
  });
}

function mockListReviewsInsert(result: { error: unknown }) {
  fromMock.mockReturnValueOnce({
    insert: vi.fn().mockResolvedValue(result),
  });
}

function mockReviewsUpsert(result: { error: unknown }) {
  fromMock.mockReturnValueOnce({
    upsert: vi.fn().mockResolvedValue(result),
  });
}

describe("listSocialService", () => {
  const createListRecordMock = vi.mocked(listsService.createListRecord);
  const addCollaboratorsToListMock = vi.mocked(listsService.addCollaboratorsToList);
  const notifyListCollaboratorsMock = vi.mocked(listsService.notifyListCollaborators);

  const mockNewList = {
    id: "new_123",
    owner_id: "u1",
    name: "Copia",
    type: "private",
    created_at: "2026-01-01T00:00:00.000Z",
  } as CustomList;

  beforeEach(() => {
    vi.clearAllMocks();
    createListRecordMock.mockResolvedValue(mockNewList);
    addCollaboratorsToListMock.mockResolvedValue(undefined);
    notifyListCollaboratorsMock.mockResolvedValue(undefined);
  });

  describe("toggleListLike", () => {
    it("toggles like with new rpc signature", async () => {
      rpcMock.mockResolvedValue({ data: true, error: null });

      const result = await toggleListLike("l1");

      expect(result).toBe(true);
      expect(rpcMock).toHaveBeenCalledWith("toggle_list_like", { p_list_id: "l1" });
    });

    it("uses legacy rpc params when backend requires p_user_id", async () => {
      rpcMock
        .mockResolvedValueOnce({ data: null, error: { code: "PGRST202", message: "missing p_user_id" } })
        .mockResolvedValueOnce({ data: false, error: null });

      const result = await toggleListLike("l1", "u1");

      expect(result).toBe(false);
      expect(rpcMock).toHaveBeenNthCalledWith(2, "toggle_list_like", {
        p_list_id: "l1",
        p_user_id: "u1",
      });
    });

    it("throws when rpc 404 happens without user id for fallback", async () => {
      rpcMock.mockResolvedValue({ data: null, error: { code: "404", message: "not found" } });

      await expect(toggleListLike("l1")).rejects.toEqual({ code: "404", message: "not found" });
    });

    it("fallback deletes existing like on rpc 404", async () => {
      rpcMock.mockResolvedValue({ data: null, error: { code: "404", message: "missing function" } });
      mockListLikesSelectMaybeSingle({ data: { list_id: "l1" }, error: null });
      mockListLikesDelete({ error: null });

      const result = await toggleListLike("l1", "u1");

      expect(result).toBe(false);
      expect(fromMock).toHaveBeenCalledWith("list_likes");
    });

    it("fallback inserts like when no existing row on rpc 404", async () => {
      rpcMock.mockResolvedValue({ data: null, error: { code: "404", message: "missing function" } });
      mockListLikesSelectMaybeSingle({ data: null, error: null });
      mockListLikesInsert({ error: null });

      const result = await toggleListLike("l1", "u1");

      expect(result).toBe(true);
    });

    it("returns true on localhost when likes table is missing in fallback", async () => {
      rpcMock.mockResolvedValue({ data: null, error: { code: "404", message: "missing function" } });
      mockListLikesSelectMaybeSingle({ data: null, error: { code: "42P01", message: "relation does not exist" } });

      const originalWindow = globalThis.window;
      Object.defineProperty(globalThis, "window", {
        value: { location: { hostname: "localhost" } },
        configurable: true,
      });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const result = await toggleListLike("l1", "u1");

      expect(result).toBe(true);
      expect(warnSpy).toHaveBeenCalledTimes(1);

      warnSpy.mockRestore();
      Object.defineProperty(globalThis, "window", {
        value: originalWindow,
        configurable: true,
      });
    });

    it("throws non-404 rpc errors", async () => {
      rpcMock.mockResolvedValue({ data: null, error: { code: "500", message: "db failure" } });
      await expect(toggleListLike("l1", "u1")).rejects.toEqual({ code: "500", message: "db failure" });
    });
  });

  describe("fetchListLikers", () => {
    it("returns likers joined with profiles", async () => {
      const eqMock = vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({
        data: [
          { user_id: "u1", created_at: "2026-01-01T00:00:00.000Z" },
          { user_id: "u2", created_at: "2026-01-02T00:00:00.000Z" },
        ],
        error: null,
      }) });

      const inMock = vi.fn().mockResolvedValue({
        data: [
          { id: "u1", username: "joao", avatar_url: null },
          { id: "u2", username: "maria", avatar_url: "a.png" },
        ],
        error: null,
      });

      fromMock
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue({ eq: eqMock }) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue({ in: inMock }) });

      const result = await fetchListLikers("l1");

      expect(result).toEqual([
        { id: "u1", username: "joao", avatar_url: null, liked_at: "2026-01-01T00:00:00.000Z" },
        { id: "u2", username: "maria", avatar_url: "a.png", liked_at: "2026-01-02T00:00:00.000Z" },
      ]);
    });

    it("returns empty array when list has no likes", async () => {
      const eqMock = vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) });
      fromMock.mockReturnValueOnce({ select: vi.fn().mockReturnValue({ eq: eqMock }) });

      const result = await fetchListLikers("l1");
      expect(result).toEqual([]);
    });

    it("throws when likes fetch fails", async () => {
      const eqMock = vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: null, error: new Error("likes-failed") }) });
      fromMock.mockReturnValueOnce({ select: vi.fn().mockReturnValue({ eq: eqMock }) });

      await expect(fetchListLikers("l1")).rejects.toThrow("likes-failed");
    });

    it("filters likes that have no matching profile", async () => {
      const eqMock = vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({
        data: [{ user_id: "u1", created_at: "2026-01-01T00:00:00.000Z" }],
        error: null,
      }) });

      const inMock = vi.fn().mockResolvedValue({ data: [], error: null });

      fromMock
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue({ eq: eqMock }) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue({ in: inMock }) });

      const result = await fetchListLikers("l1");
      expect(result).toEqual([]);
    });
  });

  describe("cloneListService", () => {
    it("throws when shared clone has no collaborators", async () => {
      await expect(cloneListService("old_1", "u1", "Copia", "partial_shared", { copyRatings: false }))
        .rejects
        .toThrow("Listas compartilhadas exigem pelo menos um colaborador.");
    });

    it("clones shared list with ratings from private source and syncs profile when not exclusive", async () => {
      createListRecordMock.mockResolvedValue({ ...mockNewList, type: "partial_shared" });

      mockListsSingle({
        data: {
          owner_id: "owner_1",
          description: "desc",
          has_rating: true,
          rating_type: "average",
          manual_rating: null,
          auto_sync: true,
          type: "private",
        },
        error: null,
      });
      mockListMoviesSelect({ data: [{ tmdb_id: 101 }], error: null });
      mockListMoviesInsert({ error: null });
      mockReviewsSelect({
        data: [{ tmdb_id: 101, rating: 4, review: "otimo", recommended: "sim", location: null, runtime: 100 }],
        error: null,
      });
      mockListReviewsInsert({ error: null });
      mockReviewsUpsert({ error: null });

      const result = await cloneListService("old_1", "u1", "Copia", "partial_shared", {
        collaboratorIds: ["u2"],
        copyRatings: true,
        ratingsExclusiveToList: false,
      });

      expect(result.id).toBe("new_123");
      expect(addCollaboratorsToListMock).toHaveBeenCalledWith("new_123", ["u2"]);
      expect(notifyListCollaboratorsMock).toHaveBeenCalledWith("u1", "new_123", "partial_shared", ["u2"]);
      expect(fromMock).toHaveBeenCalledWith("list_reviews");
      expect(fromMock).toHaveBeenCalledWith("reviews");
    });

    it("clones full shared target from shared source using grouped review rows", async () => {
      createListRecordMock.mockResolvedValue({ ...mockNewList, type: "full_shared" });

      mockListsSingle({
        data: {
          owner_id: "owner_1",
          description: "desc",
          has_rating: true,
          rating_type: "average",
          manual_rating: null,
          auto_sync: true,
          type: "full_shared",
        },
        error: null,
      });
      mockListMoviesSelect({ data: [{ tmdb_id: 101 }], error: null });
      mockListMoviesInsert({ error: null });
      mockListReviewsSelect({
        data: [
          { tmdb_id: 101, user_id: null, rating: 3, review: "grupo", recommended: "ok", location: null, runtime: null },
          { tmdb_id: 101, user_id: "owner_1", rating: 5, review: "owner", recommended: "sim", location: null, runtime: null },
        ],
        error: null,
      });
      mockListReviewsInsert({ error: null });

      const result = await cloneListService("old_1", "u1", "Copia", "full_shared", {
        collaboratorIds: ["u2"],
        copyRatings: true,
        ratingsExclusiveToList: true,
      });

      expect(result.id).toBe("new_123");
      expect(fromMock).toHaveBeenCalledWith("list_reviews");
      expect(fromMock).not.toHaveBeenCalledWith("reviews");
    });

    it("throws when source list metadata cannot be loaded", async () => {
      mockListsSingle({ data: null, error: new Error("source-failed") });

      await expect(cloneListService("old_1", "u1", "Copia", "private", { copyRatings: true }))
        .rejects
        .toThrow("source-failed");
    });

    it("throws when movie list fetch fails", async () => {
      mockListMoviesSelect({ data: null, error: new Error("movies-failed") });

      await expect(cloneListService("old_1", "u1", "Copia", "private", { copyRatings: false }))
        .rejects
        .toThrow("movies-failed");
    });

    it("throws when movie insertion fails", async () => {
      mockListMoviesSelect({ data: [{ tmdb_id: 101 }], error: null });
      mockListMoviesInsert({ error: new Error("insert-failed") });

      await expect(cloneListService("old_1", "u1", "Copia", "private", { copyRatings: false }))
        .rejects
        .toThrow("insert-failed");
    });
  });
});
