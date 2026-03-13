import { useMemo } from "react";
import { Film, Clock, Globe, Clapperboard, Star } from "lucide-react";
import type { MovieData } from "@/types";
import { calculateDashboardStats } from "../../logic/calculateStats";
import styles from "./Dashboard.module.css";

interface DashboardProps {
   movies: MovieData[];
   onFilterDirector?: (directorName: string) => void;
   onFilterNonUS?: () => void;
}

export function Dashboard({ movies, onFilterDirector, onFilterNonUS }: DashboardProps) {
   // Apenas passa os dados para o Núcleo
   const stats = useMemo(() => calculateDashboardStats(movies), [movies]);

   if (stats.totalMovies === 0) return null;

   // Helper de formatação de tempo (apenas formatação visual)
   const formatRuntime = (totalMinutes: number) => {
      const days = Math.floor(totalMinutes / (24 * 60));
      const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
      
      return (
         <>
            {days > 0 && <span>{days}d </span>}
            {hours}h
         </>
      );
   };

   return (
      <div>
         <h5 className={styles.heading}>Sua Jornada Cinematográfica</h5>
         <div className={styles.grid}>
            
            {/* Total de Filmes */}
            <div className={`${styles.statCard} ${styles.statCardTotal}`}>
               <div className={`${styles.icon} ${styles.iconGold}`}>
                  <Film size={20} />
               </div>
               <div className={styles.statValue}>{stats.totalMovies}</div>
               <div className={styles.statLabel}>Filmes Assistidos</div>
            </div>

            {/* Média Geral */}
            <div className={`${styles.statCard} ${styles.statCardAverage}`}>
               <div className={`${styles.icon} ${styles.iconYellow}`}>
                  <Star size={20} />
               </div>
               <div className={styles.statValue}>
                  {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "0.0"}
               </div>
               <div className={styles.statLabel}>Média Geral</div>
            </div>

            {/* Tempo Assistido */}
            <div className={`${styles.statCard} ${styles.statCardAverage}`}>
               <div className={`${styles.icon} ${styles.iconBlue}`}>
                  <Clock size={20} />
               </div>
               <div className={`${styles.statValue} ${styles.statValueRuntime}`}>
                  {formatRuntime(stats.totalRuntimeMinutes)}
               </div>
               <div className={styles.statLabel}>Tempo de Vida</div>
            </div>

            {/* Internacionais (Fora dos EUA) */}
            <div 
               className={`${styles.statCard} ${styles.statCardInternational} ${onFilterNonUS ? styles.clickable : ''}`}
               onClick={() => onFilterNonUS && onFilterNonUS()}
               title="Clique para ver os seus filmes internacionais"
            >
               <div className={`${styles.icon} ${styles.iconGreen}`}>
                  <Globe size={20} />
               </div>
               <div className={styles.statValue}>{stats.internationalPercent}%</div>
               <div className={styles.statLabel}>Fora dos EUA ({stats.internationalCount})</div>
            </div>

            {/* Diretor Favorito */}
            <div 
               className={`${styles.statCard} ${styles.statCardDirector} ${stats.topDirector && onFilterDirector ? styles.clickable : ''}`}
               onClick={() => {
                  if (stats.topDirector && onFilterDirector) {
                     onFilterDirector(stats.topDirector.name);
                  }
               }}
               title={stats.topDirector ? `Clique para ver os filmes de ${stats.topDirector.name}` : ''}
            >
               <div className={`${styles.icon} ${styles.iconPurple}`}>
                  <Clapperboard size={20} />
               </div>
               <div className={styles.directorName}>
                  {stats.topDirector ? stats.topDirector.name : "Vários"}
               </div>
               <div className={styles.statLabel}>
                  {stats.topDirector ? `${stats.topDirector.count} filmes` : "Diretor Favorito"}
               </div>
            </div>

         </div>
      </div>
   );
}