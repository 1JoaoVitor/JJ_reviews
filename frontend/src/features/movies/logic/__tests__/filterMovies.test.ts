import { describe, it, expect } from "vitest";
import { filterMovies, type MovieFilters } from "../filterMovies";
import type { MovieData } from "@/types";

// Factory de filmes
const makeMovie = (overrides: Partial<MovieData> = {}): MovieData => ({
   id: 1,
   tmdb_id: 100,
   title: "Filme Padrão",
   status: "watched",
   isNational: false,
   isOscar: false,
   countries: ["Estados Unidos"],
   genres: ["Ação"],
   director: "Diretor Padrão",
   cast: ["Ator 1"],
   ...overrides,
} as MovieData);

// Filtros padrão para facilitar a escrita dos testes, evitando repetir os mesmos valores
const defaultFilters: MovieFilters = {
   viewMode: "watched",
   searchTerm: "",
   onlyNational: false,
   onlyOscar: false,
   onlyInternational: false,
   selectedGenre: "",
   selectedDirector: "",
};

describe("filterMovies (Functional Core)", () => {
   
   it("deve filtrar corretamente pela aba (viewMode)", () => {
      const movies = [
         makeMovie({ id: 1, status: "watched" }),
         makeMovie({ id: 2, status: "watchlist" }),
      ];

      const result = filterMovies(movies, { ...defaultFilters, viewMode: "watchlist" });
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
   });

   it("deve retornar todos os filmes se viewMode for 'lists' (ignora status)", () => {
      const movies = [
         makeMovie({ id: 1, status: "watched" }),
         makeMovie({ id: 2, status: "watchlist" }),
      ];

      const result = filterMovies(movies, { ...defaultFilters, viewMode: "lists" });
      
      expect(result).toHaveLength(2);
   });

   it("deve filtrar corretamente por busca de texto (título case-insensitive)", () => {
      const movies = [
         makeMovie({ id: 1, title: "O Auto da Compadecida" }),
         makeMovie({ id: 2, title: "Cidade de Deus" }),
      ];

      const result = filterMovies(movies, { ...defaultFilters, searchTerm: "compadecida" });
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
   });

   it("deve combinar filtros: Nacional + Oscar", () => {
      const movies = [
         makeMovie({ id: 1, isNational: true, isOscar: true }),
         makeMovie({ id: 2, isNational: true, isOscar: false }),
         makeMovie({ id: 3, isNational: false, isOscar: true }),
      ];

      const result = filterMovies(movies, { 
         ...defaultFilters, 
         onlyNational: true, 
         onlyOscar: true 
      });
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
   });

   it("deve filtrar filmes Internacionais (que não contêm 'Estados Unidos')", () => {
      const movies = [
         makeMovie({ id: 1, countries: ["Brasil", "França"] }), 
         makeMovie({ id: 2, countries: ["Estados Unidos", "Reino Unido"] }), 
         makeMovie({ id: 3, countries: ["Japão"] }),
      ];

      const result = filterMovies(movies, { ...defaultFilters, onlyInternational: true });
      
      expect(result).toHaveLength(2);
      expect(result.map(m => m.id)).toEqual([1, 3]);
   });

});

describe("Tratamento de Falhas", () => {
   it("não deve quebrar se os filmes não tiverem gêneros ou diretores cadastrados", () => {
      const moviesWithoutData: MovieData[] = [
         // @ts-expect-error: Testando resiliência com arrays ausentes
         { id: 1, title: "Filme Estranho", status: "watched", genres: undefined, director: undefined },
      ];

      const filters = {
         viewMode: "watched" as const,
         searchTerm: "",
         selectedGenre: "Ação", 
         selectedDirector: "Nolan", 
         onlyNational: false,
         onlyOscar: false,
         onlyInternational: false,
      };

      // A função deve simplesmente ocultar o filme, mas NUNCA lançar um erro (ex: undefined is not iterable)
      const result = filterMovies(moviesWithoutData, filters);
      expect(result).toHaveLength(0); 
   });

   it("deve ser case-insensitive e ignorar espaços extras na busca", () => {
      const movies: MovieData[] = [
         { id: 1, title: "Batman", status: "watched" } as MovieData,
      ];

      const result = filterMovies(movies, { ...defaultFilters, searchTerm: "   bAtMaN   " });
      expect(result).toHaveLength(1);
   });
});