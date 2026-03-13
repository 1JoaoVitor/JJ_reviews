import type { MovieData } from "@/types";

export interface MovieFilters {
   viewMode: "watched" | "watchlist" | "lists";
   searchTerm: string;
   onlyNational: boolean;
   onlyOscar: boolean;
   onlyInternational: boolean;
   selectedGenre: string;
   selectedDirector: string;
}

export function filterMovies(movies: MovieData[], filters: MovieFilters): MovieData[] {
   return movies.filter((movie) => {
      // Filtro base de Aba (Assistidos vs Watchlist)
      const movieStatus = movie.status || "watched";
      if (filters.viewMode !== "lists" && movieStatus !== filters.viewMode) return false;

      // Filtros de Categoria
      if (filters.onlyNational && !movie.isNational) return false;
      if (filters.onlyOscar && !movie.isOscar) return false;
      if (filters.onlyInternational && movie.countries?.includes("Estados Unidos")) return false;
      if (filters.selectedDirector && movie.director?.toLowerCase() !== filters.selectedDirector.toLowerCase()) return false;
      if (filters.selectedGenre && !movie.genres?.includes(filters.selectedGenre)) return false;

      // Busca Full-text
      if (!filters.searchTerm) return true;
      
      const searchLower = filters.searchTerm.toLowerCase();
      return (
         movie.title?.toLowerCase().includes(searchLower) ||
         movie.review?.toLowerCase().includes(searchLower) ||
         movie.director?.toLowerCase().includes(searchLower) ||
         movie.genres?.some(g => g.toLowerCase().includes(searchLower)) ||
         movie.cast?.some(actor => actor.toLowerCase().includes(searchLower)) ||
         (movie.isOscar && "oscar".includes(searchLower))
      );
   });
}