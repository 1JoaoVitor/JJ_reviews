import type { MovieData } from "@/types";
import { MovieCard } from "../MovieCard/MovieCard";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import styles from "./MoviesView.module.css";

interface MoviesViewProps {
   filteredMovies: MovieData[];
   searchTerm: string;
   filters: {
      selectedDirector: string;
      setSelectedDirector: (d: string) => void;
      onlyInternational: boolean;
      setOnlyInternational: (v: boolean) => void;
      onlyNational: boolean;
      setOnlyNational: (v: boolean) => void;
      onlyOscar: boolean;
      setOnlyOscar: (v: boolean) => void;
      selectedGenre: string;
      setSelectedGenre: (g: string) => void;
   };
   onAddMovieClick: () => void;
   onMovieClick: (movie: MovieData) => void;
}

export function MoviesView({ 
   filteredMovies, 
   searchTerm, 
   filters, 
   onAddMovieClick, 
   onMovieClick 
}: MoviesViewProps) {
   
   if (filteredMovies.length === 0) {
      return (
         <EmptyState 
            title="Nenhum filme por aqui"
            message={
               searchTerm 
                  ? `Não encontramos nenhum resultado para "${searchTerm}".` 
                  : "Você ainda não adicionou nenhum filme à sua lista. Que tal começar a sua jornada cinematográfica agora?"
            }
            actionText="Adicionar Filme"
            onAction={onAddMovieClick}
         />
      );
   }

   const hasActiveFilters = 
      filters.selectedDirector || 
      filters.onlyInternational || 
      filters.onlyNational || 
      filters.onlyOscar || 
      filters.selectedGenre;

   return (
      <>
         {hasActiveFilters && (
            <div className={styles.activeFilters}>
               {filters.selectedDirector && (
                  <button className={styles.filterBadge} onClick={() => filters.setSelectedDirector("")}>
                     Diretor: {filters.selectedDirector} ✕
                  </button>
               )}
               {filters.onlyInternational && (
                  <button className={styles.filterBadge} onClick={() => filters.setOnlyInternational(false)}>
                     Fora dos EUA ✕
                  </button>
               )}
               {filters.onlyNational && (
                  <button className={styles.filterBadge} onClick={() => filters.setOnlyNational(false)}>
                     Cinema Nacional ✕
                  </button>
               )}
               {filters.onlyOscar && (
                  <button className={styles.filterBadge} onClick={() => filters.setOnlyOscar(false)}>
                     Vencedores do Oscar ✕
                  </button>
               )}
               {filters.selectedGenre && (
                  <button className={styles.filterBadge} onClick={() => filters.setSelectedGenre("")}>
                     Gênero: {filters.selectedGenre} ✕
                  </button>
               )}
            </div>
         )}

         <div className="movie-grid">
            {filteredMovies.map((movie) => (
               <MovieCard 
                  key={movie.id} 
                  movie={movie} 
                  onClick={onMovieClick} 
               />
            ))}
         </div>
      </>
   );
}