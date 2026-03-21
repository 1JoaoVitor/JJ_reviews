import { useEffect, useMemo, useState } from "react";
import type { CustomList, MovieData } from "@/types";
import {
   buildGuessSummary,
   compareMovieProfiles,
   getCoverRevealState,
   shouldUseTmdbSuggestions,
   type DailySourceMode,
   type GameMovieProfile,
   type GuessResult,
} from "@/features/games/logic/dailyGameLogic";
import {
   finishGameSession,
   persistDailyAttempt,
   startGameSession,
   updateGameSessionProgress,
} from "@/features/games/services/gamePersistenceService";
import { getMovieDetails } from "@/features/movies/services/tmdbService";
import {
   buildDailySeed,
   getListLabel,
   getTodayKey,
   GLOBAL_DAILY_TMDB_IDS,
   MAX_LIVES,
   pickDeterministicMovie,
   toMovieProfileFromApp,
   toMovieProfileFromTmdb,
   type TmdbMovieDetails,
} from "../logic/dailyMovieGameLogic";
import {
   clearDailyGameProgress,
   loadDailyGameProgress,
   saveDailyGameProgress,
} from "../services";
import { type DailyMode } from "../logic";
import { useDailyGuessSuggestions, type GuessSuggestion } from "./useDailyGuessSuggestions";

interface UseDailyMovieGameParams {
   mode: DailyMode;
   source: DailySourceMode;
   watchedMovies: MovieData[];
   listMovies: MovieData[];
   selectedListId: string;
   lists: CustomList[];
   userId?: string | null;
}

