import type { MovieData } from "@/types";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { ConfirmModal } from "@/components/ui/ConfirmModal/ConfirmModal";
import { MovieCard } from "@/features/movies";
import { hasUserReview, upsertPersonalReview } from "@/features/movies/services/moviePersistenceService";
import { useRecommendations } from "@/features/recommendations/hooks/useRecommendations";
import styles from "./RecommendationsPage.module.css";

interface RecommendationsPageProps {
   userId: string | null | undefined;
   movies: MovieData[];
   onOpenMovie: (movie: MovieData) => void;
}

export function RecommendationsPage({ userId, movies, onOpenMovie }: RecommendationsPageProps) {
   const navigate = useNavigate();
   const { recommendations, loading, error, registerReaction, dislikeMany, resetFeedback, refreshRecommendations } = useRecommendations(userId, movies);
   const [savingWatchlistId, setSavingWatchlistId] = useState<number | null>(null);
   const [refreshing, setRefreshing] = useState(false);
   const [reactedMovieIds, setReactedMovieIds] = useState<Record<number, "like" | "dislike" | "watchlist">>({});
   const [hiddenWatchlistMovieIds, setHiddenWatchlistMovieIds] = useState<Set<number>>(new Set());
   const [showResetConfirm, setShowResetConfirm] = useState(false);
   const [showNewRecommendationsConfirm, setShowNewRecommendationsConfirm] = useState(false);

   const knownMovieIds = useMemo(() => new Set(movies.map((movie) => movie.tmdb_id)), [movies]);
   const visibleRecommendations = useMemo(
      () => recommendations.filter((item) => !hiddenWatchlistMovieIds.has(item.movie.tmdb_id)).slice(0, 4),
      [hiddenWatchlistMovieIds, recommendations],
   );

   const handleReaction = async (movie: MovieData, reaction: "like" | "dislike") => {
      try {
         await registerReaction(movie, reaction);
         setReactedMovieIds((prev) => ({ ...prev, [movie.tmdb_id]: reaction }));
      } catch {
         toast.error("Não foi possível salvar seu feedback agora.");
      }
   };

   const handleSaveToWatchlist = async (movie: MovieData) => {
      if (!userId || savingWatchlistId === movie.tmdb_id) {
         return;
      }

      if (knownMovieIds.has(movie.tmdb_id)) {
         toast("Esse filme já está no seu perfil.");
         return;
      }

      setSavingWatchlistId(movie.tmdb_id);
      try {
         const alreadyExists = await hasUserReview(userId, movie.tmdb_id);
         if (alreadyExists) {
            toast("Esse filme já foi salvo antes.");
            return;
         }

         await upsertPersonalReview(userId, movie.tmdb_id, {
            rating: null,
            review: null,
            recommended: null,
            runtime: 0,
            location: null,
            status: "watchlist",
            attachment_url: null,
         });

         await registerReaction(movie, "watchlist");
         setReactedMovieIds((prev) => ({ ...prev, [movie.tmdb_id]: "watchlist" }));
         setHiddenWatchlistMovieIds((prev) => {
            const next = new Set(prev);
            next.add(movie.tmdb_id);
            return next;
         });
         toast.success("Filme salvo na watchlist.");
         refreshRecommendations();
      } catch (error) {
         console.error("Erro ao salvar recomendação na watchlist:", error);
         toast.error("Não foi possível salvar na watchlist.");
      } finally {
         setSavingWatchlistId(null);
      }
   };

   const handleResetRecommendations = async () => {
      try {
         setRefreshing(true);
         await resetFeedback();
         setReactedMovieIds({});
         setHiddenWatchlistMovieIds(new Set());
         refreshRecommendations();
         toast.success("Preferências de recomendação resetadas.");
      } catch {
         toast.error("Não foi possível resetar suas preferências agora.");
      } finally {
         setRefreshing(false);
      }
   };

   const handleNewRecommendations = async () => {
      if (visibleRecommendations.length === 0) {
         return;
      }

      try {
         setRefreshing(true);
         await dislikeMany(visibleRecommendations.map((item) => item.movie));
         const nextFlags = visibleRecommendations.reduce<Record<number, "dislike">>((acc, item) => {
            acc[item.movie.tmdb_id] = "dislike";
            return acc;
         }, {});
         setReactedMovieIds((prev) => ({ ...prev, ...nextFlags }));
         setHiddenWatchlistMovieIds(new Set());
         refreshRecommendations();
         toast.success("Gerando novas recomendações...");
      } catch {
         toast.error("Não foi possível atualizar as recomendações agora.");
      } finally {
         setRefreshing(false);
      }
   };

   if (!userId) {
      return (
         <EmptyState
            title="Entre para ver recomendações"
            message="As recomendações personalizadas aparecem quando você estiver logado."
            actionText="Voltar"
            onAction={() => navigate(-1)}
         />
      );
   }

   return (
      <section className={styles.wrapper}>
         <header className={styles.header}>
            <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>
               <ArrowLeft size={16} />
               Voltar
            </button>
            <h1 className={styles.title}>Recomendações para você</h1>

            <div className={styles.headerActions}>
               <button
                  type="button"
                  className={styles.feedbackBtn}
                  onClick={() => setShowResetConfirm(true)}
                  disabled={refreshing}
               >
                  Resetar perfil
               </button>
               <button
                  type="button"
                  className={`${styles.feedbackBtn} ${styles.feedbackBtnWatchlist}`}
                  onClick={() => setShowNewRecommendationsConfirm(true)}
                  disabled={refreshing || visibleRecommendations.length === 0}
               >
                  {refreshing ? "Atualizando..." : "Novas recomendações"}
               </button>
            </div>
         </header>

         {loading && (
            <div className={styles.loadingState}>
               <div className="spinner-border" role="status" aria-label="Carregando recomendações" />
               <span>Calculando suas próximas escolhas...</span>
            </div>
         )}

         {error && !loading && <div className={styles.errorState}>{error}</div>}

         {!loading && !error && visibleRecommendations.length === 0 && (
            <EmptyState
               title="Ainda sem recomendações"
               message="Adicione e avalie alguns filmes para melhorar as sugestões automáticas."
               actionText="Atualizar recomendações"
               onAction={() => refreshRecommendations()}
            />
         )}

         {!loading && !error && visibleRecommendations.length > 0 && (
            <div className="movie-grid">
               {visibleRecommendations.map((recommendation) => (
                  <article key={recommendation.movie.tmdb_id} className={styles.cardWrap}>
                     <MovieCard movie={recommendation.movie} onClick={onOpenMovie} />
                     <div className={styles.feedbackRow}>
                        <button
                           type="button"
                           className={`${styles.feedbackBtn} ${reactedMovieIds[recommendation.movie.tmdb_id] === "like" ? styles.feedbackBtnActive : ""}`}
                           onClick={() => {
                              void handleReaction(recommendation.movie, "like");
                           }}
                        >
                           Gostei
                        </button>
                        <button
                           type="button"
                           className={`${styles.feedbackBtn} ${reactedMovieIds[recommendation.movie.tmdb_id] === "dislike" ? styles.feedbackBtnDanger : ""}`}
                           onClick={() => {
                              void handleReaction(recommendation.movie, "dislike");
                           }}
                        >
                           Não curti
                        </button>
                        <button
                           type="button"
                           className={`${styles.feedbackBtn} ${styles.feedbackBtnWatchlist}`}
                           disabled={savingWatchlistId === recommendation.movie.tmdb_id || reactedMovieIds[recommendation.movie.tmdb_id] === "watchlist"}
                           onClick={() => handleSaveToWatchlist(recommendation.movie)}
                        >
                           {reactedMovieIds[recommendation.movie.tmdb_id] === "watchlist"
                              ? "Salvo"
                              : savingWatchlistId === recommendation.movie.tmdb_id
                                 ? "Salvando..."
                                 : "Salvar na watchlist"}
                        </button>
                     </div>
                  </article>
               ))}
            </div>
         )}

         <ConfirmModal
            show={showResetConfirm}
            onHide={() => setShowResetConfirm(false)}
            onConfirm={() => {
               setShowResetConfirm(false);
               void handleResetRecommendations();
            }}
            title="Resetar perfil de recomendação"
            message="Tem certeza? Isso vai apagar o feedback salvo e recalcular as sugestões do zero."
            confirmText="Sim, resetar"
            isProcessing={refreshing}
         />

         <ConfirmModal
            show={showNewRecommendationsConfirm}
            onHide={() => setShowNewRecommendationsConfirm(false)}
            onConfirm={() => {
               setShowNewRecommendationsConfirm(false);
               void handleNewRecommendations();
            }}
            title="Gerar novas recomendações"
            message="Isso vai marcar as 4 recomendações atuais como não gostei e carregar 4 novas. Deseja continuar?"
            confirmText="Sim, gerar novas"
            isProcessing={refreshing}
         />
      </section>
   );
}
