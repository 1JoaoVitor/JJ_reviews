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
   const [showResetConfirm, setShowResetConfirm] = useState(false);
   const [showNewRecommendationsConfirm, setShowNewRecommendationsConfirm] = useState(false);

   const knownMovieIds = useMemo(() => new Set(movies.map((movie) => movie.tmdb_id)), [movies]);

   const handleReaction = async (movie: MovieData, reaction: "like" | "dislike") => {
      try {
         await registerReaction(movie, reaction);
         setReactedMovieIds((prev) => ({ ...prev, [movie.tmdb_id]: reaction }));
      } catch {
         toast.error("Nao foi possivel salvar seu feedback agora.");
      }
   };

   const handleSaveToWatchlist = async (movie: MovieData) => {
      if (!userId || savingWatchlistId === movie.tmdb_id) {
         return;
      }

      if (knownMovieIds.has(movie.tmdb_id)) {
         toast("Esse filme ja esta no seu perfil.");
         return;
      }

      setSavingWatchlistId(movie.tmdb_id);
      try {
         const alreadyExists = await hasUserReview(userId, movie.tmdb_id);
         if (alreadyExists) {
            toast("Esse filme ja foi salvo antes.");
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
         toast.success("Filme salvo na watchlist.");
         refreshRecommendations();
      } catch (error) {
         console.error("Erro ao salvar recomendacao na watchlist:", error);
         toast.error("Nao foi possivel salvar na watchlist.");
      } finally {
         setSavingWatchlistId(null);
      }
   };

   const handleResetRecommendations = async () => {
      try {
         setRefreshing(true);
         await resetFeedback();
         setReactedMovieIds({});
         refreshRecommendations();
         toast.success("Preferencias de recomendacao resetadas.");
      } catch {
         toast.error("Nao foi possivel resetar suas preferencias agora.");
      } finally {
         setRefreshing(false);
      }
   };

   const handleNewRecommendations = async () => {
      if (recommendations.length === 0) {
         return;
      }

      try {
         setRefreshing(true);
         await dislikeMany(recommendations.map((item) => item.movie));
         const nextFlags = recommendations.reduce<Record<number, "dislike">>((acc, item) => {
            acc[item.movie.tmdb_id] = "dislike";
            return acc;
         }, {});
         setReactedMovieIds((prev) => ({ ...prev, ...nextFlags }));
         refreshRecommendations();
         toast.success("Gerando novas recomendacoes...");
      } catch {
         toast.error("Nao foi possivel atualizar as recomendacoes agora.");
      } finally {
         setRefreshing(false);
      }
   };

   if (!userId) {
      return (
         <EmptyState
            title="Entre para ver recomendacoes"
            message="As recomendacoes personalizadas aparecem quando voce estiver logado."
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
            <h1 className={styles.title}>Recomendacoes para voce</h1>
            <p className={styles.subtitle}>
               Sugestoes geradas com base nos filmes que voce ja avaliou e assistiu.
            </p>

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
                  disabled={refreshing || recommendations.length === 0}
               >
                  {refreshing ? "Atualizando..." : "Novas recomendacoes"}
               </button>
            </div>
         </header>

         {loading && (
            <div className={styles.loadingState}>
               <div className="spinner-border" role="status" aria-label="Carregando recomendacoes" />
               <span>Calculando suas proximas escolhas...</span>
            </div>
         )}

         {error && !loading && <div className={styles.errorState}>{error}</div>}

         {!loading && !error && recommendations.length === 0 && (
            <EmptyState
               title="Ainda sem recomendacoes"
               message="Adicione e avalie alguns filmes para melhorar as sugestoes automaticas."
            />
         )}

         {!loading && !error && recommendations.length > 0 && (
            <div className="movie-grid">
               {recommendations.map((recommendation) => (
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
                           Nao curti
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
            title="Resetar perfil de recomendacao"
            message="Tem certeza? Isso vai apagar o feedback salvo e recalcular as sugestoes do zero."
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
            title="Gerar novas recomendacoes"
            message="Isso vai marcar as 4 recomendacoes atuais como nao gostei e carregar 4 novas. Deseja continuar?"
            confirmText="Sim, gerar novas"
            isProcessing={refreshing}
         />
      </section>
   );
}
