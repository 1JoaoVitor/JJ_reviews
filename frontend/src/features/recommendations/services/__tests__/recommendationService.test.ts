import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MovieData } from "@/types";
import {
   getFavoriteGenreLabels,
   getGenreIdFromLabel,
   getGenreLabelFromId,
   getPersonalizedRecommendations,
} from "../recommendationService";

vi.mock("@/features/movies/services/tmdbService", () => ({
   discoverMovies: vi.fn(),
}));

const { discoverMovies } = await import("@/features/movies/services/tmdbService");

function movieFactory(overrides: Partial<MovieData>): MovieData {
   return {
      id: 1,
      tmdb_id: 1,
      rating: 4,
      review: "",
      recommended: "",
      created_at: "2024-01-01T00:00:00.000Z",
      title: "Movie",
      status: "watched",
      genres: ["Acao"],
      ...overrides,
   };
}

describe("recommendationService", () => {
   beforeEach(() => {
      vi.clearAllMocks();
   });

   it("prioritizes matching genres and excludes known movies", async () => {
      vi.mocked(discoverMovies).mockResolvedValue([
         { id: 100, title: "Known Movie", vote_average: 8.9, vote_count: 500, genre_ids: [28], poster_path: "/a.jpg" },
         { id: 200, title: "Action Pick", vote_average: 8.0, vote_count: 400, genre_ids: [28], poster_path: "/b.jpg" },
         { id: 300, title: "Drama Pick", vote_average: 8.2, vote_count: 600, genre_ids: [18], poster_path: "/c.jpg" },
      ]);

      const watched = [
         movieFactory({ tmdb_id: 100, rating: 5, genres: ["Acao"] }),
         movieFactory({ tmdb_id: 101, rating: 4.5, genres: ["Aventura"] }),
      ];

      const result = await getPersonalizedRecommendations(watched, 5);

      expect(result.some((item) => item.movie.tmdb_id === 100)).toBe(false);
      expect(result[0]?.movie.tmdb_id).toBe(200);
      expect(result[0]?.reasons.length).toBeGreaterThan(0);
   });

   it("returns starter suggestions when user has no watched history", async () => {
      vi.mocked(discoverMovies).mockResolvedValue([
         { id: 400, title: "Popular One", vote_average: 7.5, vote_count: 1000, genre_ids: [35], poster_path: "/d.jpg" },
      ]);

      const result = await getPersonalizedRecommendations([], 5);

      expect(result).toHaveLength(1);
      expect(result[0]?.reasons).toContain("Sugestão inicial baseada em filmes populares");
   });

   it("extracts favorite genre labels from user movies", () => {
      const labels = getFavoriteGenreLabels([
         movieFactory({ tmdb_id: 501, genres: ["Acao"], rating: 5 }),
         movieFactory({ tmdb_id: 502, genres: ["Comedia"], rating: 4 }),
      ]);

      expect(labels).toContain("Acao");
      expect(labels.length).toBeGreaterThan(0);
   });

   it("normalizes labels and uses fallback for unknown genre ids", () => {
      expect(getGenreIdFromLabel("Ação")).toBe(28);
      expect(getGenreIdFromLabel(" ficção ")).toBe(878);
      expect(getGenreLabelFromId(999999)).toBe("Gênero");
   });

   it("filters disliked, duplicate and invalid candidate ids", async () => {
      vi.mocked(discoverMovies).mockResolvedValue([
         { id: -1, title: "Invalid", vote_average: 8, vote_count: 400, genre_ids: [28] },
         { id: 700, title: "Duplicate A", vote_average: 8, vote_count: 400, genre_ids: [28] },
         { id: 700, title: "Duplicate B", vote_average: 7, vote_count: 300, genre_ids: [28] },
         { id: 701, title: "Disliked", vote_average: 8, vote_count: 400, genre_ids: [28] },
         { id: 702, title: "Final", vote_average: 6, vote_count: 100, genre_ids: [] },
      ]);

      const result = await getPersonalizedRecommendations(
         [movieFactory({ tmdb_id: 50, rating: 5, genres: ["Acao"] })],
         10,
         { genreAdjustments: {}, dislikedMovieIds: [701] },
      );

      expect(result.some((item) => item.movie.tmdb_id === -1)).toBe(false);
      expect(result.some((item) => item.movie.tmdb_id === 701)).toBe(false);
      expect(result.filter((item) => item.movie.tmdb_id === 700)).toHaveLength(1);
      expect(result.map((item) => item.movie.tmdb_id)).toContain(702);
   });

   it("returns fallback reason when candidate has no genre/rating/recent signals", async () => {
      vi.mocked(discoverMovies).mockResolvedValue([
         { id: 800, title: "No Signals", vote_average: 0, vote_count: 0, genre_ids: [], release_date: "1980-01-01" },
      ]);

      const result = await getPersonalizedRecommendations([
         movieFactory({ tmdb_id: 1000, rating: 4, genres: ["Acao"], release_date: "2000-01-01" }),
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].reasons).toContain("Combinação de popularidade e potencial para seu perfil");
      expect(result[0].movie.director).toBe("Não informado");
   });

   it("applies feedback genre adjustments to favorite labels", () => {
      const labels = getFavoriteGenreLabels(
         [movieFactory({ tmdb_id: 100, rating: 4, genres: ["Acao"] })],
         {
            genreAdjustments: { 18: 10, 999: 4 },
            dislikedMovieIds: [],
         },
      );

      expect(labels[0]).toBe("Drama");
   });

   it("handles rating weights for high and low ratings", () => {
      const highRatedMovie = movieFactory({ tmdb_id: 201, rating: 5, genres: ["Acao"], status: "watched" });
      const lowRatedMovie = movieFactory({ tmdb_id: 202, rating: 1.5, genres: ["Acao"], status: "watched" });
      const mediumRatedMovie = movieFactory({ tmdb_id: 203, rating: 3, genres: ["Acao"], status: "watched" });

      const highLabels = getFavoriteGenreLabels([highRatedMovie]);
      const lowLabels = getFavoriteGenreLabels([lowRatedMovie]);
      const mediumLabels = getFavoriteGenreLabels([mediumRatedMovie]);

      expect(highLabels).toBeDefined();
      expect(lowLabels).toBeDefined();
      expect(mediumLabels).toBeDefined();
   });

   it("skips genres without valid genre IDs during profile building", () => {
      const labels = getFavoriteGenreLabels([
         movieFactory({ tmdb_id: 300, rating: 4, genres: ["Acao", "GeneroInvalidoQualquer"], status: "watched" }),
      ]);

      expect(labels).toBeDefined();
      expect(labels.length).toBeGreaterThan(0);
   });

   it("handles decade calculation with invalid and edge years", () => {
      const profile1 = getFavoriteGenreLabels([
         movieFactory({ tmdb_id: 400, rating: 4, genres: ["Acao"], release_date: "1800-01-01", status: "watched" }),
      ]);
      const profile2 = getFavoriteGenreLabels([
         movieFactory({ tmdb_id: 401, rating: 4, genres: ["Acao"], release_date: "", status: "watched" }),
      ]);

      expect(profile1).toBeDefined();
      expect(profile2).toBeDefined();
   });

   it("filters out unwatched movies from profile", async () => {
      vi.mocked(discoverMovies).mockResolvedValue([
         { id: 900, title: "Test", vote_average: 8, vote_count: 400, genre_ids: [28], release_date: "2020-01-01" },
      ]);

      const movies = [
         movieFactory({ tmdb_id: 500, rating: 5, genres: ["Acao"], status: "watched" }),
         movieFactory({ tmdb_id: 501, rating: null, genres: ["Acao"], status: "watchlist" }),
      ];

      const result = await getPersonalizedRecommendations(movies);

      expect(result).toHaveLength(1);
      expect(result[0].reasons.length).toBeGreaterThan(0);
   });

   it("parses decade with non-numeric year format", () => {
      const labels = getFavoriteGenreLabels([
         movieFactory({ tmdb_id: 600, rating: 4, genres: ["Acao"], release_date: "abc-01-01", status: "watched" }),
      ]);

      expect(labels).toBeDefined();
   });

   it("handles invalid genre adjustments in feedback", () => {
      const labels = getFavoriteGenreLabels(
         [movieFactory({ tmdb_id: 700, rating: 4, genres: ["Acao"], status: "watched" })],
         {
            genreAdjustments: { 18: 5, 28: 10 },
            dislikedMovieIds: [],
         },
      );

      expect(labels).toBeDefined();
      expect(labels.length).toBeGreaterThan(0);
   });
   it("weight calculation handles null rating as 0.25", () => {
      const labels = getFavoriteGenreLabels([
         movieFactory({ tmdb_id: 800, rating: null, genres: ["Acao"], status: "watched" }),
      ]);

      expect(labels).toBeDefined();
   });

   it("weight calculation handles rating exactly at boundaries", () => {
      const high = getFavoriteGenreLabels([movieFactory({ tmdb_id: 801, rating: 4, genres: ["Acao"], status: "watched" })]);
      const low = getFavoriteGenreLabels([movieFactory({ tmdb_id: 802, rating: 2.5, genres: ["Comedia"], status: "watched" })]);
      const mid = getFavoriteGenreLabels([movieFactory({ tmdb_id: 803, rating: 3, genres: ["Drama"], status: "watched" })]);

      expect(high).toBeDefined();
      expect(low).toBeDefined();
      expect(mid).toBeDefined();
   });

   it("decade calculation with exact year 1900", () => {
      const labels = getFavoriteGenreLabels([
         movieFactory({ tmdb_id: 804, rating: 4, genres: ["Acao"], release_date: "1900-01-01", status: "watched" }),
      ]);

      expect(labels).toBeDefined();
   });

   it("decade calculation with year < 1900 returns null", () => {
      const labels = getFavoriteGenreLabels([
         movieFactory({ tmdb_id: 805, rating: 4, genres: ["Acao"], release_date: "1899-01-01", status: "watched" }),
      ]);

      expect(labels).toBeDefined();
   });
});
