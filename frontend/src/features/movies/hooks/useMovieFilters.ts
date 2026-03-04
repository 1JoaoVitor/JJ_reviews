import { useState, useMemo } from "react";
import type { MovieData } from "@/types";

/**
 * Hook que gerencia filtros e ordenação da lista de filmes.
 * Separa a lógica de UI (busca, gênero, flags) do componente.
 */
export function useMovieFilters(movies: MovieData[]) {
   const [searchTerm, setSearchTerm] = useState("");
   const [onlyNational, setOnlyNational] = useState(false);
   const [onlyOscar, setOnlyOscar] = useState(false);
   const [sortOrder, setSortOrder] = useState("default");
   const [selectedGenre, setSelectedGenre] = useState("");
   const [viewMode, setViewMode] = useState<"watched" | "watchlist">("watched");

   const availableGenres = useMemo(
      () => Array.from(new Set(movies.flatMap((m) => m.genres || []))).sort(),
      [movies],
   );

   const filteredMovies = useMemo(() => {
      return movies
         .filter((movie) => {
            const movieStatus = movie.status || "watched";
            if (movieStatus !== viewMode) return false;

            const searchLower = searchTerm.toLowerCase();

            const matchesSearch =
               !searchTerm ||
               movie.title?.toLowerCase().includes(searchLower) ||
               movie.review?.toLowerCase().includes(searchLower) ||
               movie.recommended?.toLowerCase().includes(searchLower) ||
               movie.director?.toLowerCase().includes(searchLower) ||
               movie.genres?.some((g) =>
                  g.toLowerCase().includes(searchLower),
               ) ||
               movie.cast?.some((actor) =>
                  actor.toLowerCase().includes(searchLower),
               ) ||
               (movie.isOscar && "oscar".includes(searchLower));

            if (onlyNational && !movie.isNational) return false;
            if (onlyOscar && !movie.isOscar) return false;
            if (selectedGenre && !movie.genres?.includes(selectedGenre))
               return false;

            return matchesSearch;
         })
         .sort((a, b) => {
            if (sortOrder === "default") return b.id - a.id;
            if (sortOrder === "rating") {
               return (b.rating ?? 0) - (a.rating ?? 0);
            }
            if (sortOrder === "date") {
               const dateA = new Date(
                  a.release_date || "1900-01-01",
               ).getTime();
               const dateB = new Date(
                  b.release_date || "1900-01-01",
               ).getTime();
               return dateB - dateA;
            }
            if (sortOrder === "alpha")
               return (a.title || "").localeCompare(b.title || "");
            return 0;
         });
   }, [movies, viewMode, searchTerm, onlyNational, onlyOscar, selectedGenre, sortOrder]);

   return {
      searchTerm,
      setSearchTerm,
      onlyNational,
      setOnlyNational,
      onlyOscar,
      setOnlyOscar,
      sortOrder,
      setSortOrder,
      selectedGenre,
      setSelectedGenre,
      viewMode,
      setViewMode,
      availableGenres,
      filteredMovies,
   };
}
