import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { MovieData } from "@/types";

/**
 * Hook que gerencia filtros e ordenação da lista de filmes.
 * Separa a lógica de UI (busca, gênero, flags) do componente.
 */
export function useMovieFilters(movies: MovieData[]) {
   const [searchTerm, setSearchTerm] = useState("");
   const [onlyNational, setOnlyNational] = useState(false);
   const [onlyOscar, setOnlyOscar] = useState(false);
   const [onlyInternational, setOnlyInternational] = useState(false);
   const [sortOrder, setSortOrder] = useState("default");
   const [selectedGenre, setSelectedGenre] = useState("");
   const [selectedDirector, setSelectedDirector] = useState("");
   const [searchParams, setSearchParams] = useSearchParams();


   //  A URL é a nossa única fonte de verdade. Lemos direto dela a cada renderização.
   const viewMode = (searchParams.get("aba") as "watched" | "watchlist" | "lists") || "watched";

   // Quando clicamos na aba, apenas atualizamos a URL. O React re-renderiza automaticamente
   const setViewMode = (newMode: "watched" | "watchlist" | "lists") => {
      setSearchParams(prev => {
         const newParams = new URLSearchParams(prev);
         if (newMode === "watched") {
            newParams.delete("aba"); // Mantém a URL limpa na home
         } else {
            newParams.set("aba", newMode);
         }
         return newParams;
      });
   };

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
            if (onlyInternational && movie.countries?.includes("Estados Unidos")) return false;
            if (selectedDirector && movie.director?.toLowerCase() !== selectedDirector.toLowerCase()) return false;
            
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
   }, [movies, viewMode, searchTerm, onlyNational, onlyOscar, onlyInternational, selectedGenre, selectedDirector, sortOrder]);

   return {
      searchTerm,
      setSearchTerm,
      onlyNational,
      setOnlyNational,
      onlyOscar,
      setOnlyOscar,
      onlyInternational,
      setOnlyInternational,
      sortOrder,
      setSortOrder,
      selectedGenre,
      setSelectedGenre,
      selectedDirector,
      setSelectedDirector,
      viewMode,
      setViewMode,
      availableGenres,
      filteredMovies,
   };
}