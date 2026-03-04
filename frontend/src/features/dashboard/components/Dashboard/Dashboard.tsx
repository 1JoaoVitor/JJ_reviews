import { Film, Star, Globe, Clapperboard } from "lucide-react";
import type { MovieData } from "@/types";
import styles from "./Dashboard.module.css";

interface DashboardProps {
   movies: MovieData[];
}

export function Dashboard({ movies }: DashboardProps) {
   if (movies.length === 0) return null;

   const ratedMovies = movies.filter(
      (m) => m.rating !== null && m.rating !== undefined,
   );

   const totalMovies = ratedMovies.length;

   const totalRating = ratedMovies.reduce(
      (acc, movie) => acc + (movie.rating || 0),
      0,
   );

   const averageRating =
      ratedMovies.length > 0
         ? (totalRating / ratedMovies.length).toFixed(1)
         : "0.0";

   const nonUSCount = movies.filter(
      (m) => !m.countries?.includes("Estados Unidos"),
   ).length;

   const nonUSPercentage = ((nonUSCount / totalMovies) * 100).toFixed(0);

   const directorCounts: Record<string, number> = {};
   movies.forEach((movie) => {
      const mainDirector =
         movie.director?.split(",")[0].trim() || "Desconhecido";
      if (mainDirector !== "Desconhecido") {
         directorCounts[mainDirector] = (directorCounts[mainDirector] || 0) + 1;
      }
   });

   let topDirector = "-";
   let maxCount = 0;
   Object.entries(directorCounts).forEach(([director, count]) => {
      if (count > maxCount) {
         topDirector = director;
         maxCount = count;
      }
   });

   return (
      <div>
         <h5 className={styles.heading}>Resumo</h5>
         <div className={styles.grid}>
            <div className={`${styles.statCard} ${styles.statCardTotal}`}>
               <div className={styles.icon}><Film size={20} color="var(--gold)" /></div>
               <div className={styles.statValue}>{totalMovies}</div>
               <div className={styles.statLabel}>Filmes Assistidos</div>
            </div>

            <div className={`${styles.statCard} ${styles.statCardAverage}`}>
               <div className={styles.icon}><Star size={20} color="#3B82F6" /></div>
               <div className={styles.statValue}>{averageRating}</div>
               <div className={styles.statLabel}>Média Geral</div>
            </div>

            <div className={`${styles.statCard} ${styles.statCardInternational}`}>
               <div className={styles.icon}><Globe size={20} color="#10B981" /></div>
               <div className={styles.statValue}>{nonUSCount}</div>
               <div className={styles.statLabel}>Fora dos EUA ({nonUSPercentage}%)</div>
            </div>

            <div className={`${styles.statCard} ${styles.statCardDirector}`}>
               <div className={styles.icon}><Clapperboard size={20} color="#A855F7" /></div>
               <div className={styles.directorName}>
                  {maxCount > 1 ? topDirector : "Vários"}
               </div>
               <div className={styles.statLabel}>
                  {maxCount > 1 ? `${maxCount} filmes` : "Diretor Favorito"}
               </div>
            </div>
         </div>
      </div>
   );
}
