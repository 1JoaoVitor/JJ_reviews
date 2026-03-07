import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMovieFilters } from "@/features/movies/hooks/useMovieFilters";
import type { MovieData } from "@/types";

const mockMovies: MovieData[] = [
   {
      id: 1,
      tmdb_id: 100,
      rating: 8,
      review: "Muito bom",
      recommended: "Assista com certeza",
      created_at: "2025-01-01",
      title: "Filme A",
      status: "watched",
      genres: ["Ação", "Drama"],
      director: "Diretor A",
      isNational: false,
      isOscar: true,
      release_date: "2024-06-15",
      cast: ["Ator 1", "Ator 2"],
   },
   {
      id: 2,
      tmdb_id: 200,
      rating: 5,
      review: "Mediano",
      recommended: "Tem filmes melhores, mas é legal",
      created_at: "2025-02-01",
      title: "Filme B Nacional",
      status: "watched",
      genres: ["Comédia"],
      director: "Diretor B",
      isNational: true,
      isOscar: false,
      release_date: "2023-03-10",
      cast: ["Ator 3"],
   },
   {
      id: 3,
      tmdb_id: 300,
      rating: null,
      review: "",
      recommended: "",
      created_at: "2025-03-01",
      title: "Filme C Watchlist",
      status: "watchlist",
      genres: ["Terror"],
      director: "Diretor C",
      isNational: false,
      isOscar: false,
      release_date: "2025-01-20",
   },
   {
      id: 4,
      tmdb_id: 400,
      rating: 10,
      review: "Obra prima",
      recommended: "Assista com certeza",
      created_at: "2025-04-01",
      title: "Filme D",
      status: "watched",
      genres: ["Drama"],
      director: "Diretor A",
      isNational: false,
      isOscar: true,
      release_date: "2025-08-01",
   },
];

