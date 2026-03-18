import { Modal, Row, Col } from "react-bootstrap";
import { Pencil, Trash2, Share2, MapPin, Image as ImageIcon } from "lucide-react"; // Adicionei o ImageIcon
import { StarRating } from "@/components/ui/StarRating/StarRating";
import { ConfirmModal } from "@/components/ui/ConfirmModal/ConfirmModal";
import type { MovieData } from "@/types";
import { getBadgeTone } from "@/utils/badges";
import styles from "./MovieModal.module.css";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useModalBack } from "@/hooks/useModalBack";

interface MovieModalProps {
   show: boolean;
   movie: MovieData | null;
   onHide: () => void;
   isAdmin: boolean;
   onShare: (movie: MovieData) => void;
   onEdit: (movie: MovieData) => void;
   onDelete: (movie: MovieData) => Promise<{ success: boolean; error: string | null }>;
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

   const displayTone = getBadgeTone(displayRecommended || "");
   const displayToneClass = styles[`recommendTone${displayTone.charAt(0).toUpperCase()}${displayTone.slice(1)}`];
   const toneClassFromText = (text?: string | null) => {
      const tone = getBadgeTone(text || "");
      return styles[`recommendTone${tone.charAt(0).toUpperCase()}${tone.slice(1)}`];
   };

   if (!movie) return null;

   return (
      <>
      <Modal show={show} onHide={onHide} size="xl" centered fullscreen="sm-down" contentClassName={styles.modalContent}>
         <Modal.Header closeButton className={styles.header}>
            <Modal.Title className={`fw-bold ${styles.titleLarge}`}>
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

            <Row className="m-0">
               <Col md={4} className="mb-3">
                  {movie.poster_path ? (
                     <img
                        src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                        alt={movie.title}
                        className={`img-fluid w-100 mb-3 ${styles.posterImg}`}
                     />
                  ) : (
                     <div className={`d-flex align-items-center justify-content-center mb-3 ${styles.posterPlaceholder}`}>
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
                     <div className={styles.providersUnavailable}>
                        Indisponível em streamings no Brasil.
                     </div>
                  )}
               </Col>

               <Col md={8}>
                  {/* Se for uma Lista Colaborativa, mostra as opiniões de todo mundo */}
                  {movie.list_type === "partial_shared" ? (
                     <div className="mb-4">
                        <div className="d-flex align-items-center gap-2 mb-4">
                           <h5 className={`${styles.sectionTitle} ${styles.sectionTitlePlain}`}>Avaliações do Grupo</h5>
                           <span className={styles.groupAverageBadge}>
                              Média: {movie.list_average_rating ? movie.list_average_rating.toFixed(1) : "N/A"}
                           </span>

                           {displayRecommended && (
                              <span
                                 className={`${styles.recommendBadge} ${styles.recommendBadgeGroup} ${displayToneClass}`}
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
                                          <strong className={styles.reviewerName}>@{groupRev.user?.username || "Membro"}</strong>
                                          {groupRev.recommended && (
                                             <span className={`${styles.reviewerVerdict} ${toneClassFromText(groupRev.recommended)}`}>
                                                   {groupRev.recommended}
                                                </span>
                                          )}
                                       </div>
                                       {groupRev.rating !== null && groupRev.rating !== undefined ? (
                                          <div className={styles.reviewerStars}>
                                             <StarRating value={groupRev.rating} max={10} readOnly={true} />
                                          </div>
                                       ) : (
                                          <span className={`text-muted ${styles.notRatedYet}`}>Ainda não avaliou</span>
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
                              <h5 className={`${styles.ratingLabel} ${styles.ratingLabelCompact}`}>
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
                                    className={`${styles.recommendBadge} ${styles.recommendBadgeMain} ${displayToneClass}`}
                                 >
                                    {movie.recommended}
                                 </span>
                              </div>
                           )}
                        </div>

                        <div className="mb-4">
                           <div className="d-flex align-items-center gap-3 mb-2">
                              <h5 className={`${styles.sectionTitle} ${styles.sectionTitleNoMargin}`}>Review</h5>
                              {movie.location && (
                                 <span 
                                    className={`text-muted d-flex align-items-center gap-1 ${styles.locationBadge}`}
                                 >
                                    <MapPin size={14} /> {movie.location}
                                 </span>
                              )}
                           </div>
                           
                           <p className={styles.reviewText}>
                              &ldquo;{movie.review || "Sem análise detalhada."}&rdquo;
                           </p>

                           {/* EXIBIÇÃO DA IMAGEM ANEXADA  */}
                           {movie.attachment_url && (
                              <div className={`mt-4 p-3 ${styles.attachmentBox}`}>
                                 <span className={`d-flex align-items-center gap-2 mb-3 text-uppercase ${styles.attachmentLabel}`}>
                                    <ImageIcon size={14} /> Anexo
                                 </span>
                                 <img 
                                    src={movie.attachment_url} 
                                    alt="Anexo da avaliação" 
                                    className={styles.attachmentImg}
                                 />
                              </div>
                           )}
                        </div>
                     </>
                  )}

                  {/* Cast */}
                  {movie.cast && movie.cast.length > 0 && (
                     <div className="mb-4 mt-4">
                        <h6 className={styles.sectionTitle}>Elenco Principal</h6>
                        <div className="d-flex flex-wrap gap-2">
                           {movie.cast.map((actor, idx) => (
                              <span key={idx} className={styles.castBadge}>
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
               const { success, error } = await onDelete(movie);
               if (success) {
                  toast.success("Filme removido do perfil e das listas!");
               } else {
                  toast.error(error || "Erro ao excluir o filme.");
               }
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