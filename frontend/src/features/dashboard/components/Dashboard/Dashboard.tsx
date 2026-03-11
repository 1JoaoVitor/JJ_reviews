import { Film, Clock, Globe, Clapperboard, Star } from "lucide-react";
import type { MovieData } from "@/types";
import styles from "./Dashboard.module.css";

interface DashboardProps {
   movies: MovieData[];
   onFilterDirector?: (directorName: string) => void;
   onFilterNonUS?: () => void;
}

export function Dashboard({ movies, onFilterDirector, onFilterNonUS }: DashboardProps) {
   const watchedMovies = movies.filter(m => m.status === "watched");

   if (watchedMovies.length === 0) return null;

   const totalMovies = watchedMovies.length;

   const totalRating = watchedMovies.reduce(
      (acc, movie) => acc + (movie.rating || 0),
      0,
   );
   const averageRating =
      watchedMovies.length > 0
         ? (totalRating / watchedMovies.length).toFixed(1)
         : "0.0";


   // ─── LÓGICA DO TEMPO ASSISTIDO ───
   const totalMinutes = watchedMovies.reduce(
      (acc, movie) => acc + (movie.runtime || 0),
      0
   );
   const days = Math.floor(totalMinutes / (24 * 60));
   const hours = Math.floor((totalMinutes % (24 * 60)) / 60);

   // ─── LÓGICA DE FILMES INTERNACIONAIS ───
   const nonUSCount = watchedMovies.filter(
      (m) => !m.countries?.includes("Estados Unidos"),
   ).length;
   const nonUSPercentage = totalMovies > 0 ? ((nonUSCount / totalMovies) * 100).toFixed(0) : "0";

   // ─── LÓGICA DO DIRETOR FAVORITO ───
   const directorCounts: Record<string, number> = {};
   watchedMovies.forEach((movie) => {
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
         <h5 className={styles.heading}>Sua Jornada Cinematográfica</h5>
         <div className={styles.grid}>
            
            {/* Total de Filmes */}
            <div className={`${styles.statCard} ${styles.statCardTotal}`}>
               <div className={styles.icon}><Film size={20} color="var(--gold)" /></div>
               <div className={styles.statValue}>{totalMovies}</div>
               <div className={styles.statLabel}>Filmes Assistidos</div>
            </div>

            {/* Média Geral */}
            <div className={`${styles.statCard} ${styles.statCardAverage}`}>
               <div className={styles.icon}><Star size={20} color="#EAB308" /></div>
               <div className={styles.statValue}>{averageRating}</div>
               <div className={styles.statLabel}>Média Geral</div>
            </div>

            {/* Tempo Assistido */}
            <div className={`${styles.statCard} ${styles.statCardAverage}`}>
               <div className={styles.icon}><Clock size={20} color="#3B82F6" /></div>
               <div className={styles.statValue} style={{ fontSize: '1.5rem', marginTop: '0.4rem' }}>
                  {days > 0 && <span>{days}d </span>}
                  {hours}h
               </div>
               <div className={styles.statLabel}>Tempo de Vida</div>
            </div>

            {/* Internacionais */}
            <div 
               className={`${styles.statCard} ${styles.statCardInternational} ${onFilterNonUS ? styles.clickable : ''}`}
               onClick={() => onFilterNonUS && onFilterNonUS()}
               title="Clique para ver os seus filmes internacionais"
            >
               <div className={styles.icon}><Globe size={20} color="#10B981" /></div>
               <div className={styles.statValue}>{nonUSPercentage}%</div>
               <div className={styles.statLabel}>Fora dos EUA ({nonUSCount})</div>
            </div>

            {/* Diretor Favorito */}
            <div 
               className={`${styles.statCard} ${styles.statCardDirector} ${maxCount > 1 && onFilterDirector ? styles.clickable : ''}`}
               onClick={() => {
                  if (maxCount > 1 && onFilterDirector) {
                     onFilterDirector(topDirector);
                  }
               }}
               title={maxCount > 1 ? `Clique para ver os filmes de ${topDirector}` : ''}
            >
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