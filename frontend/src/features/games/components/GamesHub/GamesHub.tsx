import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CustomList, MovieData } from "@/types";
import { MovieBattle } from "@/features/battle";
import type { DailySourceMode } from "@/features/games/logic/dailyGameLogic";
import {
   BattleModeConfig,
   DailySourceConfig,
   DailyMovieGame,
   GamesHubHeaderMenu,
   GamesHelpModal,
} from "./components";
import { useGamesHubScopes, type BattleSourceMode } from "./hooks/useGamesHubScopes";
import { GAME_HELP_MAP, type GameId } from "./logic/gameHelpContent";
import { getTodayKey, formatTodayKeyDDMMYYYY } from "./logic/dailyMovieGameLogic";
import styles from "./GamesHub.module.css";

interface GamesHubProps {
   movies: MovieData[];
   lists: CustomList[];
   userId?: string | null;
   initialGame?: GameId;
}

export function GamesHub({ movies, lists, userId, initialGame = "menu" }: GamesHubProps) {
   const navigate = useNavigate();
   const [activeGame, setActiveGame] = useState<GameId>(initialGame);
   const [dailySourceMode, setDailySourceMode] = useState<DailySourceMode>("global_daily");
   const [battleSourceMode, setBattleSourceMode] = useState<BattleSourceMode>("my_watched");
   const [battleHelpOpen, setBattleHelpOpen] = useState(false);
   const [dailyHelpOpen, setDailyHelpOpen] = useState(false);

   const {
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
   } = useGamesHubScopes(movies, lists, battleSourceMode);

   const headerHelp = activeGame !== "menu" ? GAME_HELP_MAP[activeGame as Exclude<GameId, "menu">] : null;
   const isHelpOpen = activeGame === "battle" ? battleHelpOpen : dailyHelpOpen;

   return (
      <section className={styles.page}>
         <div className={styles.container}>
            <GamesHubHeaderMenu
               activeGame={activeGame}
               onBackHome={() => navigate("/")}
               onBackToMenu={() => setActiveGame("menu")}
               onSelectGame={(gameId) => setActiveGame(gameId)}
            />

            {activeGame === "battle" && (
               <>
                  <BattleModeConfig
                     battleSourceMode={battleSourceMode}
                     setBattleSourceMode={setBattleSourceMode}
                     battleListId={battleListId}
                     setBattleListId={setBattleListId}
                     lists={lists}
                     battlePlayableMovies={battlePlayableMovies}
                     battleDailyLoading={battleDailyLoading}
                     battleScopeError={battleScopeError}
                  />

                  <MovieBattle
                     allMovies={battlePlayableMovies}
                     userId={userId || undefined}
                     onOpenHelp={() => setBattleHelpOpen(true)}
                     presetMode={battleSourceMode === "daily_16" ? {
                        criteria: "random",
                        quantity: 16,
                        hideSetup: true,
                        label: `Rodada diaria TMDB (${formatTodayKeyDDMMYYYY(getTodayKey())})`,
                     } : undefined}
                  />
               </>
            )}

            {activeGame === "daily_cover" && (
               <>
                  <DailySourceConfig
                     dailySourceMode={dailySourceMode}
                     setDailySourceMode={setDailySourceMode}
                     dailyScopeError={dailyScopeError}
                  />
                  <DailyMovieGame
                     key={`daily-cover-${dailySourceMode}-${dailyListId}`}
                     title="Filme do Dia (Capa)"
                     onOpenHelp={() => setDailyHelpOpen(true)}
                     mode="cover"
                     source={dailySourceMode}
                     watchedMovies={watchedAllMovies}
                     listMovies={dailyScopedMovies}
                     selectedListId={dailyListId}
                     setSelectedListId={setDailyListId}
                     lists={lists}
                     userId={userId}
                  />
               </>
            )}

            {activeGame === "daily_riddle" && (
               <>
                  <DailySourceConfig
                     dailySourceMode={dailySourceMode}
                     setDailySourceMode={setDailySourceMode}
                     dailyScopeError={dailyScopeError}
                  />
                  <DailyMovieGame
                     key={`daily-riddle-${dailySourceMode}-${dailyListId}`}
                     title="Filme do Dia (Enigma)"
                     onOpenHelp={() => setDailyHelpOpen(true)}
                     mode="riddle"
                     source={dailySourceMode}
                     watchedMovies={watchedAllMovies}
                     listMovies={dailyScopedMovies}
                     selectedListId={dailyListId}
                     setSelectedListId={setDailyListId}
                     lists={lists}
                     userId={userId}
                  />
               </>
            )}
         </div>

         <GamesHelpModal open={isHelpOpen} onClose={() => {
            if (activeGame === "battle") {
               setBattleHelpOpen(false);
            } else {
               setDailyHelpOpen(false);
            }
         }} help={headerHelp} />
      </section>
   );
}