describe("useMovieFilters", () => {
   it("inicia com viewMode 'watched' e sem filtros", () => {
      const { result } = renderHook(() => useMovieFilters(mockMovies));

      expect(result.current.viewMode).toBe("watched");
      expect(result.current.searchTerm).toBe("");
      expect(result.current.onlyNational).toBe(false);
      expect(result.current.onlyOscar).toBe(false);
      expect(result.current.selectedGenre).toBe("");
      expect(result.current.sortOrder).toBe("default");
   });

   it("filtra por viewMode 'watched'", () => {
      const { result } = renderHook(() => useMovieFilters(mockMovies));
      // viewMode padrão é 'watched', deve ter 3 filmes assistidos (ids 1, 2, 4)
      expect(result.current.filteredMovies).toHaveLength(3);
      expect(result.current.filteredMovies.every(m => m.status === "watched")).toBe(true);
   });

   it("filtra por viewMode 'watchlist'", () => {
      const { result } = renderHook(() => useMovieFilters(mockMovies));

      act(() => {
         result.current.setViewMode("watchlist");
      });

      expect(result.current.filteredMovies).toHaveLength(1);
      expect(result.current.filteredMovies[0].title).toBe("Filme C Watchlist");
   });

   it("filtra por searchTerm no título", () => {
      const { result } = renderHook(() => useMovieFilters(mockMovies));

      act(() => {
         result.current.setSearchTerm("Filme A");
      });

      expect(result.current.filteredMovies).toHaveLength(1);
      expect(result.current.filteredMovies[0].title).toBe("Filme A");
   });

   it("filtra por searchTerm no diretor", () => {
      const { result } = renderHook(() => useMovieFilters(mockMovies));

      act(() => {
         result.current.setSearchTerm("Diretor B");
      });

      expect(result.current.filteredMovies).toHaveLength(1);
      expect(result.current.filteredMovies[0].title).toBe("Filme B Nacional");
   });

   it("filtra por searchTerm no gênero", () => {
      const { result } = renderHook(() => useMovieFilters(mockMovies));

      act(() => {
         result.current.setSearchTerm("Drama");
      });

      expect(result.current.filteredMovies).toHaveLength(2);
   });

   it("busca por 'oscar' retorna filmes do Oscar", () => {
      const { result } = renderHook(() => useMovieFilters(mockMovies));

      act(() => {
         result.current.setSearchTerm("oscar");
      });

      expect(result.current.filteredMovies).toHaveLength(2);
      expect(result.current.filteredMovies.every(m => m.isOscar)).toBe(true);
   });

   it("filtra onlyNational", () => {
      const { result } = renderHook(() => useMovieFilters(mockMovies));

      act(() => {
         result.current.setOnlyNational(true);
      });

      expect(result.current.filteredMovies).toHaveLength(1);
      expect(result.current.filteredMovies[0].isNational).toBe(true);
   });

   it("filtra onlyOscar", () => {
      const { result } = renderHook(() => useMovieFilters(mockMovies));

      act(() => {
         result.current.setOnlyOscar(true);
      });

      expect(result.current.filteredMovies).toHaveLength(2);
      expect(result.current.filteredMovies.every(m => m.isOscar)).toBe(true);
   });

   it("filtra por gênero selecionado", () => {
      const { result } = renderHook(() => useMovieFilters(mockMovies));

      act(() => {
         result.current.setSelectedGenre("Comédia");
      });

      expect(result.current.filteredMovies).toHaveLength(1);
      expect(result.current.filteredMovies[0].genres).toContain("Comédia");
   });

   it("ordena por rating (maior primeiro)", () => {
      const { result } = renderHook(() => useMovieFilters(mockMovies));

      act(() => {
         result.current.setSortOrder("rating");
      });

      expect(result.current.filteredMovies[0].rating).toBe(10);
      expect(result.current.filteredMovies[1].rating).toBe(8);
      expect(result.current.filteredMovies[2].rating).toBe(5);
   });

   it("ordena por data de lançamento (mais recente primeiro)", () => {
      const { result } = renderHook(() => useMovieFilters(mockMovies));

      act(() => {
         result.current.setSortOrder("date");
      });

      const dates = result.current.filteredMovies.map(m => m.release_date);
      expect(dates[0]).toBe("2025-08-01");
   });

   it("ordena alfabeticamente", () => {
      const { result } = renderHook(() => useMovieFilters(mockMovies));

      act(() => {
         result.current.setSortOrder("alpha");
      });

      const titles = result.current.filteredMovies.map(m => m.title);
      expect(titles).toEqual([...titles].sort());
   });

   it("lista gêneros disponíveis corretamente", () => {
      const { result } = renderHook(() => useMovieFilters(mockMovies));

      expect(result.current.availableGenres).toEqual(
         expect.arrayContaining(["Ação", "Comédia", "Drama", "Terror"])
      );
      expect(result.current.availableGenres).toHaveLength(4);
   });

   it("combina filtros: onlyOscar + searchTerm", () => {
      const { result } = renderHook(() => useMovieFilters(mockMovies));

      act(() => {
         result.current.setOnlyOscar(true);
         result.current.setSearchTerm("Filme D");
      });

      expect(result.current.filteredMovies).toHaveLength(1);
      expect(result.current.filteredMovies[0].title).toBe("Filme D");
   });

   it("retorna lista vazia quando nenhum filme corresponde ao filtro", () => {
      const { result } = renderHook(() => useMovieFilters(mockMovies));

      act(() => {
         result.current.setSearchTerm("Filme Inexistente XYZ");
      });

      expect(result.current.filteredMovies).toHaveLength(0);
   });

   it("busca por ator no cast", () => {
      const { result } = renderHook(() => useMovieFilters(mockMovies));

      act(() => {
         result.current.setSearchTerm("Ator 3");
      });

      expect(result.current.filteredMovies).toHaveLength(1);
      expect(result.current.filteredMovies[0].title).toBe("Filme B Nacional");
   });
});
