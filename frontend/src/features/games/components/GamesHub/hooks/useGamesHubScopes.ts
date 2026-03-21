import { useEffect, useMemo, useState } from "react";
import type { CustomList, MovieData } from "@/types";
import { fetchListMovieIds } from "@/features/lists/services/listsService";
import { getDailyBattleTmdbPool } from "@/features/movies/services/tmdbService";
import { getTodayKey } from "../logic/dailyMovieGameLogic";

export type BattleSourceMode = "my_watched" | "list_scope" | "daily_16";

interface UseGamesHubScopesResult {
   watchedAllMovies: MovieData[];
   battlePlayableMovies: MovieData[];
   dailyScopedMovies: MovieData[];
   battleListId: string;
   setBattleListId: (value: string) => void;
   dailyListId: string;
   setDailyListId: (value: string) => void;
   battleDailyLoading: boolean;
   battleScopeError: string | null;
   dailyScopeError: string | null;
}

export function useGamesHubScopes(
   movies: MovieData[],
   lists: CustomList[],
   battleSourceMode: BattleSourceMode
): UseGamesHubScopesResult {
   const [battleListId, setBattleListId] = useState<string>(lists[0]?.id || "");
   const [dailyListId, setDailyListId] = useState<string>(lists[0]?.id || "");

   const [battleListMovieIds, setBattleListMovieIds] = useState<Set<number> | null>(null);
   const [dailyListMovieIds, setDailyListMovieIds] = useState<Set<number> | null>(null);
   const [battleDailyTmdbMovies, setBattleDailyTmdbMovies] = useState<MovieData[]>([]);
   const [battleDailyLoading, setBattleDailyLoading] = useState(false);
   const [battleScopeError, setBattleScopeError] = useState<string | null>(null);
   const [dailyScopeError, setDailyScopeError] = useState<string | null>(null);

   useEffect(() => {
      if (lists.length === 0) {
         setBattleListId("");
         setDailyListId("");
         return;
      }

      if (!lists.some((list) => list.id === battleListId)) {
         setBattleListId(lists[0]?.id || "");
      }

      if (!lists.some((list) => list.id === dailyListId)) {
         setDailyListId(lists[0]?.id || "");
      }
   }, [lists, battleListId, dailyListId]);

   useEffect(() => {
      let ignore = false;

      async function loadBattleListScope() {
         if (!battleListId) {
            setBattleListMovieIds(new Set());
            setBattleScopeError(null);
            return;
         }

         try {
            const ids = await fetchListMovieIds(battleListId);
            if (!ignore) {
               setBattleListMovieIds(new Set(ids));
               setBattleScopeError(null);
            }
         } catch {
            if (!ignore) {
               setBattleScopeError("Nao foi possivel carregar os filmes da lista da batalha.");
               setBattleListMovieIds(new Set());
            }
         }
      }

      void loadBattleListScope();
      return () => {
         ignore = true;
      };
   }, [battleListId]);

   useEffect(() => {
      let ignore = false;

      async function loadDailyListScope() {
         if (!dailyListId) {
            setDailyListMovieIds(new Set());
            setDailyScopeError(null);
            return;
         }

         try {
            const ids = await fetchListMovieIds(dailyListId);
            if (!ignore) {
               setDailyListMovieIds(new Set(ids));
               setDailyScopeError(null);
            }
         } catch {
            if (!ignore) {
               setDailyScopeError("Nao foi possivel carregar os filmes da lista deste jogo.");
               setDailyListMovieIds(new Set());
            }
         }
      }

      void loadDailyListScope();
      return () => {
         ignore = true;
      };
   }, [dailyListId]);

   useEffect(() => {
      let ignore = false;

      async function loadBattleDailyTmdb() {
         if (battleSourceMode !== "daily_16") {
            setBattleDailyTmdbMovies([]);
            return;
         }

         setBattleDailyLoading(true);
         setBattleScopeError(null);

         try {
            const pool = await getDailyBattleTmdbPool(getTodayKey(), 16);
            if (!ignore) {
               setBattleDailyTmdbMovies(pool);
               if (pool.length < 2) {
                  setBattleScopeError("Nao foi possivel montar a rodada diaria do TMDB hoje.");
               }
            }
         } catch {
            if (!ignore) {
               setBattleDailyTmdbMovies([]);
               setBattleScopeError("Falha ao carregar a rodada diaria de 16 via TMDB.");
            }
         } finally {
            if (!ignore) {
               setBattleDailyLoading(false);
            }
         }
      }

      void loadBattleDailyTmdb();
      return () => {
         ignore = true;
      };
   }, [battleSourceMode]);

   const watchedAllMovies = useMemo(
      () => movies.filter((movie) => movie.status === "watched" && movie.rating !== null),
      [movies]
   );

   const battleScopedMovies = useMemo(() => {
      if (!battleListMovieIds) {
         return [] as MovieData[];
      }

      return watchedAllMovies.filter((movie) => battleListMovieIds.has(movie.tmdb_id));
   }, [watchedAllMovies, battleListMovieIds]);

   const dailyScopedMovies = useMemo(() => {
      if (!dailyListMovieIds) {
         return [] as MovieData[];
      }

      return watchedAllMovies.filter((movie) => dailyListMovieIds.has(movie.tmdb_id));
   }, [watchedAllMovies, dailyListMovieIds]);

   const battlePlayableMovies = useMemo(() => {
      if (battleSourceMode === "daily_16") {
         return battleDailyTmdbMovies;
      }

      if (battleSourceMode === "list_scope") {
         return battleScopedMovies;
      }

      return watchedAllMovies;
   }, [battleSourceMode, battleDailyTmdbMovies, battleScopedMovies, watchedAllMovies]);

   return {
      watchedAllMovies,
      battlePlayableMovies,
      dailyScopedMovies,
      battleListId,
      setBattleListId,
      dailyListId,
      setDailyListId,
      battleDailyLoading,
      battleScopeError,
      dailyScopeError,
   };
}
