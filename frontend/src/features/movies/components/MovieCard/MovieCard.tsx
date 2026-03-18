import type { MovieData } from "@/types";
import { getBadgeTone } from "@/utils/badges";
import styles from "./MovieCard.module.css";
import { Star, Users } from "lucide-react";

interface MovieCardProps {
   movie: MovieData;
   onClick: (movie: MovieData) => void;
}

export function MovieCard({ movie, onClick }: MovieCardProps) {

   // Lógicas de Lista Compartilhada
   const isPartialShared = movie.list_type === "partial_shared";
   const isFullShared = movie.list_type === "full_shared";
   
   // Se for Parcialmente, mostra a Média. Senão, mostra a nota normal.
   const displayRating = isPartialShared && movie.list_average_rating !== undefined
      ? movie.list_average_rating.toFixed(1)
      : movie.rating;

   const displayRecommended = isPartialShared && movie.list_average_recommended !== undefined
      ? movie.list_average_recommended
      : movie.recommended;

   const isWatchlist = displayRating === null || displayRating === undefined;

   const badgeTone = getBadgeTone(displayRecommended || "");
   const badgeToneClass = styles[`recommendTone${badgeTone.charAt(0).toUpperCase()}${badgeTone.slice(1)}`];

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
                     {isPartialShared ? <Users size={12} className={styles.ratingIcon} /> : <Star size={12} fill="currentColor" strokeWidth={2} className={styles.ratingIcon} />}
                     {displayRating}
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

            <div className={styles.footerInfo}>
               {displayRecommended ? (
                  <span
                     className={`${styles.recommendBadge} ${badgeToneClass} ${(isPartialShared || isFullShared) ? styles.recommendNarrow : styles.recommendFull}`}
                     title={displayRecommended}
                  >
                     {displayRecommended}
                  </span>
               ) : isWatchlist ? (
                  <span className={`${styles.recommendBadge} ${styles.waitingBadge}`}>Aguardando...</span>
               ) : <div className={styles.footerSpacer}></div>}

               {/* Avatares dos membros que já avaliaram */}
               {isPartialShared && movie.list_group_reviews && movie.list_group_reviews.length > 0 && (
                  <div className={styles.avatarsContainer}>
                     {movie.list_group_reviews.filter(r => r.rating !== null).map((review, idx) => (
                        review.user?.avatar_url ? (
                           <img key={idx} src={review.user.avatar_url} alt="User" className={styles.avatarCircle} />
                        ) : (
                           <div key={idx} className={styles.avatarCircle}>
                              {review.user?.username?.charAt(0).toUpperCase() || "?"}
                           </div>
                        )
                     ))}
                  </div>
               )}
            </div>
         </div>
      </div>
   );
}