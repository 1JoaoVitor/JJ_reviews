import { describe, it, expect, beforeEach, vi } from "vitest";
import { RatingScale } from "../../types/importTypes";
import { transformImportData } from "../importTransformationService";

vi.mock("../../utils/movieMatcher", () => ({
  batchMatchMovies: vi.fn(),
}));

const { batchMatchMovies } = await import("../../utils/movieMatcher");

const defaultSettings = {
  ratingScale: RatingScale.SCALE_1_TO_1,
  listTypeMap: {},
  skipUnmatchedMovies: false,
};

describe("importTransformationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(batchMatchMovies).mockResolvedValue({
      successful: 0,
      failed: 0,
      cacheHits: 0,
      results: new Map(),
    });
  });

  it("should merge watched, ratings and reviews into unique processed movies", async () => {
    vi.mocked(batchMatchMovies).mockResolvedValue({
      successful: 2,
      failed: 0,
      cacheHits: 0,
      results: new Map([
        ["the matrix|1999", { query: "The Matrix (1999)", matched: true, confidence: 95, tmdbId: 603 }],
        ["inception|2010", { query: "Inception (2010)", matched: true, confidence: 92, tmdbId: 27205 }],
      ]),
    });

    const result = await transformImportData({
      fileName: "letterboxd.zip",
      settings: defaultSettings,
      data: {
        watched: [{ date: "2024-01-01", name: "The Matrix", year: 1999 }],
        ratings: [{ date: "2024-01-01", name: "The Matrix", year: 1999, rating: 5 }],
        reviews: [{ date: "2024-01-01", name: "Inception", year: 2010, review: "Great", rating: 4 }],
        watchlist: [],
        lists: [],
      },
    });

    expect(result.status).toBe("success");
    expect(result.movies).toHaveLength(2);

    const matrix = result.movies.find((m) => m.name === "The Matrix");
    expect(matrix?.status).toBe("watched");
    expect(matrix?.rating).toBe(5);
    expect(matrix?.tmdbId).toBe(603);

    const inception = result.movies.find((m) => m.name === "Inception");
    expect(inception?.review).toBe("Great");
    expect(inception?.tmdbId).toBe(27205);
  });

  it("should convert rating to 0-10 scale when configured", async () => {
    vi.mocked(batchMatchMovies).mockResolvedValue({
      successful: 1,
      failed: 0,
      cacheHits: 0,
      results: new Map([
        ["the matrix|1999", { query: "The Matrix (1999)", matched: true, confidence: 95, tmdbId: 603 }],
      ]),
    });

    const result = await transformImportData({
      fileName: "ratings.csv",
      settings: {
        ...defaultSettings,
        ratingScale: RatingScale.SCALE_0_TO_10,
      },
      data: {
        ratings: [{ date: "2024-01-01", name: "The Matrix", year: 1999, rating: 4.5 }],
        watched: [],
        watchlist: [],
        reviews: [],
        lists: [],
      },
    });

    expect(result.movies[0].rating).toBe(9);
  });

  it("should keep unmatched movies and mark partial when skipUnmatchedMovies is false", async () => {
    vi.mocked(batchMatchMovies).mockResolvedValue({
      successful: 0,
      failed: 1,
      cacheHits: 0,
      results: new Map([
        ["unknown movie|2024", { query: "Unknown Movie (2024)", matched: false, confidence: 0 }],
      ]),
    });

    const result = await transformImportData({
      fileName: "watchlist.csv",
      settings: {
        ...defaultSettings,
        skipUnmatchedMovies: false,
      },
      data: {
        watchlist: [{ date: "2024-01-01", name: "Unknown Movie", year: 2024 }],
        watched: [],
        ratings: [],
        reviews: [],
        lists: [],
      },
    });

    expect(result.status).toBe("partial");
    expect(result.movies).toHaveLength(1);
    expect(result.movies[0].tmdbId).toBeUndefined();
    expect(result.movies[0].matchWarning).toBeTruthy();
  });

  it("should skip unmatched movies when skipUnmatchedMovies is true", async () => {
    vi.mocked(batchMatchMovies).mockResolvedValue({
      successful: 0,
      failed: 1,
      cacheHits: 0,
      results: new Map([
        ["unknown movie|2024", { query: "Unknown Movie (2024)", matched: false, confidence: 0 }],
      ]),
    });

    const result = await transformImportData({
      fileName: "watchlist.csv",
      settings: {
        ...defaultSettings,
        skipUnmatchedMovies: true,
      },
      data: {
        watchlist: [{ date: "2024-01-01", name: "Unknown Movie", year: 2024 }],
        watched: [],
        ratings: [],
        reviews: [],
        lists: [],
      },
    });

    expect(result.movies).toHaveLength(0);
    expect(result.status).toBe("error");
  });

  it("should transform lists with type mapping and movie matching", async () => {
    vi.mocked(batchMatchMovies).mockResolvedValue({
      successful: 2,
      failed: 0,
      cacheHits: 0,
      results: new Map([
        ["the matrix|1999", { query: "The Matrix (1999)", matched: true, confidence: 90, tmdbId: 603 }],
        ["inception|2010", { query: "Inception (2010)", matched: true, confidence: 88, tmdbId: 27205 }],
      ]),
    });

    const result = await transformImportData({
      fileName: "lists.csv",
      settings: {
        ...defaultSettings,
        listTypeMap: {
          "Sci-Fi Favorites": "full_shared",
        },
      },
      data: {
        watched: [{ date: "2024-01-01", name: "The Matrix", year: 1999 }],
        ratings: [],
        reviews: [],
        watchlist: [],
        lists: [
          {
            date: "2024-01-01",
            name: "Sci-Fi Favorites",
            movies: [
              { position: 1, name: "The Matrix", year: 1999 },
              { position: 2, name: "Inception", year: 2010 },
            ],
          },
        ],
      },
    });

    expect(result.lists).toHaveLength(1);
    expect(result.lists[0].type).toBe("full_shared");
    expect(result.lists[0].movies).toHaveLength(2);
    expect(result.lists[0].movies[0].tmdbId).toBe(603);
  });
});
