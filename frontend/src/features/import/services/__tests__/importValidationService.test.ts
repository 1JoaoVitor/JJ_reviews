import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateImportFiles, parseImportCsvContent } from "../importValidationService";
import type { ProfileData, RatingData, WatchedMovieData, ListData } from "../../types/importTypes";

// Mock the movieMatcher module
vi.mock("../../utils/movieMatcher", () => ({
  batchMatchMovies: vi.fn(async () => ({
    successful: 2,
    failed: 0,
    results: new Map(),
    cacheHits: 0,
  })),
}));

const { batchMatchMovies } = await import("../../utils/movieMatcher");

describe("importValidationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateImportFiles", () => {
    it("should validate empty file set", async () => {
      const result = await validateImportFiles({});
      expect(result.isValid).toBe(true);
      expect(result.canProceed).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("should validate profile with valid data", async () => {
      const profile: ProfileData = {
        username: "testuser",
        dateJoined: "2024-01-01T00:00:00.000Z",
      };

      const result = await validateImportFiles({ profile });
      expect(result.isValid).toBe(true);
    });

    it("should error on profile without username", async () => {
      const profile: ProfileData = {
        username: "",
        dateJoined: "2024-01-01T00:00:00.000Z",
      };

      const result = await validateImportFiles({ profile });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("username"))).toBe(true);
    });

    it("should validate ratings with valid data", async () => {
      const ratings: RatingData[] = [
        {
          date: "2024-01-01T00:00:00.000Z",
          name: "The Matrix",
          year: 1999,
          rating: 5,
        },
      ];

      const result = await validateImportFiles({ ratings });
      expect(result.canProceed).toBe(true);
    });

    it("should warn on invalid rating values", async () => {
      const ratings: RatingData[] = [
        {
          date: "2024-01-01T00:00:00.000Z",
          name: "The Matrix",
          year: 1999,
          rating: 10, // Out of range (0-5)
        },
      ];

      const result = await validateImportFiles({ ratings });
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should warn on invalid year", async () => {
      const ratings: RatingData[] = [
        {
          date: "2024-01-01T00:00:00.000Z",
          name: "The Matrix",
          year: 1500, // Out of range
          rating: 5,
        },
      ];

      const result = await validateImportFiles({ ratings });
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should validate watched movies", async () => {
      const watched: WatchedMovieData[] = [
        {
          date: "2024-01-01T00:00:00.000Z",
          name: "The Matrix",
          year: 1999,
        },
      ];

      const result = await validateImportFiles({ watched });
      expect(result.canProceed).toBe(true);
    });

    it("should warn on missing movie name in watched", async () => {
      const watched: WatchedMovieData[] = [
        {
          date: "2024-01-01T00:00:00.000Z",
          name: "",
          year: 1999,
        },
      ];

      const result = await validateImportFiles({ watched });
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should compile all issues by severity", async () => {
      const ratings: RatingData[] = [
        {
          date: "2024-01-01T00:00:00.000Z",
          name: "The Matrix",
          year: 1999,
          rating: 5,
        },
        {
          date: "2024-01-01T00:00:00.000Z",
          name: "",
          year: 1999,
          rating: 5,
        },
      ];

      const result = await validateImportFiles({ ratings });
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should warn on invalid watchlist movie fields", async () => {
      const watchlist = [
        {
          date: "2024-01-01T00:00:00.000Z",
          name: "",
          year: 1400,
        },
      ];

      const result = await validateImportFiles({ watchlist });
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.issues.some((i) => i.section === "watchlist")).toBe(true);
    });

    it("should warn on invalid list metadata and movies", async () => {
      const lists: ListData[] = [
        {
          date: "2024-01-01",
          name: "",
          movies: [
            { position: 1, name: "", year: 1999 },
            { position: 2, name: "Valid", year: 1500 },
          ],
        },
      ];

      const result = await validateImportFiles({ lists });
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.issues.some((i) => i.section === "lists")).toBe(true);
    });

    it("should add TMDB warning when batch match returns failed movies", async () => {
      vi.mocked(batchMatchMovies).mockResolvedValueOnce({
        successful: 1,
        failed: 2,
        results: new Map(),
        cacheHits: 5,
      });

      const ratings: RatingData[] = [
        {
          date: "2024-01-01T00:00:00.000Z",
          name: "The Matrix",
          year: 1999,
          rating: 5,
        },
      ];

      const result = await validateImportFiles({ ratings });
      expect(result.warnings.some((w) => w.includes("could not be matched in TMDB"))).toBe(true);
      expect(result.issues.some((i) => i.details && typeof i.details === "object")).toBe(true);
    });

    it("should add TMDB warning when batch match throws", async () => {
      vi.mocked(batchMatchMovies).mockRejectedValueOnce(new Error("network down"));

      const ratings: RatingData[] = [
        {
          date: "2024-01-01T00:00:00.000Z",
          name: "The Matrix",
          year: 1999,
          rating: 5,
        },
      ];

      const result = await validateImportFiles({ ratings });
      expect(result.warnings.some((w) => w.includes("TMDB matching failed"))).toBe(true);
    });
  });

  describe("parseImportCsvContent", () => {
    it("should parse profile CSV", async () => {
      const csv = `Username,Date Joined,Given Name
testuser,2024-01-01,John`;

      const profile = (await parseImportCsvContent(csv, "profile")) as ProfileData;
      expect(profile.username).toBe("testuser");
      expect(profile.givenName).toBe("John");
    });

    it("should parse ratings CSV", async () => {
      const csv = `Name,Year,Rating,Date
"The Matrix",1999,5,2024-01-01
"Inception",2010,4,2024-01-02`;

      const ratings = (await parseImportCsvContent(csv, "ratings")) as RatingData[];
      expect(ratings).toHaveLength(2);
      expect(ratings[0].name).toBe("The Matrix");
      expect(ratings[0].rating).toBe(5);
    });

    it("should skip invalid rating rows", async () => {
      const csv = `Name,Year,Rating,Date
"The Matrix",1999,5,2024-01-01
"InvalidMovie",,4,2024-01-02`;

      const ratings = (await parseImportCsvContent(csv, "ratings")) as RatingData[];
      expect(ratings).toHaveLength(1); // Only valid rows
      expect(ratings[0].name).toBe("The Matrix");
    });

    it("should parse reviews CSV", async () => {
      const csv = `Name,Year,Date,Rating,Review
"The Matrix",1999,2024-01-01,5,"Great movie"`;

      const reviews = (await parseImportCsvContent(csv, "reviews")) as Array<{ review?: string }>;
      expect(reviews).toHaveLength(1);
      expect(reviews[0].review).toContain("Great");
    });

    it("should parse watched CSV", async () => {
      const csv = `Name,Year,Date
"The Matrix",1999,2024-01-01`;

      const watched = (await parseImportCsvContent(csv, "watched")) as WatchedMovieData[];
      expect(watched).toHaveLength(1);
      expect(watched[0].name).toBe("The Matrix");
    });

    it("should parse watchlist CSV", async () => {
      const csv = `Name,Year,Date
"The Matrix",1999,2024-01-01`;

      const watchlist = await parseImportCsvContent(csv, "watchlist");
      expect(watchlist).toHaveLength(1);
    });

    it("should parse list CSV with movies", async () => {
      const csv = `Position,Name,Year
1,"The Matrix",1999
2,"Inception",2010`;

      const list = (await parseImportCsvContent(csv, "list")) as ListData;
      expect(list.movies).toHaveLength(2);
      expect(list.movies[0].name).toBe("The Matrix");
    });

    it("should throw error for invalid CSV content", async () => {
      const invalidCsv = "";

      await expect(parseImportCsvContent(invalidCsv, "ratings")).rejects.toThrow();
    });

    it("should throw error for unknown file type", async () => {
      const csv = "valid,csv,data";

      await expect(async () => {
        await parseImportCsvContent(csv, "unknown" as unknown as "profile" | "ratings" | "reviews" | "watched" | "watchlist" | "list");
      }).rejects.toThrow();
    });
  });

  describe("Letterboxd format compatibility", () => {
    it("should handle Letterboxd ratings export format", async () => {
      const csv = `Name,Year,Rating,Date
"The Matrix",1999,5,2024-01-01`;

      const ratings = (await parseImportCsvContent(csv, "ratings")) as RatingData[];
      expect(ratings).toHaveLength(1);
      expect(ratings[0].name).toBe("The Matrix");
      expect(ratings[0].rating).toBe(5);
    });

    it("should handle Letterboxd list export format with metadata", async () => {
      const csv = `Position,Name,Year
1,"The Matrix",1999
2,"Inception",2010`;

      const list = (await parseImportCsvContent(csv, "list")) as ListData;
      expect(list.name).toBeTruthy();
      expect(list.movies).toHaveLength(2);
      expect(list.movies[0].name).toBe("The Matrix");
      expect(list.movies[1].name).toBe("Inception");
    });

    it("should handle quoted fields in Letterboxd CSV", async () => {
      const csv = `Name,Year,Rating
"The Matrix, Reloaded",2003,4`;

      const ratings = (await parseImportCsvContent(csv, "ratings")) as RatingData[];
      expect(ratings[0].name).toBe("The Matrix, Reloaded");
    });

    it("should handle various date formats in Letterboxd CSV", async () => {
      const csv = `Name,Year,Date,Rating
"The Matrix",1999,2024-01-01,5`;

      const ratings = (await parseImportCsvContent(csv, "ratings")) as RatingData[];
      expect(ratings[0].date).toBeTruthy();
    });
  });

  describe("Data validation edge cases", () => {
    it("should handle empty CSV after headers", async () => {
      const csv = `Name,Year,Rating`;

      const ratings = (await parseImportCsvContent(csv, "ratings")) as RatingData[];
      expect(ratings).toHaveLength(0);
    });

    it("should handle whitespace-only rows", async () => {
      const csv = `Name,Year,Rating
"The Matrix",1999,5
   
"Inception",2010,4`;

      const ratings = (await parseImportCsvContent(csv, "ratings")) as RatingData[];
      expect(ratings).toHaveLength(2);
    });

    it("should preserve field trimming", async () => {
      const csv = `Name,Year,Rating
"  The Matrix  ",1999,5`;

      const ratings = (await parseImportCsvContent(csv, "ratings")) as RatingData[];
      // Field should be trimmed during parsing
      expect(ratings[0].name).toBe("The Matrix");
    });

    it("should handle movies with same title different years", async () => {
      const csv = `Name,Year,Rating
"Spider-Man",2002,4
"Spider-Man",2012,3
"Spider-Man",2024,5`;

      const ratings = (await parseImportCsvContent(csv, "ratings")) as RatingData[];
      expect(ratings).toHaveLength(3);
      expect(ratings.map((r) => r.year)).toEqual([2002, 2012, 2024]);
    });

    it("should handle missing optional fields", async () => {
      const csv = `Name,Year,Rating,Date
"The Matrix",1999,5,`;

      const ratings = (await parseImportCsvContent(csv, "ratings")) as RatingData[];
      expect(ratings).toHaveLength(1);
      expect(ratings[0].date).toBeTruthy(); // Should have default/current date
    });
  });
});
