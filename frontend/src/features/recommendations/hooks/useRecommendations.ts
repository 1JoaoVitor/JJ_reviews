import { useEffect, useMemo, useState } from "react";
import type { MovieData } from "@/types";
import {
   getFavoriteGenreLabels,
   getPersonalizedRecommendations,
   type RecommendationItem,
} from "@/features/recommendations/services/recommendationService";

interface UseRecommendationsResult {
   recommendations: RecommendationItem[];
   favoriteGenres: string[];
   loading: boolean;
   error: string | null;
}

export function useRecommendations(userId: string | null | undefined, movies: MovieData[]): UseRecommendationsResult {
   const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);

   const favoriteGenres = useMemo(() => getFavoriteGenreLabels(movies), [movies]);

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
            const result = await getPersonalizedRecommendations(movies);
            if (!cancelled) {
               setRecommendations(result);
            }
         } catch (err) {
            console.error("Erro ao gerar recomendacoes personalizadas:", err);
            if (!cancelled) {
               setRecommendations([]);
               setError("Nao foi possivel carregar suas recomendacoes agora.");
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
   }, [movies, userId]);

   return {
      recommendations,
      favoriteGenres,
      loading,
      error,
   };
}
