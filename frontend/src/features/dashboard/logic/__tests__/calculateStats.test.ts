import { describe, it, expect } from "vitest";
import { calculateDashboardStats } from "../calculateStats";
import type { MovieData } from "@/types";

const makeMovie = (overrides: Partial<MovieData> = {}): MovieData => ({
   id: 1,
   tmdb_id: 100,
   rating: null,
   review: "",
   recommended: "",
   created_at: "2025-01-01",
   status: "watched",
   runtime: 0,
   ...overrides,
} as MovieData);

describe("calculateDashboardStats (Functional Core)", () => {
   
   it("deve calcular a média correta apenas dos filmes assistidos com nota", () => {
      const movies = [
         makeMovie({ rating: 8, status: "watched" }),
         makeMovie({ rating: 6, status: "watched" }),
         makeMovie({ rating: null, status: "watchlist" }), // Deve ser ignorado (não assistido)
         makeMovie({ rating: null, status: "watched" }), // Deve ser ignorado (sem nota)
      ];

      const stats = calculateDashboardStats(movies);
      
      expect(stats.totalMovies).toBe(3); // 3 assistidos (mesmo o que não tem nota conta como filme visto)
      expect(stats.averageRating).toBe(7); 
   });

   it("deve somar o runtime corretamente", () => {
      const movies = [
         makeMovie({ runtime: 120, status: "watched" }),
         makeMovie({ runtime: 90, status: "watched" }),
         makeMovie({ runtime: 150, status: "watchlist" }), // Ignorado
      ];

      const stats = calculateDashboardStats(movies);
      
      expect(stats.totalRuntimeMinutes).toBe(210); 
   });

   it("deve calcular a percentagem de filmes internacionais (que não contêm EUA)", () => {
      const movies = [
         makeMovie({ countries: ["Estados Unidos", "Brasil"], status: "watched" }), 
         makeMovie({ countries: ["França"], status: "watched" }),
         makeMovie({ countries: ["Japão"], status: "watched" }),
         makeMovie({ countries: ["França"], status: "watchlist" }), 
      ];

      const stats = calculateDashboardStats(movies);
      
      expect(stats.internationalCount).toBe(2);
      expect(stats.internationalPercent).toBe(67);
   });

   it("deve encontrar o diretor mais frequente (se tiver 2 ou mais filmes)", () => {
      const movies = [
         makeMovie({ director: "Christopher Nolan", status: "watched" }),
         makeMovie({ director: "Christopher Nolan", status: "watched" }),
         makeMovie({ director: "Quentin Tarantino", status: "watched" }),
         makeMovie({ director: "Martin Scorsese", status: "watchlist" }),
      ];

      const stats = calculateDashboardStats(movies);
      
      expect(stats.topDirector).toEqual({ name: "Christopher Nolan", count: 2 });
   });

   it("deve retornar null para o diretor se todos tiverem apenas 1 filme", () => {
      const movies = [
         makeMovie({ director: "Nolan", status: "watched" }),
         makeMovie({ director: "Tarantino", status: "watched" }),
      ];

      const stats = calculateDashboardStats(movies);
      
      expect(stats.topDirector).toBeNull();
   });

});