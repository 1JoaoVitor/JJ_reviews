import { useState, useEffect } from "react";
import { Modal } from "react-bootstrap";
import type { MovieData } from "@/types";
import confetti from "canvas-confetti";
import styles from "./RouletteModal.module.css";
import { useModalBack } from "@/hooks/useModalBack";

interface RouletteModalProps {
   show: boolean;
   onHide: () => void;
   watchlist: MovieData[];
   onMovieSelect: (movie: MovieData) => void;
}

export function RouletteModal({
   show,
   onHide,
   watchlist,
   onMovieSelect,
}: RouletteModalProps) {
   useModalBack(show, onHide);

   const [currentMovie, setCurrentMovie] = useState<MovieData | null>(null);
   const [isSpinning, setIsSpinning] = useState(false);
   const [winner, setWinner] = useState<MovieData | null>(null);

   useEffect(() => {
      if (show && watchlist.length > 0) {
         setWinner(null);
         setIsSpinning(true);

         let spins = 0;
         const maxSpins = 20;
         const intervalSpeed = 100;

         const finishSpin = () => {
            setIsSpinning(false);
            const finalIndex = Math.floor(Math.random() * watchlist.length);
            const selectedMovie = watchlist[finalIndex];
            setWinner(selectedMovie);
            setCurrentMovie(selectedMovie);
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
         };

         const interval = setInterval(() => {
            const randomIndex = Math.floor(Math.random() * watchlist.length);
            setCurrentMovie(watchlist[randomIndex]);
            spins++;
            if (spins >= maxSpins) {
               clearInterval(interval);
               finishSpin();
            }
         }, intervalSpeed);

         return () => clearInterval(interval);
      }
   }, [show, watchlist]);

   return (
      <Modal show={show} onHide={onHide} centered backdrop="static" size="sm">
         <Modal.Header closeButton={!isSpinning} className="border-0 pb-0">
            <Modal.Title className="fw-bold w-100 text-center">
               {isSpinning ? "Sorteando..." : "O Escolhido!"}
            </Modal.Title>
         </Modal.Header>

         <Modal.Body className="text-center py-4">
            {watchlist.length === 0 ? (
               <p className={styles.emptyMessage}>Sua Watchlist está vazia! Adicione filmes primeiro.</p>
            ) : (
               <div className="d-flex flex-column align-items-center">
                  <div
                     className={`${styles.posterContainer} ${winner ? styles.posterContainerWinner : ""}`}
                  >
                     {currentMovie?.poster_path ? (
                        <img
                           src={`https://image.tmdb.org/t/p/w500${currentMovie.poster_path}`}
                           alt={currentMovie.title}
                           className={styles.posterImage}
                        />
                     ) : (
                        <div className={styles.posterPlaceholder}>?</div>
                     )}
                  </div>

                  <h4 className={styles.movieTitle}>
                     {currentMovie?.title || "Carregando..."}
                  </h4>
                  <small className={styles.movieYear}>
                     {currentMovie?.release_date?.split("-")[0]}
                  </small>

                  {!isSpinning && winner && (
                     <button
                        className={styles.detailsBtn}
                        onClick={() => onMovieSelect(winner)}
                     >
                        Ver Detalhes
                     </button>
                  )}

                  {!isSpinning && winner && (
                     <button className={styles.closeLink} onClick={onHide}>
                        Fechar
                     </button>
                  )}
               </div>
            )}
         </Modal.Body>
      </Modal>
   );
}
