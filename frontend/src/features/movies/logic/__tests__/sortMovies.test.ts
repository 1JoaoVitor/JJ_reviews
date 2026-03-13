import { describe, it, expect } from "vitest";
import { sortMovies } from "../sortMovies";
import type { MovieData } from "@/types";

// Factory para criar filmes falsos
// Usa "as MovieData" para não precisar preencher todos os campos obrigatórios do tipo
const makeMovie = (overrides: Partial<MovieData> = {}): MovieData => ({
   id: 1,
   tmdb_id: 100,
   title: "Filme Padrão",
   status: "watched",
   ...overrides,
} as MovieData);

describe("sortMovies (Functional Core)", () => {
   
   it("deve ordenar os filmes por nota (rating) de forma decrescente", () => {
      // Preparação
      const movies = [
         makeMovie({ id: 1, rating: 5 }),
         makeMovie({ id: 2, rating: 9 }),
         makeMovie({ id: 3, rating: 7 }),
      ];

      // Ação 
      const result = sortMovies(movies, "rating");

      // Verificação
      expect(result.map(m => m.rating)).toEqual([9, 7, 5]);
   });

   it("deve ordenar os filmes alfabeticamente (alpha)", () => {
      const movies = [
         makeMovie({ title: "Zombieland" }),
         makeMovie({ title: "Avatar" }),
         makeMovie({ title: "Matrix" })
      ];
      
      const result = sortMovies(movies, "alpha");
      
      expect(result.map(m => m.title)).toEqual(["Avatar", "Matrix", "Zombieland"]);
   });

   it("deve retornar o array intacto se a ordem for 'default' (id decrescente)", () => {
      const movies = [
         makeMovie({ id: 10 }),
         makeMovie({ id: 20 }),
         makeMovie({ id: 5 })
      ];
      
      const result = sortMovies(movies, "default");
      
      expect(result.map(m => m.id)).toEqual([20, 10, 5]);
   });

});