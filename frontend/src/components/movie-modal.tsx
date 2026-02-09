import { Modal, Button, Row, Col, Badge } from "react-bootstrap";
import type { MovieData } from "../types";
import { getBadgeStyle } from "../utils";

interface MovieModalProps {
   show: boolean;
   movie: MovieData | null;
   onHide: () => void;
   isAdmin: boolean;
   onShare: (movie: MovieData) => void;
   onEdit: (movie: MovieData) => void;
   onDelete: (movie: MovieData) => void;
}

export function MovieModal({
   show,
   movie,
   onHide,
   isAdmin,
   onEdit,
   onDelete,
   onShare,
}: MovieModalProps) {
   if (!movie) return null;

   const badgeStyle = getBadgeStyle(movie.recommended);

   return (
      <Modal show={show} onHide={onHide} size="xl" centered>
         <Modal.Header closeButton className="border-0 pb-0">
            <Modal.Title className="fw-bold display-6">
               {movie.title}
            </Modal.Title>
         </Modal.Header>
         <Modal.Body className="pt-2">
            {/* --- BARRA DE ADMIN (Só logado) --- */}
            {isAdmin && (
               <div className="alert alert-secondary d-flex justify-content-between align-items-center py-2 mb-4">
                  <small className="fw-bold text-uppercase">Modo Admin</small>
                  <div>
                     <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        onClick={() => onEdit(movie)}
                     >
                        ✏️ Editar
                     </Button>
                     <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => {
                           if (
                              confirm(
                                 "Tem certeza que deseja excluir este filme?",
                              )
                           ) {
                              onDelete(movie);
                           }
                        }}
                     >
                        🗑️ Excluir
                     </Button>
                  </div>
               </div>
            )}

            <p className="text-muted mb-4">
               {movie.director} • {movie.release_date?.split("-")[0]} •{" "}
               {movie.countries?.join(", ")}
            </p>

            <div className="mb-3">
               {movie.genres?.map((genre, idx) => (
                  <Badge
                     key={idx}
                     bg="dark"
                     className="me-2 border border-secondary fw-normal"
                  >
                     {genre}
                  </Badge>
               ))}
            </div>

            <Row>
               <Col md={4} className="mb-3">
                  {movie.poster_path ? (
                     <img
                        src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                        alt={movie.title}
                        className="img-fluid rounded shadow w-100 mb-3"
                     />
                  ) : (
                     <div className="bg-secondary text-white p-5 rounded text-center mb-3">
                        Sem Imagem
                     </div>
                  )}

                  {/* --- Onde Assistir --- */}
                  {movie.providers && movie.providers.length > 0 ? (
                     <div className="bg-light p-3 rounded border">
                        <h6 className="fw-bold text-muted small mb-2 text-uppercase">
                           Onde Assistir:
                        </h6>
                        <div className="d-flex flex-wrap gap-2 justify-content-start">
                           {movie.providers.map((provider) => (
                              <img
                                 key={provider.provider_id}
                                 src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                                 alt={provider.provider_name}
                                 title={provider.provider_name}
                                 className="rounded shadow-sm"
                                 style={{ width: "45px", height: "45px" }}
                              />
                           ))}
                        </div>
                     </div>
                  ) : (
                     /* Caso não tenha em streaming nenhum */
                     <div className="text-center text-muted small mt-2">
                        Indisponível em streamings no Brasil.
                     </div>
                  )}
               </Col>
               <Col md={8}>
                  <div className="d-flex align-items-center gap-3 mb-4">
                     <div
                        className="d-flex align-items-center justify-content-center shadow-sm"
                        style={{
                           backgroundColor: "#ffc107",
                           color: "#000",
                           width: "70px",
                           height: "70px",
                           borderRadius: "15px",
                           fontWeight: "bold",
                           fontSize: "1.8rem",
                           border: "2px solid #e0a800",
                           flexShrink: 0,
                        }}
                     >
                        {movie.rating}
                     </div>
                     <div>
                        <h5 className="mb-0 fw-bold">Nossa Avaliação</h5>
                        <small className="text-muted">Escala de 0 a 10</small>
                     </div>

                     <div className="ms-auto">
                        <span
                           className="badge rounded-pill px-4 py-2"
                           style={{
                              backgroundColor: badgeStyle.bg,
                              color: badgeStyle.color,
                              fontSize: "1rem",
                           }}
                        >
                           {movie.recommended}
                        </span>
                     </div>
                  </div>

                  <div className="mb-4">
                     <h5 className="fw-bold border-bottom pb-2">
                        O que achamos:
                     </h5>
                     <p
                        className="fs-5"
                        style={{ whiteSpace: "pre-line", lineHeight: "1.6" }}
                     >
                        "{movie.review || "Sem análise detalhada."}"
                     </p>
                  </div>

                  {movie.cast && movie.cast.length > 0 && (
                     <div className="mb-4">
                        <h6 className="fw-bold text-muted text-uppercase small">
                           Elenco Principal
                        </h6>
                        <div className="d-flex flex-wrap gap-2">
                           {movie.cast.map((actor, idx) => (
                              <Badge
                                 key={idx}
                                 bg="light"
                                 text="dark"
                                 className="border"
                              >
                                 {actor}
                              </Badge>
                           ))}
                        </div>
                     </div>
                  )}

                  {movie.overview && (
                     <div className="p-3 bg-light rounded border mt-auto">
                        <small className="text-muted fw-bold text-uppercase">
                           Sinopse (TMDB)
                        </small>
                        <p className="small text-secondary mb-0 mt-1">
                           {movie.overview}
                        </p>
                     </div>
                  )}
               </Col>
            </Row>
         </Modal.Body>
         <Modal.Footer className="border-0">
            {movie && (
               <Button
                  variant="success"
                  onClick={() => onShare(movie)}
                  className="d-flex align-items-center gap-2 me-auto" // me-auto joga ele para a esquerda
               >
                  Compartilhar
               </Button>
            )}
            <Button variant="secondary" onClick={onHide}>
               Fechar
            </Button>
         </Modal.Footer>
      </Modal>
   );
}
