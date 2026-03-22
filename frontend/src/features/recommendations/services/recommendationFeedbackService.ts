import { supabase } from "@/lib/supabase";
import type { RecommendationFeedbackProfile } from "@/features/recommendations/services/recommendationService";

interface RecommendationFeedbackRow {
   user_id: string;
   genre_adjustments: Record<string, unknown> | null;
   disliked_movie_ids: number[] | null;
}

const EMPTY_FEEDBACK: RecommendationFeedbackProfile = {
   genreAdjustments: {},
   dislikedMovieIds: [],
};

function normalizeFeedbackRow(row: RecommendationFeedbackRow | null): RecommendationFeedbackProfile {
   if (!row) {
      return EMPTY_FEEDBACK;
   }

   const genreAdjustments: Record<number, number> = {};
   const rawGenreAdjustments = row.genre_adjustments || {};

   for (const [key, value] of Object.entries(rawGenreAdjustments)) {
      const genreId = Number(key);
      const numeric = typeof value === "number" ? value : Number(value);
      if (!Number.isNaN(genreId) && !Number.isNaN(numeric)) {
         genreAdjustments[genreId] = numeric;
      }
   }

   return {
      genreAdjustments,
      dislikedMovieIds: (row.disliked_movie_ids || []).filter((id) => typeof id === "number"),
   };
}

export async function fetchRecommendationFeedback(userId: string): Promise<RecommendationFeedbackProfile> {
   const { data, error } = await supabase
      .from("recommendation_feedback")
      .select("user_id, genre_adjustments, disliked_movie_ids")
      .eq("user_id", userId)
      .maybeSingle();

   if (error) {
      console.error("Erro ao carregar feedback de recomendacoes:", error);
      return EMPTY_FEEDBACK;
   }

   return normalizeFeedbackRow(data as RecommendationFeedbackRow | null);
}

export async function upsertRecommendationFeedback(
   userId: string,
   profile: RecommendationFeedbackProfile,
): Promise<void> {
   const payload = {
      user_id: userId,
      genre_adjustments: profile.genreAdjustments,
      disliked_movie_ids: profile.dislikedMovieIds,
   };

   const { error } = await supabase
      .from("recommendation_feedback")
      .upsert(payload, { onConflict: "user_id" });

   if (error) {
      throw error;
   }
}
