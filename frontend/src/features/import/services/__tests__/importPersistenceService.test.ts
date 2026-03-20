import { beforeEach, describe, expect, it, vi } from "vitest";
import { persistImportedData } from "../importPersistenceService";

vi.mock("@/features/movies/services/moviePersistenceService", () => ({
  upsertPersonalReview: vi.fn(),
}));

vi.mock("@/features/lists/services/listsService", () => ({
  createListRecord: vi.fn(),
  addMovieToListRecord: vi.fn(),
}));

const { upsertPersonalReview } = await import("@/features/movies/services/moviePersistenceService");
const { createListRecord, addMovieToListRecord } = await import("@/features/lists/services/listsService");

describe("importPersistenceService", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(createListRecord).mockResolvedValue({
      id: "list-1",
      owner_id: "user-1",
      name: "Sci-Fi",
      type: "private",
      created_at: "2026-01-01",
    });

    vi.mocked(addMovieToListRecord).mockResolvedValue();
    vi.mocked(upsertPersonalReview).mockResolvedValue();
  });

  it("persists movies and lists and returns success stats", async () => {
    const result = await persistImportedData({
      userId: "user-1",
      processedData: {
        fileName: "letterboxd.zip",
        status: "success",
        movies: [
          { name: "The Matrix", year: 1999, tmdbId: 603, status: "watched", rating: 8.5 },
          { name: "Inception", year: 2010, tmdbId: 27205, status: "watchlist" },
        ],
        lists: [
          {
            id: "tmp-list",
            name: "Sci-Fi",
            type: "private",
            movies: [
              { name: "The Matrix", year: 1999, tmdbId: 603, status: "watched" },
              { name: "The Matrix", year: 1999, tmdbId: 603, status: "watched" },
              { name: "Inception", year: 2010, tmdbId: 27205, status: "watchlist" },
            ],
          },
        ],
        stats: {
          totalMovies: 2,
          matchedMovies: 2,
          unmatchedMovies: 0,
          totalLists: 1,
        },
      },
    });

    expect(result.success).toBe(true);
    expect(upsertPersonalReview).toHaveBeenCalledTimes(2);
    expect(createListRecord).toHaveBeenCalledTimes(1);
    expect(addMovieToListRecord).toHaveBeenCalledTimes(2);
    expect(result.stats.moviesImported).toBe(2);
    expect(result.stats.watchedAdded).toBe(1);
    expect(result.stats.watchlistAdded).toBe(1);
    expect(result.stats.reviewsAdded).toBe(1);
    expect(result.stats.listsCreated).toBe(1);
    expect(result.stats.conflicts).toBe(1);
  });

  it("collects errors and marks import as partial when persistence fails", async () => {
    vi.mocked(upsertPersonalReview).mockRejectedValueOnce(new Error("review-save-failed"));
    vi.mocked(createListRecord).mockRejectedValueOnce(new Error("create-list-failed"));

    const result = await persistImportedData({
      userId: "user-1",
      processedData: {
        fileName: "letterboxd.zip",
        status: "partial",
        movies: [
          { name: "Unmatched", year: 2020, status: "watchlist" },
          { name: "The Matrix", year: 1999, tmdbId: 603, status: "watched" },
        ],
        lists: [
          {
            id: "tmp-list",
            name: "Sci-Fi",
            type: "partial_shared",
            movies: [{ name: "The Matrix", year: 1999, tmdbId: 603, status: "watched" }],
          },
        ],
        stats: {
          totalMovies: 2,
          matchedMovies: 1,
          unmatchedMovies: 1,
          totalLists: 1,
        },
      },
    });

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBeGreaterThan(0);
    expect(result.stats.unmatchedMovies).toBe(1);
    expect(result.stats.conflicts).toBe(1);
  });
});
