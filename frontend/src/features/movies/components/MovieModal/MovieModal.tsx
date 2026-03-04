import { Modal, Row, Col } from "react-bootstrap";
import { Pencil, Trash2, Share2 } from "lucide-react";
import type { MovieData } from "@/types";
import { getBadgeStyle } from "@/utils/badges";
import styles from "./MovieModal.module.css";

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
      <Modal show={show} onHide={onHide} size="xl" centered fullscreen="sm-down">
         <Modal.Header closeButton className="border-0 pb-0">
            <Modal.Title className="fw-bold" style={{ fontSize: "1.75rem" }}>
               {movie.title}
            </Modal.Title>
         </Modal.Header>

         <Modal.Body className="pt-2">
            {/* Admin bar */}
            {isAdmin && (
               <div className={styles.adminBar}>
                  <span className={styles.adminLabel}>Admin</span>
                  <div className="d-flex gap-2">
                     <button className={styles.adminBtn} onClick={() => onEdit(movie)}>
                        <Pencil size={14} /> Editar
                     </button>
                     <button
                        className={`${styles.adminBtn} ${styles.adminBtnDanger}`}
                        onClick={() => {
                           if (confirm("Tem certeza que deseja excluir este filme?")) {
                              onDelete(movie);
                           }
                        }}
                     >
                        <Trash2 size={14} /> Excluir
                     </button>
                  </div>
               </div>
            )}

            <p className={styles.movieMeta}>
               {movie.director} &middot; {movie.release_date?.split("-")[0]} &middot;{" "}
               {movie.countries?.join(", ")}
            </p>

            <div className="d-flex flex-wrap gap-2 mb-3">
               {movie.genres?.map((genre, idx) => (
                  <span key={idx} className={styles.genreBadge}>{genre}</span>
               ))}
            </div>

            <Row>
               <Col md={4} className="mb-3">
                  {movie.poster_path ? (
                     <img
                        src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                        alt={movie.title}
                        className="img-fluid w-100 mb-3"
                        style={{ borderRadius: "var(--radius-lg)" }}
                     />
                  ) : (
                     <div
                        className="d-flex align-items-center justify-content-center mb-3"
                        style={{
                           height: 300,
                           background: "var(--bg-elevated)",
                           borderRadius: "var(--radius-lg)",
                           color: "var(--text-muted)",
                        }}
                     >
                        Sem Imagem
                     </div>
                  )}

                  {movie.providers && movie.providers.length > 0 ? (
                     <div className={styles.providerSection}>
                        <div className={styles.providerLabel}>Onde Assistir</div>
                        <div className="d-flex flex-wrap gap-2">
                           {movie.providers.map((provider) => (
                              <img
                                 key={provider.provider_id}
                                 src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                                 alt={provider.provider_name}
                                 title={provider.provider_name}
                                 className={styles.providerLogo}
                              />
                           ))}
                        </div>
                     </div>
                  ) : (
                     <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "var(--font-sm)" }}>
                        Indisponível em streamings no Brasil.
                     </div>
                  )}
               </Col>

               <Col md={8}>
                  {/* Rating + Recommendation */}
                  <div className="d-flex align-items-center gap-3 mb-4">
                     <div className={styles.ratingBox}>{movie.rating}</div>
                     <div>
                        <h5 className={styles.ratingLabel}>Avaliação</h5>
                        <small className={styles.ratingSublabel}>Escala de 0 a 10</small>
                     </div>
                     {movie.recommended && (
                        <div className="ms-auto">
                           <span
                              className={styles.recommendBadge}
                              style={{
                                 backgroundColor: badgeStyle.bg,
                                 color: badgeStyle.color,
                                 padding: "0.5rem 1.25rem",
                                 borderRadius: "var(--radius-pill)",
                                 display: "inline-block",
                              }}
                           >
                              {movie.recommended}
                           </span>
                        </div>
                     )}
                  </div>

                  {/* Review */}
                  <div className="mb-4">
                     <h5 className={styles.sectionTitle}>Review</h5>
                     <p className={styles.reviewText}>
                        &ldquo;{movie.review || "Sem análise detalhada."}&rdquo;
                     </p>
                  </div>

                  {/* Cast */}
                  {movie.cast && movie.cast.length > 0 && (
                     <div className="mb-4">
                        <h6 className={styles.sectionTitle}>Elenco Principal</h6>
                        <div className="d-flex flex-wrap gap-2">
                           {movie.cast.map((actor, idx) => (
                              <span key={idx} className={styles.castBadge} style={{
                                 padding: "0.3rem 0.65rem",
                                 borderRadius: "var(--radius-pill)",
                                 fontSize: "var(--font-sm)",
                              }}>
                                 {actor}
                              </span>
                           ))}
                        </div>
                     </div>
                  )}

                  {/* Synopsis */}
                  {movie.overview && (
                     <div className={styles.synopsisBox}>
                        <div className={styles.synopsisLabel}>Sinopse (TMDB)</div>
                        <p className={styles.synopsisText}>{movie.overview}</p>
                     </div>
                  )}
               </Col>
            </Row>
         </Modal.Body>

         <Modal.Footer className="border-0 d-flex">
            {movie && (
               <button className={styles.shareBtn} onClick={() => onShare(movie)}>
                  <Share2 size={16} /> Compartilhar
               </button>
            )}
            <div className="ms-auto">
               <button className={styles.closeBtn} onClick={onHide}>Fechar</button>
            </div>
         </Modal.Footer>
      </Modal>
   );
}
