import { describe, it, expect, beforeEach, vi } from "vitest";
import type { MockedFunction } from "vitest";
import {
  searchMovieInTmdb,
  batchMatchMovies,
  clearMatchCache,
  getCacheStats,
  isMatchGoodEnough,
  formatMatchResult,
} from "../movieMatcher";
import type { TmdbMatchResult } from "../../types/importTypes";

// Mock fetch for TMDB API
const mockFetch: MockedFunction<typeof fetch> = vi.fn();
(global as { fetch: unknown }).fetch = mockFetch;

describe("movieMatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMatchCache();
  });

  describe("searchMovieInTmdb", () => {
    it("should return cached result on second call", async () => {
      const mockResponse = {
        results: [
          {
            id: 603,
            title: "The Matrix",
            release_date: "1999-03-31",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result1 = await searchMovieInTmdb("The Matrix", 1999);
      expect(result1.matched).toBe(true);
      expect(result1.tmdbId).toBe(603);

      // Second call should use cache
      const result2 = await searchMovieInTmdb("The Matrix", 1999);
      expect(result1.tmdbId).toBe(result2.tmdbId);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only called once due to cache
    });

    it("should handle exact title match with correct year", async () => {
      const mockResponse = {
        results: [
          {
            id: 603,
            title: "The Matrix",
            release_date: "1999-03-31",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await searchMovieInTmdb("The Matrix", 1999);
      expect(result.matched).toBe(true);
      expect(result.confidence).toBe(100); // 100% title + 100% year
      expect(result.title).toBe("The Matrix");
      expect(result.year).toBe(1999);
    });

    it("should handle similar title match with correct year", async () => {
      const mockResponse = {
        results: [
          {
            id: 603,
            title: "The Matrix (1999)",
            release_date: "1999-03-31",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await searchMovieInTmdb("The Matrix", 1999);
      expect(result.matched).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it("should handle year mismatch with low confidence", async () => {
      const mockResponse = {
        results: [
          {
            id: 603,
            title: "The Matrix",
            release_date: "1999-03-31",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await searchMovieInTmdb("The Matrix", 2000);
      expect(result.matched).toBe(true);
      expect(result.confidence).toBeLessThan(100);
    });

    it("should return unmatched result for no results", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      } as Response);

      const result = await searchMovieInTmdb("NonexistentMovie", 2099);
      expect(result.matched).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const result = await searchMovieInTmdb("The Matrix", 1999);
      expect(result.matched).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it("should handle missing API key", async () => {
      // Temporarily unset the env var
      const originalEnv = import.meta.env.VITE_TMDB_API_KEY;
      Object.defineProperty(import.meta.env, "VITE_TMDB_API_KEY", {
        value: undefined,
        configurable: true,
      });

      const result = await searchMovieInTmdb("The Matrix", 1999);
      expect(result.matched).toBe(false);
      expect(result.confidence).toBe(0);

      // Restore
      Object.defineProperty(import.meta.env, "VITE_TMDB_API_KEY", {
        value: originalEnv,
        configurable: true,
      });
    });

    it("should include format in query string", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      } as Response);

      await searchMovieInTmdb("The Matrix", 1999);

      const callUrl = (mockFetch.mock.calls[0]?.[0] as string) || "";
      expect(callUrl).toContain("query=The+Matrix");
    });
  });

  describe("batchMatchMovies", () => {
    it("should process empty batch", async () => {
      const result = await batchMatchMovies({ movies: [], batchSize: 50 });

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.cacheHits).toBe(0);
      expect(result.results.size).toBe(0);
    });

    it("should match multiple movies in batch", async () => {
      const mockResponse = {
        results: [
          {
            id: 603,
            title: "The Matrix",
            release_date: "1999-03-31",
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const batchResult = await batchMatchMovies({
        movies: [
          { title: "The Matrix", year: 1999 },
          { title: "Inception", year: 2010 },
        ],
        batchSize: 50,
      });

      expect(batchResult.results.size).toBeGreaterThan(0);
    });

    it("should use cache for duplicate movies", async () => {
      const mockResponse = {
        results: [
          {
            id: 603,
            title: "The Matrix",
            release_date: "1999-03-31",
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // First batch
      await batchMatchMovies({
        movies: [{ title: "The Matrix", year: 1999 }],
        batchSize: 50,
      });

      // Second batch with same movie
      const result = await batchMatchMovies({
        movies: [{ title: "The Matrix", year: 1999 }],
        batchSize: 50,
      });

      expect(result.cacheHits).toBeGreaterThan(0);
    });

    it("should split large batch into multiple requests", async () => {
      const mockResponse = {
        results: [
          {
            id: 603,
            title: "Movie",
            release_date: "1999-03-31",
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const movies = Array.from({ length: 100 }, (_, i) => ({
        title: `Movie ${i}`,
        year: 1999 + i,
      }));

      await batchMatchMovies({
        movies,
        batchSize: 50,
      });

      // Should make at least 2 calls for 100 movies with batch size 50
      expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("getCacheStats", () => {
    it("should return cache statistics", async () => {
      const mockResponse = {
        results: [
          {
            id: 603,
            title: "The Matrix",
            release_date: "1999-03-31",
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await searchMovieInTmdb("The Matrix", 1999);

      const stats = getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.entries).toHaveLength(stats.size);
    });
  });

  describe("clearMatchCache", () => {
    it("should clear cache", async () => {
      const mockResponse = {
        results: [
          {
            id: 603,
            title: "The Matrix",
            release_date: "1999-03-31",
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await searchMovieInTmdb("The Matrix", 1999);
      let stats = getCacheStats();
      expect(stats.size).toBeGreaterThan(0);

      clearMatchCache();
      stats = getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe("isMatchGoodEnough", () => {
    it("should return true for high confidence match", () => {
      const result: TmdbMatchResult = {
        query: "The Matrix",
        matched: true,
        confidence: 95,
        tmdbId: 603,
      };

      expect(isMatchGoodEnough(result)).toBe(true);
    });

    it("should return false for unmatched", () => {
      const result: TmdbMatchResult = {
        query: "The Matrix",
        matched: false,
        confidence: 0,
      };

      expect(isMatchGoodEnough(result)).toBe(false);
    });

    it("should return false for low confidence", () => {
      const result: TmdbMatchResult = {
        query: "The Matrix",
        matched: true,
        confidence: 50,
        tmdbId: 1,
      };

      expect(isMatchGoodEnough(result, 70)).toBe(false);
    });

    it("should respect custom threshold", () => {
      const result: TmdbMatchResult = {
        query: "The Matrix",
        matched: true,
        confidence: 75,
        tmdbId: 603,
      };

      expect(isMatchGoodEnough(result, 80)).toBe(false);
      expect(isMatchGoodEnough(result, 70)).toBe(true);
    });
  });

  describe("formatMatchResult", () => {
    it("should format matched result", () => {
      const result: TmdbMatchResult = {
        query: "The Matrix",
        matched: true,
        title: "The Matrix",
        year: 1999,
        confidence: 100,
        tmdbId: 603,
      };

      const formatted = formatMatchResult(result);
      expect(formatted).toContain("✓");
      expect(formatted).toContain("The Matrix");
      expect(formatted).toContain("1999");
      expect(formatted).toContain("100%");
    });

    it("should format unmatched result", () => {
      const result: TmdbMatchResult = {
        query: "NonexistentMovie",
        matched: false,
        confidence: 0,
      };

      const formatted = formatMatchResult(result);
      expect(formatted).toContain("✗");
      expect(formatted).toContain("NonexistentMovie");
    });
  });
});
