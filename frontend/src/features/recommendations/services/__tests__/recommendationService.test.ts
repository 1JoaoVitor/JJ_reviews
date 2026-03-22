import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MovieData } from "@/types";
import { getPersonalizedRecommendations, getFavoriteGenreLabels } from "../recommendationService";

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
      expect(result[0]?.reasons).toContain("Sugestao inicial baseada em filmes populares");
   });

   it("extracts favorite genre labels from user movies", () => {
      const labels = getFavoriteGenreLabels([
         movieFactory({ tmdb_id: 501, genres: ["Acao"], rating: 5 }),
         movieFactory({ tmdb_id: 502, genres: ["Comedia"], rating: 4 }),
      ]);

      expect(labels).toContain("Acao");
      expect(labels.length).toBeGreaterThan(0);
   });
});
