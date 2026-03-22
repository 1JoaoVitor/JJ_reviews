import { describe, expect, it } from "vitest";
import { buildImportDryRunProjection } from "../importDryRunService";

describe("importDryRunService", () => {
  it("builds totals and list conflict projection", () => {
    const projection = buildImportDryRunProjection(
      {
        fileName: "letterboxd.zip",
        status: "partial",
        movies: [
          { name: "The Matrix", year: 1999, tmdbId: 603, status: "watched" },
          { name: "Unknown", year: 2024, status: "watchlist" },
          { name: "Inception", year: 2010, tmdbId: 27205, status: "watchlist" },
        ],
        lists: [
          {
            id: "l1",
            name: "Sci-Fi",
            type: "private",
            movies: [
              { name: "The Matrix", year: 1999, tmdbId: 603, status: "watched" },
              { name: "The Matrix", year: 1999, tmdbId: 603, status: "watched" },
              { name: "No Match", year: 2025, status: "watchlist" },
            ],
          },
          {
            id: "l2",
            name: "Watch Later",
            type: "partial_shared",
            movies: [{ name: "Inception", year: 2010, tmdbId: 27205, status: "watchlist" }],
          },
        ],
        diaryEntries: [],
        stats: {
          totalMovies: 3,
          totalDiaryEntries: 0,
          matchedMovies: 2,
          unmatchedMovies: 1,
          unmatchedDiaryEntries: 0,
          totalLists: 2,
        },
      },
      { l2: "full_shared" }
    );

    expect(projection.moviesWithMatch).toBe(2);
    expect(projection.unmatchedMovies).toBe(1);
    expect(projection.watchedCount).toBe(1);
    expect(projection.watchlistCount).toBe(1);
    expect(projection.projectedConflicts).toBe(3);

    const sciFi = projection.lists.find((list) => list.listId === "l1");
    expect(sciFi?.duplicateMovies).toBe(1);
    expect(sciFi?.unmatchedMovies).toBe(1);
    expect(sciFi?.projectedInserts).toBe(1);

    expect(projection.byListType.private.lists).toBe(1);
    expect(projection.byListType.private.movies).toBe(1);
    expect(projection.byListType.full_shared.lists).toBe(1);
    expect(projection.byListType.full_shared.movies).toBe(1);
  });
});