export function useDailyMovieGame({
   mode,
   source,
   watchedMovies,
   listMovies,
   selectedListId,
   lists,
   userId,
}: UseDailyMovieGameParams) {
   const [guessText, setGuessText] = useState("");
   const [selectedGuess, setSelectedGuess] = useState<GuessSuggestion | null>(null);
   const [isSubmittingGuess, setIsSubmittingGuess] = useState(false);
   const [lives, setLives] = useState(MAX_LIVES);
   const [guesses, setGuesses] = useState<GuessResult[]>([]);
   const [targetMovie, setTargetMovie] = useState<GameMovieProfile | null>(null);
   const [sessionId, setSessionId] = useState<string | null>(null);
   const [targetLoading, setTargetLoading] = useState(false);
   const [targetError, setTargetError] = useState<string | null>(null);
   const [runId, setRunId] = useState(0);
   const [revealedHintFields, setRevealedHintFields] = useState<string[]>([]);

   const dateKey = getTodayKey();
   const progressStorageKey = useMemo(
      () => `daily-game-progress:${mode}:${source}:${selectedListId}:${dateKey}`,
      [mode, source, selectedListId, dateKey]
   );

   const sourceLabel = useMemo(() => {
      if (source === "global_daily") return "Filme do dia global";
      if (source === "my_watched") return "Meus assistidos";
      const selectedListName = lists.find((list) => list.id === selectedListId)?.name || "Lista selecionada";
      return `Lista: ${selectedListName}`;
   }, [lists, selectedListId, source]);

   const customPool = useMemo(() => {
      if (source === "my_watched") return watchedMovies;
      if (source === "list_scope") return listMovies;
      return watchedMovies;
   }, [source, watchedMovies, listMovies]);

   const {
      suggestions,
      isLoadingSuggestions,
      clearSuggestions,
   } = useDailyGuessSuggestions({
      guessText,
      selectedGuessTitle: selectedGuess?.title,
      customPool,
      source,
   });

   useEffect(() => {
      let ignore = false;

      async function loadTargetMovie() {
         if (runId === 0) {
            const persisted = loadDailyGameProgress(progressStorageKey);

            if (persisted?.dateKey === dateKey && persisted?.targetMovie) {
               if (!ignore) {
                  setTargetError(null);
                  setTargetMovie(persisted.targetMovie);
                  setLives(typeof persisted.lives === "number" ? persisted.lives : MAX_LIVES);
                  setGuesses(Array.isArray(persisted.guesses) ? persisted.guesses : []);
                  setSessionId(persisted.sessionId || null);
                  setRevealedHintFields(Array.isArray(persisted.revealedHintFields) ? persisted.revealedHintFields : []);
                  setGuessText("");
                  setSelectedGuess(null);
                  setTargetLoading(false);
               }
               return;
            }
         }

         setTargetLoading(true);
         setTargetError(null);
         setTargetMovie(null);
         setLives(MAX_LIVES);
         setGuesses([]);
         setGuessText("");
         setSelectedGuess(null);
         setSessionId(null);
         setRevealedHintFields([]);

         try {
            let target: GameMovieProfile | null = null;

            if (source === "global_daily") {
               const dailySeed = buildDailySeed(dateKey, "global", mode);
               const tmdbId = pickDeterministicMovie(GLOBAL_DAILY_TMDB_IDS, dailySeed);

               if (!tmdbId) {
                  if (!ignore) setTargetError("Nao foi possivel gerar o filme do dia global.");
                  return;
               }

               const details = await getMovieDetails(tmdbId);
               if (!details) {
                  if (!ignore) setTargetError("Nao foi possivel carregar os detalhes do filme do dia.");
                  return;
               }

               target = toMovieProfileFromTmdb(details as TmdbMovieDetails);
            } else {
               const scopeKey = source === "my_watched" ? "my_watched" : `list:${selectedListId || "none"}`;
               const dailySeed = buildDailySeed(dateKey, scopeKey, mode);
               const pickedMovie = pickDeterministicMovie(customPool, dailySeed);

               if (!pickedMovie) {
                  if (!ignore) {
                     setTargetError(
                        source === "list_scope"
                           ? "Nao foi possivel gerar o filme do dia desta lista."
                           : "Nao foi possivel gerar o filme do dia com seus assistidos."
                     );
                  }
                  return;
               }

               target = toMovieProfileFromApp(pickedMovie);
            }

            if (!target) {
               if (!ignore) setTargetError("Nao foi possivel preparar o filme do dia.");
               return;
            }

            let createdSessionId: string | null = null;
            if (userId) {
               createdSessionId = await startGameSession({
                  userId,
                  gameType: mode === "cover" ? "daily_cover" : "daily_riddle",
                  sourceMode: source,
                  dateKey,
                  targetTmdbId: target.tmdbId,
                  maxLives: MAX_LIVES,
                  livesLeft: MAX_LIVES,
               });
            }

            if (!ignore) {
               setTargetMovie(target);
               setSessionId(createdSessionId);
               setTargetError(null);
            }
         } catch {
            if (!ignore) {
               setTargetError("Nao foi possivel preparar o desafio diario.");
            }
         } finally {
            if (!ignore) {
               setTargetLoading(false);
            }
         }
      }

      void loadTargetMovie();

      return () => {
         ignore = true;
      };
   }, [runId, progressStorageKey, dateKey, source, mode, selectedListId, customPool, userId]);

   useEffect(() => {
      if (!targetMovie) {
         return;
      }

      saveDailyGameProgress(progressStorageKey, {
         dateKey,
         targetMovie,
         lives,
         guesses,
         sessionId,
         revealedHintFields,
      });
   }, [progressStorageKey, dateKey, targetMovie, lives, guesses, sessionId, revealedHintFields]);

   const isWon = guesses.some((guess) => guess.isCorrect);
   const isGameOver = isWon || lives <= 0;

   const summary = useMemo(() => buildGuessSummary(guesses, lives), [guesses, lives]);
   const correctlySolvedLabels = useMemo(
      () => new Set(summary.fields.filter((field) => field.status === "correct").map((field) => field.label)),
      [summary.fields]
   );

   const hintValuesByLabel = useMemo(() => {
      if (!targetMovie) {
         return {} as Record<string, string>;
      }

      return {
         "Diretor": targetMovie.director || "Nao informado",
         "Ano": targetMovie.releaseYear ? String(targetMovie.releaseYear) : "Nao informado",
         "Genero": getListLabel(targetMovie.genres),
         "Paises": getListLabel(targetMovie.countries),
         "Ator/Atriz principal": getListLabel(targetMovie.cast),
         "Duracao": targetMovie.runtime ? `${targetMovie.runtime} min` : "Nao informada",
      };
   }, [targetMovie]);

   const hintFieldOrder = useMemo(
      () => ["Diretor", "Ano", "Genero", "Paises", "Ator/Atriz principal", "Duracao"],
      []
   );

   const availableHintFields = useMemo(
      () =>
         hintFieldOrder.filter(
            (label) => !correctlySolvedLabels.has(label) && !revealedHintFields.includes(label) && Boolean(hintValuesByLabel[label])
         ),
      [hintFieldOrder, correctlySolvedLabels, revealedHintFields, hintValuesByLabel]
   );

   const canUseHint = lives <= Math.floor(MAX_LIVES / 2) && !isGameOver && availableHintFields.length > 0;

   const coverReveal = useMemo(() => getCoverRevealState(lives, isWon, MAX_LIVES), [lives, isWon]);

   const onSubmitGuess = async () => {
      if (!selectedGuess || !targetMovie || targetLoading || isSubmittingGuess || isGameOver) {
         return;
      }

      setIsSubmittingGuess(true);
      try {
         let guessedProfile: GameMovieProfile | null = null;

         if (selectedGuess.localMovie) {
            guessedProfile = toMovieProfileFromApp(selectedGuess.localMovie);
         } else {
            const details = shouldUseTmdbSuggestions(source) ? await getMovieDetails(selectedGuess.id) : null;
            if (details) {
               guessedProfile = toMovieProfileFromTmdb(details as TmdbMovieDetails);
            }
         }

         if (!guessedProfile) {
            setLives((prev) => Math.max(0, prev - 1));
            setSelectedGuess(null);
            setGuessText("");
            clearSuggestions();
            return;
         }

         const comparison = compareMovieProfiles(guessedProfile, targetMovie);
         const nextAttempts = guesses.length + 1;
         const nextLives = comparison.isCorrect ? lives : Math.max(0, lives - 1);

         setGuesses((prev) => [comparison, ...prev]);
         if (!comparison.isCorrect) {
            setLives(nextLives);
         }

         if (sessionId && userId) {
            await persistDailyAttempt({
               sessionId,
               userId,
               attemptIndex: nextAttempts,
               guessedTmdbId: guessedProfile.tmdbId,
               guessTitle: guessedProfile.title,
               isCorrect: comparison.isCorrect,
               livesAfter: nextLives,
               fields: comparison.fields,
            });

            await updateGameSessionProgress(sessionId, nextLives, nextAttempts);

            if (comparison.isCorrect || nextLives <= 0) {
               await finishGameSession({
                  sessionId,
                  status: comparison.isCorrect ? "won" : "lost",
                  livesLeft: nextLives,
                  attemptsCount: nextAttempts,
                  metadata: {
                     targetTmdbId: targetMovie.tmdbId,
                     won: comparison.isCorrect,
                  },
               });
            }
         }

         setSelectedGuess(null);
         setGuessText("");
         clearSuggestions();
      } finally {
         setIsSubmittingGuess(false);
      }
   };

   const onUseHint = () => {
      if (!canUseHint) {
         return;
      }

      const nextLabel = availableHintFields[0];
      if (!nextLabel) {
         return;
      }

      setRevealedHintFields((prev) => [...prev, nextLabel]);
   };

   const onNewGame = () => {
      clearDailyGameProgress(progressStorageKey);
      setRunId((value) => value + 1);
   };

   return {
      dateKey,
      sourceLabel,
      guessText,
      setGuessText,
      selectedGuess,
      setSelectedGuess,
      suggestions,
      clearSuggestions,
      isLoadingSuggestions,
      isSubmittingGuess,
      lives,
      guesses,
      targetMovie,
      targetLoading,
      targetError,
      revealedHintFields,
      hintValuesByLabel,
      canUseHint,
      isGameOver,
      isWon,
      coverReveal,
      summary,
      onSubmitGuess,
      onUseHint,
      onNewGame,
   };
}