import { useState, useEffect } from "react";
import { Modal, Button, Image } from "react-bootstrap";
import type { MovieData } from "@/types";
import confetti from "canvas-confetti";
import styles from "./RouletteModal.module.css";

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
         <Modal.Header closeButton={!isSpinning}>
            <Modal.Title className="fw-bold w-100 text-center">
               {isSpinning ? "Sorteando..." : "O Escolhido!"}
            </Modal.Title>
         </Modal.Header>

         <Modal.Body className="text-center py-4">
            {watchlist.length === 0 ? (
               <p>Sua Watchlist está vazia! Adicione filmes primeiro.</p>
            ) : (
               <div className="d-flex flex-column align-items-center">
                  <div
                     className={`${styles.posterContainer} ${winner ? styles.posterContainerWinner : ""}`}
                  >
                     {currentMovie?.poster_path ? (
                        <Image
                           src={`https://image.tmdb.org/t/p/w500${currentMovie.poster_path}`}
                           className={styles.posterImage}
                        />
                     ) : (
                        <div className="bg-secondary w-100 h-100 d-flex align-items-center justify-content-center text-white">
                           ?
                        </div>
                     )}
                  </div>

                  <h4 className="fw-bold mb-1">
                     {currentMovie?.title || "Carregando..."}
                  </h4>
                  <small className="text-muted mb-4">
                     {currentMovie?.release_date?.split("-")[0]}
                  </small>

                  {!isSpinning && winner && (
                     <Button
                        variant="success"
                        size="lg"
                        className="w-100 fw-bold"
                        onClick={() => onMovieSelect(winner)}
                     >
                        Ver Detalhes
                     </Button>
                  )}

                  {!isSpinning && winner && (
                     <Button
                        variant="link"
                        className="text-muted mt-2 text-decoration-none"
                        onClick={onHide}
                     >
                        Fechar
                     </Button>
                  )}
               </div>
            )}
         </Modal.Body>
      </Modal>
   );
}
