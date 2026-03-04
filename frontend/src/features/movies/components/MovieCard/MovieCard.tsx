import type { MovieData } from "@/types";
import { getBadgeStyle } from "@/utils/badges";
import styles from "./MovieCard.module.css";
import { Star } from "lucide-react";

interface MovieCardProps {
   movie: MovieData;
   onClick: (movie: MovieData) => void;
}

export function MovieCard({ movie, onClick }: MovieCardProps) {
   const badgeStyle = getBadgeStyle(movie.recommended);
   const isWatchlist = movie.rating === null;

   return (
      <div
         className={styles.card}
         onClick={() => onClick(movie)}
         role="button"
         tabIndex={0}
         onKeyDown={(e) => e.key === "Enter" && onClick(movie)}
      >
         <div className={styles.posterContainer}>
            {movie.poster_path ? (
               <img
                  src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                  alt={movie.title || "Poster"}
                  className={styles.posterImage}
                  loading="lazy"
               />
            ) : (
               <div className={styles.posterPlaceholder}>Sem Capa</div>
            )}

            <div className={styles.posterGradient} />

            <div className={`${styles.ratingBadge} ${isWatchlist ? styles.ratingBadgeWatchlist : ""}`}>
              {isWatchlist ? (
                  "Na Fila"
               ) : (
                  <>
                     <Star size={12} fill="currentColor" strokeWidth={2} style={{ marginTop: "-1px" }} /> 
                     {movie.rating}
                  </>
               )}
            </div>
         </div>

         <div className={styles.body}>
            <h3 className={styles.title} title={movie.title}>
               {movie.title || `Filme #${movie.tmdb_id}`}
            </h3>

            <span className={styles.meta}>
               {movie.director}
               {movie.release_date ? ` · ${movie.release_date.split("-")[0]}` : ""}
            </span>

            {(movie.isNational || movie.isOscar) && (
               <div className={styles.tags}>
                  {movie.isNational && <span className={`${styles.tag} ${styles.tagNational}`}>Nacional</span>}
                  {movie.isOscar && <span className={`${styles.tag} ${styles.tagOscar}`}>Oscar</span>}
               </div>
            )}

            <div className={styles.divider} />

            {movie.recommended ? (
               <span
                  className={styles.recommendBadge}
                  style={{
                     backgroundColor: badgeStyle.bg,
                     color: badgeStyle.color,
                  }}
               >
                  {movie.recommended}
               </span>
            ) : isWatchlist ? (
               <span className={`${styles.recommendBadge} ${styles.waitingBadge}`}>Aguardando...</span>
            ) : null}
         </div>
      </div>
   );
}
