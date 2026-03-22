import type { MovieData } from "@/types";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { MovieCard } from "@/features/movies";
import { useRecommendations } from "@/features/recommendations/hooks/useRecommendations";
import styles from "./RecommendationsPage.module.css";

interface RecommendationsPageProps {
   userId: string | null | undefined;
   movies: MovieData[];
   onOpenMovie: (movie: MovieData) => void;
}

export function RecommendationsPage({ userId, movies, onOpenMovie }: RecommendationsPageProps) {
   const { recommendations, favoriteGenres, loading, error } = useRecommendations(userId, movies);

   if (!userId) {
      return (
         <EmptyState
            title="Entre para ver recomendacoes"
            message="As recomendacoes personalizadas aparecem quando voce estiver logado."
         />
      );
   }

   return (
      <section className={styles.wrapper}>
         <header className={styles.header}>
            <h1 className={styles.title}>Recomendacoes para voce</h1>
            <p className={styles.subtitle}>
               Sugestoes geradas com base nos filmes que voce ja avaliou e assistiu.
            </p>
            {favoriteGenres.length > 0 && (
               <div className={styles.genreRow}>
                  {favoriteGenres.map((genre) => (
                     <span key={genre} className={styles.genreChip}>
                        {genre}
                     </span>
                  ))}
               </div>
            )}
         </header>

         {loading && (
            <div className={styles.loadingState}>
               <div className="spinner-border" role="status" aria-label="Carregando recomendacoes" />
               <span>Calculando suas proximas escolhas...</span>
            </div>
         )}

         {error && !loading && <div className={styles.errorState}>{error}</div>}

         {!loading && !error && recommendations.length === 0 && (
            <EmptyState
               title="Ainda sem recomendacoes"
               message="Adicione e avalie alguns filmes para melhorar as sugestoes automaticas."
            />
         )}

         {!loading && !error && recommendations.length > 0 && (
            <div className="movie-grid">
               {recommendations.map((recommendation) => (
                  <article key={recommendation.movie.tmdb_id} className={styles.cardWrap}>
                     <MovieCard movie={recommendation.movie} onClick={onOpenMovie} />
                     <ul className={styles.reasonsList}>
                        {recommendation.reasons.map((reason) => (
                           <li key={`${recommendation.movie.tmdb_id}-${reason}`}>{reason}</li>
                        ))}
                     </ul>
                  </article>
               ))}
            </div>
         )}
      </section>
   );
}
