import type { FC } from "react";
import type { GameMovieProfile } from "@/features/games/logic/dailyGameLogic";
import { getListLabel } from "../logic/dailyMovieGameLogic";
import styles from "../GamesHub.module.css";

interface DailyFinalRevealProps {
   targetMovie: GameMovieProfile;
}

export const DailyFinalReveal: FC<DailyFinalRevealProps> = ({ targetMovie }) => {
   return (
      <div className={styles.finalReveal}>
         <h4 className={styles.finalTitle}>Filme revelado</h4>
         <div className={styles.finalLayout}>
            {targetMovie.posterPath ? (
               <img
                  src={`https://image.tmdb.org/t/p/w500${targetMovie.posterPath}`}
                  alt={targetMovie.title}
                  className={styles.finalPoster}
               />
            ) : (
               <div className={styles.noPoster}>Sem poster</div>
            )}

            <div className={styles.finalInfo}>
               <strong>{targetMovie.title}</strong>
               <p>Ano: {targetMovie.releaseYear || "Nao informado"}</p>
               <p>Diretor: {targetMovie.director || "Nao informado"}</p>
               <p>Generos: {getListLabel(targetMovie.genres)}</p>
               <p>Paises: {getListLabel(targetMovie.countries)}</p>
               <p>Elenco principal: {getListLabel(targetMovie.cast)}</p>
               <p>Duracao: {targetMovie.runtime ? `${targetMovie.runtime} min` : "Nao informada"}</p>
            </div>
         </div>
      </div>
   );
};
