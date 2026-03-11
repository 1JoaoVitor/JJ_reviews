import { Modal, Row, Col } from "react-bootstrap";
import { Pencil, Trash2, Share2, MapPin } from "lucide-react";
import { StarRating } from "@/components/ui/StarRating/StarRating";
import { ConfirmModal } from "@/components/ui/ConfirmModal/ConfirmModal";
import type { MovieData } from "@/types";
import { getBadgeStyle } from "@/utils/badges";
import styles from "./MovieModal.module.css";
import { useState } from "react";
import { useModalBack } from "@/hooks/useModalBack";

interface MovieModalProps {
   show: boolean;
   movie: MovieData | null;
   onHide: () => void;
   isAdmin: boolean;
   onShare: (movie: MovieData) => void;
   onEdit: (movie: MovieData) => void;
   onDelete: (movie: MovieData) => Promise<void> | void;
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


   useModalBack(show, onHide);
   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
   const [isDeleting, setIsDeleting] = useState(false);

   const isPartialShared = movie?.list_type === "partial_shared";
   const displayRecommended = isPartialShared && movie?.list_average_recommended !== undefined
      ? movie.list_average_recommended
      : movie?.recommended;

   const badgeStyle = getBadgeStyle(displayRecommended || "");

   if (!movie) return null;

   return (
      <>
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
                        onClick={() => setShowDeleteConfirm(true)}
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
                  {/* Se for uma Lista Parcial, mostra as opiniões de todo mundo */}
                  {movie.list_type === "partial_shared" ? (
                     <div className="mb-4">
                        <div className="d-flex align-items-center gap-2 mb-4">
                           <h5 className={styles.sectionTitle} style={{ margin: 0, border: 'none' }}>Avaliações do Grupo</h5>
                           <span className={styles.groupAverageBadge}>
                              Média: {movie.list_average_rating ? movie.list_average_rating.toFixed(1) : "N/A"}
                           </span>

                           {displayRecommended && (
                              <span
                                 className={styles.recommendBadge}
                                 style={{
                                    backgroundColor: badgeStyle.bg,
                                    color: badgeStyle.color,
                                    padding: "0.2rem 0.8rem",
                                    borderRadius: "var(--radius-pill)",
                                    fontSize: "0.85rem",
                                    fontWeight: "bold"
                                 }}
                              >
                                 Veredito: {displayRecommended}
                              </span>
                           )}

                        </div>

                        <div className={styles.groupReviewsContainer}>
                           {movie.list_group_reviews?.map((groupRev, idx) => (
                              <div key={idx} className={styles.groupReviewCard}>
                                 <div className={styles.reviewerHeader}>
                                    {groupRev.user?.avatar_url ? (
                                       <img src={groupRev.user.avatar_url} alt="Avatar" className={styles.reviewerAvatar} />
                                    ) : (
                                       <div className={styles.reviewerAvatar}>
                                          {groupRev.user?.username?.charAt(0).toUpperCase() || "?"}
                                       </div>
                                    )}
                                    <div className={styles.reviewerInfo}>
                                       <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                                          <strong style={{ lineHeight: '2' }}>@{groupRev.user?.username || "Membro"}</strong>
                                          {groupRev.recommended && (
                                                <span style={{
                                                   fontSize: '0.65rem',
                                                   padding: '0.15rem 0.4rem',
                                                   borderRadius: 'var(--radius-pill)',
                                                   backgroundColor: getBadgeStyle(groupRev.recommended).bg,
                                                   color: getBadgeStyle(groupRev.recommended).color,
                                                   fontWeight: 'bold',
                                                   textTransform: 'uppercase'
                                                }}>
                                                   {groupRev.recommended}
                                                </span>
                                          )}
                                       </div>
                                       {groupRev.rating !== null && groupRev.rating !== undefined ? (
                                          <div className={styles.reviewerStars}>
                                             <StarRating value={groupRev.rating} max={10} readOnly={true} />
                                          </div>
                                       ) : (
                                          <span className="text-muted" style={{ fontSize: '0.8rem' }}>Ainda não avaliou</span>
                                       )}
                                    </div>
                                 </div>
                                 {groupRev.review && (
                                    <p className={styles.reviewerText}>&ldquo;{groupRev.review}&rdquo;</p>
                                 )}
                              </div>
                           ))}
                        </div>
                     </div>
                  ) : (
                     /* Layout Tradicional (Perfil Privado ou Compartilhado Total) */
                     <>
                        <div className="d-flex align-items-center gap-4 mb-4 flex-wrap">
                           <div>
                              <h5 className={styles.ratingLabel} style={{ marginBottom: "0.5rem" }}>
                                 {movie.list_type === "full_shared" ? "Avaliação Compartilhada" : "Sua Avaliação"}
                              </h5>
                              {movie.rating !== null && movie.rating !== undefined ? (
                                 <StarRating value={movie.rating} readOnly={true} />
                              ) : (
                                 <span className="text-muted fw-bold">Na Fila (Não avaliado)</span>
                              )}
                              
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

                        <div className="mb-4">
                           <div className="d-flex align-items-center gap-3 mb-2">
                              <h5 className={styles.sectionTitle} style={{ margin: 0 }}>Review</h5>
                              {movie.location && (
                                 <span 
                                    className="text-muted d-flex align-items-center gap-1" 
                                    style={{ fontSize: "0.85rem", fontWeight: 500 }}
                                 >
                                    <MapPin size={14} /> {movie.location}
                                 </span>
                              )}
                           </div>
                           
                           <p className={styles.reviewText}>
                              &ldquo;{movie.review || "Sem análise detalhada."}&rdquo;
                           </p>
                        </div>
                     </>
                  )}

                  {/* Cast */}
                  {movie.cast && movie.cast.length > 0 && (
                     <div className="mb-4 mt-4">
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
            {isAdmin && onShare && movie && (
               <button className={styles.shareBtn} onClick={() => onShare(movie)}>
                  <Share2 size={16} /> Compartilhar
               </button>
            )}
            <div className="ms-auto">
               <button className={styles.closeBtn} onClick={onHide}>Fechar</button>
            </div>
         </Modal.Footer>
      </Modal>

      <ConfirmModal
         show={showDeleteConfirm}
         onHide={() => setShowDeleteConfirm(false)}
         onConfirm={async () => {
            setIsDeleting(true);
            try {
               await onDelete(movie);
            } finally {
               setIsDeleting(false);
               setShowDeleteConfirm(false);
            }
         }}
         title="Excluir Filme"
         message={`Tem certeza que deseja excluir "${movie.title}"? Essa ação não pode ser desfeita.`}
         confirmText="Sim, excluir"
         isProcessing={isDeleting}
      />
      </>
   );
}
