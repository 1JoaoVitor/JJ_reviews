import { Card } from "react-bootstrap";
import type { MovieData } from "../types";
import { getBadgeStyle } from "../utils";

interface MovieCardProps {
   movie: MovieData;
   onClick: (movie: MovieData) => void;
}

export function MovieCard({ movie, onClick }: MovieCardProps) {
   const badgeStyle = getBadgeStyle(movie.recommended);

   return (
      <Card
         className="h-100 shadow border-0 overflow-hidden movie-card"
         style={{ cursor: "pointer" }}
         onClick={() => onClick(movie)}
      >
         <div className="movie-poster-container">
            {movie.poster_path ? (
               <Card.Img
                  variant="top"
                  src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
               />
            ) : (
               <div className="d-flex align-items-center justify-content-center h-100 text-white">
                  Sem Capa
               </div>
            )}
            {/* NOTA OU STATUS */}
            <div
               style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  background: "rgba(0,0,0,0.8)",
                  color: "#ffc107",
                  padding: "5px 10px",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  fontSize: "0.9rem",
               }}
            >
               {movie.rating !== null ? `Nota: ${movie.rating}` : "Na Fila"}
            </div>
         </div>

         <Card.Body className="d-flex flex-column p-3">
            <Card.Title
               className="fs-6 fw-bold text-truncate"
               title={movie.title}
            >
               {movie.title || `Filme #${movie.tmdb_id}`}
            </Card.Title>
            <p className="text-muted small mb-1 text-truncate">
               Dir: {movie.director}
            </p>
            <p className="text-muted small mb-2">
               {movie.release_date ? movie.release_date.split("-")[0] : ""}
               {movie.isNational && (
                  <span
                     className="ms-2 badge bg-success text-white"
                     style={{ fontSize: "0.7em" }}
                  >
                     NACIONAL
                  </span>
               )}
               {movie.isOscar && (
                  <span
                     className="ms-2 badge bg-warning text-dark border border-warning"
                     style={{ fontSize: "0.7em" }}
                  >
                     OSCAR 26
                  </span>
               )}
            </p>
            <hr className="my-2" />

            {movie.recommended && (
               <div className="mt-auto text-center">
                  <span
                     className="badge rounded-pill w-100 py-2"
                     style={{
                        backgroundColor: badgeStyle.bg,
                        color: badgeStyle.color,
                        fontWeight: "500",
                     }}
                  >
                     {movie.recommended}
                  </span>
               </div>
            )}

            {/* SE FOR WATCHLIST, MOSTRA BOTÃO DE AÇÃO */}
            {movie.rating === null && (
               <div className="mt-auto text-center">
                  <span className="badge bg-secondary w-100 py-2">
                     Aguardando...
                  </span>
               </div>
            )}
         </Card.Body>
      </Card>
   );
}
