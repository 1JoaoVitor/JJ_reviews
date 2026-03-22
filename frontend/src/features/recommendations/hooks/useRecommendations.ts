import { useEffect, useMemo, useState } from "react";
import type { MovieData } from "@/types";
import {
   getFavoriteGenreLabels,
   getGenreIdFromLabel,
   getPersonalizedRecommendations,
   type RecommendationFeedbackProfile,
   type RecommendationItem,
} from "@/features/recommendations/services/recommendationService";
import {
   fetchRecommendationFeedback,
   upsertRecommendationFeedback,
} from "@/features/recommendations/services/recommendationFeedbackService";

export type RecommendationReaction = "like" | "dislike" | "watchlist";

interface StoredFeedback {
   genreAdjustments: Record<number, number>;
   dislikedMovieIds: number[];
}

interface UseRecommendationsResult {
   recommendations: RecommendationItem[];
   favoriteGenres: string[];
   loading: boolean;
   error: string | null;
   registerReaction: (movie: MovieData, reaction: RecommendationReaction) => Promise<void>;
   dislikeMany: (moviesToDislike: MovieData[]) => Promise<void>;
   resetFeedback: () => Promise<void>;
   refreshRecommendations: () => void;
}

function updateFeedbackByMovie(movie: MovieData, feedback: StoredFeedback, reaction: RecommendationReaction): StoredFeedback {
   const next: StoredFeedback = {
      genreAdjustments: { ...feedback.genreAdjustments },
      dislikedMovieIds: [...feedback.dislikedMovieIds],
   };

   const delta = reaction === "dislike" ? -2 : 2;

   for (const genreName of movie.genres || []) {
      const genreId = getGenreIdFromLabel(genreName);
      if (!genreId) {
         continue;
      }

      next.genreAdjustments[genreId] = (next.genreAdjustments[genreId] || 0) + delta;
   }

   if (reaction === "dislike") {
      if (!next.dislikedMovieIds.includes(movie.tmdb_id)) {
         next.dislikedMovieIds.push(movie.tmdb_id);
      }
   } else {
      next.dislikedMovieIds = next.dislikedMovieIds.filter((id) => id !== movie.tmdb_id);
   }

   return next;
}

export function useRecommendations(userId: string | null | undefined, movies: MovieData[]): UseRecommendationsResult {
   const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [feedbackVersion, setFeedbackVersion] = useState(0);
   const [feedbackProfile, setFeedbackProfile] = useState<RecommendationFeedbackProfile>({
      genreAdjustments: {},
      dislikedMovieIds: [],
   });

   useEffect(() => {
      let cancelled = false;

      const load = async () => {
         if (!userId) {
            if (!cancelled) {
               setFeedbackProfile({ genreAdjustments: {}, dislikedMovieIds: [] });
            }
            return;
         }

         const feedback = await fetchRecommendationFeedback(userId);
         if (!cancelled) {
            setFeedbackProfile(feedback);
         }
      };

      load();

      return () => {
         cancelled = true;
      };
   }, [feedbackVersion, userId]);

   const favoriteGenres = useMemo(() => getFavoriteGenreLabels(movies, feedbackProfile), [feedbackProfile, movies]);

   useEffect(() => {
      let cancelled = false;

      const run = async () => {
         if (!userId) {
            setRecommendations([]);
            setError(null);
            setLoading(false);
            return;
         }

         setLoading(true);
         setError(null);

         try {
            const result = await getPersonalizedRecommendations(movies, 12, feedbackProfile);
            if (!cancelled) {
               setRecommendations(result);
            }
         } catch (err) {
            console.error("Erro ao gerar recomendações personalizadas:", err);
            if (!cancelled) {
               setRecommendations([]);
               setError("Não foi possível carregar suas recomendações agora.");
            }
         } finally {
            if (!cancelled) {
               setLoading(false);
            }
         }
      };

      run();

      return () => {
         cancelled = true;
      };
   }, [feedbackProfile, movies, userId]);

   const registerReaction = async (movie: MovieData, reaction: RecommendationReaction) => {
      if (!userId) {
         return;
      }

      const current: StoredFeedback = {
         genreAdjustments: feedbackProfile.genreAdjustments,
         dislikedMovieIds: feedbackProfile.dislikedMovieIds,
      };

      const next = updateFeedbackByMovie(movie, current, reaction);
      setFeedbackProfile({
         genreAdjustments: next.genreAdjustments,
         dislikedMovieIds: next.dislikedMovieIds,
      });

      try {
         await upsertRecommendationFeedback(userId, {
            genreAdjustments: next.genreAdjustments,
            dislikedMovieIds: next.dislikedMovieIds,
         });
         setFeedbackVersion((prev) => prev + 1);
      } catch (error) {
         console.error("Erro ao persistir feedback de recomendação:", error);
         setFeedbackVersion((prev) => prev + 1);
         throw error;
      }
   };

   const dislikeMany = async (moviesToDislike: MovieData[]) => {
      if (!userId || moviesToDislike.length === 0) {
         return;
      }

      let next: StoredFeedback = {
         genreAdjustments: { ...feedbackProfile.genreAdjustments },
         dislikedMovieIds: [...feedbackProfile.dislikedMovieIds],
      };

      for (const movie of moviesToDislike) {
         next = updateFeedbackByMovie(movie, next, "dislike");
      }

      setFeedbackProfile({
         genreAdjustments: next.genreAdjustments,
         dislikedMovieIds: next.dislikedMovieIds,
      });

      await upsertRecommendationFeedback(userId, {
         genreAdjustments: next.genreAdjustments,
         dislikedMovieIds: next.dislikedMovieIds,
      });
      setFeedbackVersion((prev) => prev + 1);
   };

   const resetFeedback = async () => {
      if (!userId) {
         return;
      }

      const cleared: RecommendationFeedbackProfile = {
         genreAdjustments: {},
         dislikedMovieIds: [],
      };

      setFeedbackProfile(cleared);
      await upsertRecommendationFeedback(userId, cleared);
      setFeedbackVersion((prev) => prev + 1);
   };

   const refreshRecommendations = () => {
      setFeedbackVersion((prev) => prev + 1);
   };

   return {
      recommendations,
      favoriteGenres,
      loading,
      error,
      registerReaction,
      dislikeMany,
      resetFeedback,
      refreshRecommendations,
   };
}
