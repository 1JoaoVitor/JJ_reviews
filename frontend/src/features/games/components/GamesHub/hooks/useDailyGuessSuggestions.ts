import { useEffect, useState } from "react";
import type { MovieData } from "@/types";
import type { DailySourceMode } from "@/features/games/logic/dailyGameLogic";
import { shouldUseTmdbSuggestions } from "@/features/games/logic/dailyGameLogic";
import { searchMovies } from "@/features/movies/services/tmdbService";
import { normalizeText, type TmdbSearchMovieResult } from "../logic/dailyMovieGameLogic";

export interface GuessSuggestion {
   id: number;
   title: string;
   localMovie?: MovieData;
}

interface UseDailyGuessSuggestionsParams {
   guessText: string;
   selectedGuessTitle?: string;
   customPool: MovieData[];
   source: DailySourceMode;
}

export function useDailyGuessSuggestions({
   guessText,
   selectedGuessTitle,
   customPool,
   source,
}: UseDailyGuessSuggestionsParams) {
   const [suggestions, setSuggestions] = useState<GuessSuggestion[]>([]);
   const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

   useEffect(() => {
      let ignore = false;

      async function loadSuggestions() {
         const query = guessText.trim();
         if (query.length < 2 || selectedGuessTitle === guessText) {
            setSuggestions([]);
            return;
         }

         setIsLoadingSuggestions(true);

         try {
            const local = customPool
               .filter((movie) => normalizeText(movie.title).includes(normalizeText(query)))
               .slice(0, 5)
               .map((movie) => ({
                  id: movie.tmdb_id,
                  title: movie.title || "Sem titulo",
                  localMovie: movie,
               }));

            const tmdb = shouldUseTmdbSuggestions(source)
               ? (((await searchMovies(query)) as TmdbSearchMovieResult[]) || []).slice(0, 6).map((item) => ({
                  id: item.id,
                  title: item.title || "Sem titulo",
               }))
               : [];

            const merged = [...local, ...tmdb].filter((item, index, arr) => {
               const key = normalizeText(item.title);
               return arr.findIndex((other) => normalizeText(other.title) === key) === index;
            }).slice(0, 8);

            if (!ignore) {
               setSuggestions(merged);
            }
         } finally {
            if (!ignore) {
               setIsLoadingSuggestions(false);
            }
         }
      }

      const timer = setTimeout(() => {
         void loadSuggestions();
      }, 220);

      return () => {
         ignore = true;
         clearTimeout(timer);
      };
   }, [guessText, customPool, selectedGuessTitle, source]);

   return {
      suggestions,
      isLoadingSuggestions,
      clearSuggestions: () => setSuggestions([]),
   };
}
