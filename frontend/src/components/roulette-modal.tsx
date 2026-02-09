import { useState, useEffect } from "react";
import { Modal, Button, Image } from "react-bootstrap";
import type { MovieData } from "../types";
import confetti from "canvas-confetti"; // Efeito de festa opcional, mas legal se tiver instalado

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

   // Roleta
   useEffect(() => {
      if (show && watchlist.length > 0) {
         setWinner(null);
         setIsSpinning(true);

         let spins = 0;
         const maxSpins = 20; // Quantas vezes troca de imagem antes de parar
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
            // Escolhe um filme aleatório para mostrar "passando"
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
                  {/* Poster Piscando ou Parado */}
                  <div
                     style={{
                        width: "200px",
                        height: "300px",
                        overflow: "hidden",
                        borderRadius: "15px",
                        boxShadow: "0 10px 20px rgba(0,0,0,0.2)",
                        marginBottom: "20px",
                        border: winner ? "4px solid #ffc107" : "none",
                        transition: "all 0.3s ease",
                     }}
                  >
                     {currentMovie?.poster_path ? (
                        <Image
                           src={`https://image.tmdb.org/t/p/w500${currentMovie.poster_path}`}
                           style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                           }}
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

                  {/* Botão de Ação (Só aparece quando termina) */}
                  {!isSpinning && winner && (
                     <Button
                        variant="success"
                        size="lg"
                        className="w-100 fw-bold animate__animated animate__pulse animate__infinite"
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
