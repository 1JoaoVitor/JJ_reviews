import type { FC } from "react";
import { Form, Container } from "react-bootstrap";
import { Clapperboard, HelpCircle } from "lucide-react";
import type { CustomList, MovieData } from "@/types";
import type { DailySourceMode } from "@/features/games/logic/dailyGameLogic";
import { DailyFinalReveal } from "./DailyFinalReveal";
import { DailyGuessesHistory } from "./DailyGuessesHistory";
import { DailyHintsPanel } from "./DailyHintsPanel";
import { DailyRoundControls } from "./DailyRoundControls";
import { DailySummaryPanel } from "./DailySummaryPanel";
import { MAX_LIVES, type DailyMode } from "../logic/dailyMovieGameLogic";
import { useDailyMovieGame } from "../hooks/useDailyMovieGame";
import styles from "../GamesHub.module.css";

interface DailyMovieGameProps {
   title: string;
   onOpenHelp: () => void;
   mode: DailyMode;
   source: DailySourceMode;
   watchedMovies: MovieData[];
   listMovies: MovieData[];
   selectedListId: string;
   setSelectedListId: (value: string) => void;
   lists: CustomList[];
   userId?: string | null;
}

export const DailyMovieGame: FC<DailyMovieGameProps> = ({
   title,
   onOpenHelp,
   mode,
   source,
   watchedMovies,
   listMovies,
   selectedListId,
   setSelectedListId,
   lists,
   userId,
}) => {
   const {
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
   } = useDailyMovieGame({
      mode,
      source,
      watchedMovies,
      listMovies,
      selectedListId,
      lists,
      userId,
   });

   return (
      <Container className={`py-4 py-md-5 ${styles.battleContainer}`}>
      <div className={styles.gameHeaderTitle}>
         <h2 className={styles.gameSecondaryTitle}>
            <Clapperboard size={20} /> {title}
         </h2>
         <button type="button" className={styles.helpBtn} onClick={onOpenHelp}>
            <HelpCircle size={16} /> ?
         </button>
      </div>

      <div className={styles.gamePanel}>

         {source === "list_scope" && (
            <div className={`${styles.inlineFilter} ${styles.inlineFilterSpaced}`}>
               <label htmlFor={`daily-list-${mode}`}>Lista do jogo</label>
               <Form.Select
                  id={`daily-list-${mode}`}
                  className={styles.inlineSelect}
                  value={selectedListId}
                  disabled={lists.length === 0}
                  onChange={(event) => setSelectedListId(event.target.value)}
               >
                  {lists.length === 0 ? (
                     <option value="">Nenhuma lista selecionada</option>
                  ) : (
                     lists.map((list) => (
                        <option key={list.id} value={list.id}>{list.name}</option>
                     ))
                  )}
               </Form.Select>
            </div>
         )}

         <DailyRoundControls
            maxLives={MAX_LIVES}
            lives={lives}
            canUseHint={canUseHint}
            onUseHint={onUseHint}
            onNewGame={onNewGame}
         />

         <DailyHintsPanel revealedHintFields={revealedHintFields} hintValuesByLabel={hintValuesByLabel} />

         {targetLoading && <p className={styles.emptyMsg}>Carregando desafio...</p>}
         {targetError && <p className={styles.errorMsg}>{targetError}</p>}

         {!targetLoading && !targetError && targetMovie && (
            <>
               {mode === "cover" ? (
                  <div className={styles.posterGuessWrap}>
                     {targetMovie.posterPath ? (
                        <>
                           <img
                              src={`https://image.tmdb.org/t/p/${coverReveal.posterSize}${targetMovie.posterPath}`}
                              alt="Poster misterioso"
                              className={styles.dailyPoster}
                              style={{ filter: "saturate(0.72) contrast(0.9)" }}
                           />
                           <div
                              className={styles.revealGrid}
                              style={{
                                 gridTemplateColumns: `repeat(${coverReveal.gridSize}, 1fr)`,
                                 gridTemplateRows: `repeat(${coverReveal.gridSize}, 1fr)`,
                              }}
                           >
                              {[...Array(coverReveal.totalTiles)].map((_, idx) => {
                                 const isRevealed = idx >= coverReveal.totalTiles - coverReveal.revealTiles;
                                 return (
                                    <div
                                       key={idx}
                                       className={`${styles.revealTile} ${isRevealed ? styles.revealTileOff : ""}`}
                                       style={{ backdropFilter: isRevealed ? "blur(0px)" : `blur(${coverReveal.blurPx}px)` }}
                                    />
                                 );
                              })}
                           </div>
                        </>
                     ) : (
                        <div className={styles.noPoster}>Sem poster disponivel para este filme.</div>
                     )}
                  </div>
               ) : (
                  <div className={styles.riddleBox}>
                     <h4 className={styles.riddleTitle}>Enigma</h4>
                     <p className={styles.riddleHint}>
                        Selecione um filme da sugestao e confira os atributos. Ano: amarelo quando estiver dentro de +-5 anos e a seta mostra se o alvo e mais atual ou mais antigo.
                     </p>
                  </div>
               )}

               <div className={`${styles.guessRow} ${mode === "cover" ? styles.guessRowCover : ""}`}>
                  <div className={styles.suggestionWrap}>
                     <input
                        value={guessText}
                        onChange={(event) => {
                           setGuessText(event.target.value);
                           setSelectedGuess(null);
                        }}
                        className={styles.guessInput}
                        placeholder="Digite para buscar (ex: Bacurau)"
                        disabled={isSubmittingGuess || isGameOver}
                     />
                     {isLoadingSuggestions && <div className={styles.suggestionStatus}>Buscando...</div>}
                     {!isLoadingSuggestions && suggestions.length > 0 && (
                        <div className={styles.suggestionList}>
                           {suggestions.map((item) => (
                              <button
                                 key={`${item.id}-${item.title}`}
                                 type="button"
                                 className={styles.suggestionItem}
                                 onClick={() => {
                                    setSelectedGuess(item);
                                    setGuessText(item.title);
                                    clearSuggestions();
                                 }}
                              >
                                 {item.title}
                              </button>
                           ))}
                        </div>
                     )}
                  </div>

                  <button
                     type="button"
                     className={styles.guessBtn}
                     onClick={onSubmitGuess}
                     disabled={isSubmittingGuess || isGameOver || !selectedGuess}
                  >
                     {isSubmittingGuess ? "Conferindo..." : "Confirmar"}
                  </button>
               </div>

               {!selectedGuess && !isGameOver && (
                  <p className={`${styles.selectionHint} ${mode === "cover" ? styles.coverSelectionHint : ""}`}>
                     Selecione uma opcao da lista para validar a escolha.
                  </p>
               )}

               {isWon && <p className={styles.successMsg}>Acertou! O filme era {targetMovie.title}.</p>}
               {!isWon && isGameOver && <p className={styles.errorMsg}>Fim de jogo! O filme era {targetMovie.title}.</p>}

               {isGameOver && <DailyFinalReveal targetMovie={targetMovie} />}

               <DailySummaryPanel summary={summary} />

               <DailyGuessesHistory guesses={guesses} />
            </>
         )}
      </div>
      </Container>
   );
};
