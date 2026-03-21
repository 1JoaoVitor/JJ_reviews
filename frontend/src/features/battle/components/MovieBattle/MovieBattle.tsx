import { useState, useMemo, useEffect } from "react";
import { Container, Form, Row, Col, ProgressBar } from "react-bootstrap";
import { Gamepad2, Trophy } from "lucide-react";
import confetti from "canvas-confetti";
import toast from "react-hot-toast";

import type { MovieData } from "@/types";
import styles from "./MovieBattle.module.css";
import {
   finishGameSession,
   persistBattleMatch,
   startGameSession,
   updateGameSessionProgress,
} from "@/features/games/services/gamePersistenceService";

import { 
   type SelectionCriteria, 
   filterMoviesByCriteria, 
   setupTournament, 
   nextPowerOfTwo,
   shuffleArray
} from "../../logic/battleOperations";

interface MovieBattleProps {
   allMovies: MovieData[];
   onExit: () => void;
   userId?: string;
   presetMode?: {
      criteria: SelectionCriteria;
      quantity: number;
      hideSetup?: boolean;
      label?: string;
   };
}

type BattleStage = "setup" | "battle" | "winner";

export function MovieBattle({ allMovies, onExit, userId, presetMode }: MovieBattleProps) {
   const [stage, setStage] = useState<BattleStage>("setup");
   const [quantity, setQuantity] = useState(8);
   const [criteria, setCriteria] = useState<SelectionCriteria>("random");

   const [currentRoundMovies, setCurrentRoundMovies] = useState<MovieData[]>([]);
   const [nextRoundMovies, setNextRoundMovies] = useState<MovieData[]>([]);
   const [pairIndex, setPairIndex] = useState(0);
   const [champion, setChampion] = useState<MovieData | null>(null);
   const [totalBracketSize, setTotalBracketSize] = useState(0);
   const [sessionId, setSessionId] = useState<string | null>(null);
   const [hasRestoredState, setHasRestoredState] = useState(false);

   const progressStorageKey = useMemo(() => {
      const presetKey = presetMode?.hideSetup ? "daily16" : "custom";
      const labelKey = (presetMode?.label || "default")
         .toLowerCase()
         .replace(/\s+/g, "-")
         .replace(/[^a-z0-9-]/g, "");
      return `battle-progress:${presetKey}:${labelKey}`;
   }, [presetMode?.hideSetup, presetMode?.label]);

   const availableMovies = useMemo(() => 
      filterMoviesByCriteria(allMovies, criteria), 
   [allMovies, criteria]);

   useEffect(() => {
      if (hasRestoredState) {
         return;
      }

      try {
         const raw = window.sessionStorage.getItem(progressStorageKey);
         if (!raw) {
            setHasRestoredState(true);
            return;
         }

         const persisted = JSON.parse(raw) as {
            stage: BattleStage;
            quantity: number;
            criteria: SelectionCriteria;
            currentRoundMovies: MovieData[];
            nextRoundMovies: MovieData[];
            pairIndex: number;
            champion: MovieData | null;
            totalBracketSize: number;
            sessionId: string | null;
         };

         if (persisted && persisted.stage) {
            setStage(persisted.stage);
            setQuantity(typeof persisted.quantity === "number" ? persisted.quantity : 8);
            setCriteria(persisted.criteria || "random");
            setCurrentRoundMovies(Array.isArray(persisted.currentRoundMovies) ? persisted.currentRoundMovies : []);
            setNextRoundMovies(Array.isArray(persisted.nextRoundMovies) ? persisted.nextRoundMovies : []);
            setPairIndex(typeof persisted.pairIndex === "number" ? persisted.pairIndex : 0);
            setChampion(persisted.champion || null);
            setTotalBracketSize(typeof persisted.totalBracketSize === "number" ? persisted.totalBracketSize : 0);
            setSessionId(persisted.sessionId || null);
         }
      } catch {
         window.sessionStorage.removeItem(progressStorageKey);
      } finally {
         setHasRestoredState(true);
      }
   }, [progressStorageKey, hasRestoredState]);

   useEffect(() => {
      if (!hasRestoredState) {
         return;
      }

      try {
         window.sessionStorage.setItem(
            progressStorageKey,
            JSON.stringify({
               stage,
               quantity,
               criteria,
               currentRoundMovies,
               nextRoundMovies,
               pairIndex,
               champion,
               totalBracketSize,
               sessionId,
            })
         );
      } catch {
         // Ignore sessionStorage quota/serialization failures.
      }
   }, [
      progressStorageKey,
      hasRestoredState,
      stage,
      quantity,
      criteria,
      currentRoundMovies,
      nextRoundMovies,
      pairIndex,
      champion,
      totalBracketSize,
      sessionId,
   ]);

   const handleCriteriaChange = (newCriteria: SelectionCriteria) => {
      const newList = filterMoviesByCriteria(allMovies, newCriteria);
      const maxPossible = nextPowerOfTwo(newList.length);
      setCriteria(newCriteria);
      if (quantity !== -1 && quantity > maxPossible) {
         setQuantity(maxPossible < 4 ? 4 : maxPossible);
      }
   };

   const preloadImages = (movies: MovieData[]) => {
      movies.forEach((movie) => {
         if (movie.poster_path) {
            const img = new Image();
            img.src = `https://image.tmdb.org/t/p/w780${movie.poster_path}`;
         }
      });
   };

   const handleStart = async (forcedCriteria?: SelectionCriteria, forcedQuantity?: number) => {
      try {
         const startCriteria = forcedCriteria || criteria;
         const startQuantity = forcedQuantity ?? quantity;
         const sourcePool = filterMoviesByCriteria(allMovies, startCriteria);
         const { fighters, byes, bracketSize } = setupTournament(sourcePool, startCriteria, startQuantity);

         preloadImages([...fighters, ...byes]);

         setCurrentRoundMovies(fighters);
         setNextRoundMovies(byes);
         setTotalBracketSize(bracketSize);
         setPairIndex(0);
         setChampion(null);
         setStage("battle");

         if (userId) {
            const createdSessionId = await startGameSession({
               userId,
               gameType: "battle",
               sourceMode: presetMode?.hideSetup ? "daily_16" : "custom",
               dateKey: new Date().toISOString().slice(0, 10),
               metadata: {
                  criteria: startCriteria,
                  quantity: startQuantity,
                  availableMovies: sourcePool.length,
                  presetLabel: presetMode?.label,
               },
            });
            setSessionId(createdSessionId);
         }
      } catch (error) {
         if (error instanceof Error) toast.error(error.message);
      }
   };

   const handleVote = async (winner: MovieData) => {
      const movieA = currentRoundMovies[pairIndex];
      const movieB = currentRoundMovies[pairIndex + 1];
      const currentMatchNum = pairIndex / 2 + 1;

      const newNextRound = [...nextRoundMovies, winner];
      setNextRoundMovies(newNextRound);

      if (sessionId && userId && movieA && movieB) {
         await persistBattleMatch({
            sessionId,
            userId,
            roundSize: totalBracketSize,
            matchIndex: currentMatchNum,
            movieATmdbId: movieA.tmdb_id,
            movieBTmdbId: movieB.tmdb_id,
            winnerTmdbId: winner.tmdb_id,
         });
      }

      if (pairIndex + 2 >= currentRoundMovies.length) {
         if (newNextRound.length === 1) {
            setChampion(newNextRound[0]);
            setStage("winner");
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });

            if (sessionId) {
               await finishGameSession({
                  sessionId,
                  status: "won",
                  attemptsCount: totalMatchesInRound,
                  metadata: {
                     championTmdbId: newNextRound[0]?.tmdb_id,
                     championTitle: newNextRound[0]?.title,
                  },
               });
            }
         } else {
            setCurrentRoundMovies(shuffleArray(newNextRound));
            setNextRoundMovies([]);
            setPairIndex(0);
            setTotalBracketSize((prev) => prev / 2);

            if (sessionId) {
               await updateGameSessionProgress(sessionId, 0, currentMatchNum);
            }
         }
      } else {
         setPairIndex(pairIndex + 2);

         if (sessionId) {
            await updateGameSessionProgress(sessionId, 0, currentMatchNum);
         }
      }
   };

   const handleExit = async () => {
      window.sessionStorage.removeItem(progressStorageKey);

      if (sessionId && stage === "battle") {
         await finishGameSession({
            sessionId,
            status: "abandoned",
            attemptsCount: pairIndex / 2,
            metadata: { reason: "exit_button" },
         });
      }
      onExit();
   };

   const getRoundTitle = () => {
      if (totalBracketSize === 2) return "Grande Final";
      if (totalBracketSize === 4) return "Semifinais";
      if (totalBracketSize === 8) return "Quartas de Final";
      if (totalBracketSize === 16) return "Oitavas de Final";
      if (totalBracketSize === 32) return "Rodada de 32";
      if (totalBracketSize === 64) return "Rodada de 64";
      return `Rodada de ${totalBracketSize}`;
   };

   const movieA = currentRoundMovies[pairIndex];

   const handleReplay = () => {
      window.sessionStorage.removeItem(progressStorageKey);
      setSessionId(null);
      setStage("setup");
      setCurrentRoundMovies([]);
      setNextRoundMovies([]);
      setPairIndex(0);
      setChampion(null);
      setTotalBracketSize(0);
   };
   const movieB = currentRoundMovies[pairIndex + 1];
   const totalMatchesInRound = currentRoundMovies.length / 2;
   const currentMatchNum = pairIndex / 2 + 1;
   const progress = (currentMatchNum / totalMatchesInRound) * 100;
   const byesWaiting = nextRoundMovies.length;

   return (
      <Container className={`py-4 py-md-5 ${styles.battleContainer}`}>
         <div className={styles.header}>
            <h4 className={styles.headerTitle}>
               <Gamepad2 size={20} /> Modo Batalha
            </h4>
            <button className={styles.exitBtn} onClick={() => void handleExit()}>
               Sair
            </button>
         </div>

         {/* Setup */}
         {stage === "setup" && (
            <div className={styles.setupCard}>
               <h2 className={styles.setupTitle}>{presetMode?.hideSetup ? (presetMode.label || "Rodada diária") : "Configurar Torneio"}</h2>

               {presetMode?.hideSetup ? (
                  <div className="text-center">
                     <div className={styles.availableCount}>
                        Disponíveis: <strong>{allMovies.length}</strong> filmes
                     </div>
                     <div className="text-center mt-4">
                        <button
                           className={styles.startBtn}
                           onClick={() => void handleStart(presetMode.criteria, presetMode.quantity)}
                           disabled={allMovies.length < 2}
                           type="button"
                        >
                           INICIAR COMBATE
                        </button>
                     </div>
                  </div>
               ) : (
                  <Form>
                     <Row className="g-4">
                        <Col md={6}>
                           <div className={styles.sectionLabel}>Critério</div>
                           <div className="d-flex flex-column gap-2">
                              <Form.Check type="radio" label="Aleatório" checked={criteria === "random"} onChange={() => handleCriteriaChange("random")} />
                              <Form.Check type="radio" label="Melhores Notas" checked={criteria === "top_rated"} onChange={() => handleCriteriaChange("top_rated")} />
                              <Form.Check type="radio" label="Piores Notas" checked={criteria === "worst_rated"} onChange={() => handleCriteriaChange("worst_rated")} />
                              <Form.Check type="radio" label="Mais Recentes" checked={criteria === "recent"} onChange={() => handleCriteriaChange("recent")} />
                              <div className={styles.criteriaDivider} />
                              <Form.Check type="radio" label="Indicados Oscar 2026" checked={criteria === "oscar"} onChange={() => handleCriteriaChange("oscar")} className="fw-bold" />
                              <Form.Check type="radio" label="Nacionais" checked={criteria === "national"} onChange={() => handleCriteriaChange("national")} className="fw-bold" />
                           </div>
                           <div className={styles.availableCount}>
                              Disponíveis: <strong>{availableMovies.length}</strong>
                           </div>
                        </Col>

                        <Col md={6}>
                           <div className={styles.sectionLabel}>Tamanho do Torneio</div>
                           <div className="d-grid gap-2">
                              <button
                                 type="button"
                                 className={`${styles.sizeBtn} ${quantity === -1 ? styles.sizeBtnActive : ""}`}
                                 onClick={() => setQuantity(-1)}
                              >
                                 Todos os Filmes ({availableMovies.length})
                              </button>
                              {[4, 8, 16, 32, 64].map((qtd) => {
                                 const maxBracket = nextPowerOfTwo(availableMovies.length);
                                 const isDisabled = qtd > maxBracket;
                                 if (qtd > maxBracket * 2) return null;
                                 return (
                                    <button
                                       key={qtd}
                                       type="button"
                                       className={`${styles.sizeBtn} ${quantity === qtd ? styles.sizeBtnActive : ""} ${isDisabled ? styles.disabledButton : ""}`}
                                       onClick={() => setQuantity(qtd)}
                                       disabled={isDisabled}
                                    >
                                       {qtd} Filmes
                                    </button>
                                 );
                              })}
                           </div>
                           {quantity !== -1 && quantity > availableMovies.length && (
                              <div className={styles.byesHint}>
                                 *Será completado com <strong>{quantity - availableMovies.length}</strong> folgas (byes).
                              </div>
                           )}
                        </Col>
                     </Row>

                     <div className="text-center mt-5">
                        <button
                           className={styles.startBtn}
                           onClick={() => void handleStart()}
                           disabled={availableMovies.length < 2}
                           type="button"
                        >
                           INICIAR COMBATE
                        </button>
                     </div>
                  </Form>
               )}
            </div>
         )}

         {/* Battle */}
         {stage === "battle" && movieA && movieB && (
            <div>
               <div className="text-center mb-4">
                  {presetMode?.hideSetup && presetMode.label && (
                     <div className={styles.waitingHint}>{presetMode.label}</div>
                  )}
                  <span className={styles.roundBadge}>{getRoundTitle()}</span>
                  {byesWaiting > 0 && currentRoundMovies.length > 0 && (
                     <div className={styles.waitingHint}>
                        (+{byesWaiting} filmes aguardando na próxima fase)
                     </div>
                  )}
                  <h5 className={styles.duelInfo}>
                     Duelo {currentMatchNum} de {totalMatchesInRound}
                  </h5>
                  <ProgressBar now={progress} variant="warning" className={styles.progressBar} />
               </div>

               <Row className="align-items-center g-4">
                  <Col xs={12} md={5}>
                     <BattleCard movie={movieA} onClick={() => handleVote(movieA)} />
                  </Col>
                  <Col xs={12} md={2} className="text-center">
                     <div className={styles.vsText}>VS</div>
                  </Col>
                  <Col xs={12} md={5}>
                     <BattleCard movie={movieB} onClick={() => handleVote(movieB)} />
                  </Col>
               </Row>
            </div>
         )}

         {/* Winner */}
         {stage === "winner" && champion && (
            <div className="text-center">
               <h1 className={styles.winnerTitle}>
                  <Trophy size={32} color="var(--gold)" /> GRANDE CAMPEÃO
               </h1>
               <div className="d-flex justify-content-center mb-4">
                  <img
                     src={`https://image.tmdb.org/t/p/w500${champion.poster_path}`}
                     alt={champion.title}
                     className={styles.championImage}
                  />
               </div>
               <h2 className={`fw-bold ${styles.championName}`}>{champion.title}</h2>
               <p className={styles.championInfo}>
                  {champion.release_date?.split("-")[0]} &middot; Dir. {champion.director}
               </p>
               <button className={styles.replayBtn} onClick={handleReplay}>
                  Jogar Novamente
               </button>
            </div>
         )}
      </Container>
   );
}

function BattleCard({ movie, onClick }: { movie: MovieData; onClick: () => void }) {
   return (
      <div
         className={styles.battleCard}
         onClick={onClick}
         role="button"
         tabIndex={0}
         onKeyDown={(e) => e.key === "Enter" && onClick()}
      >
         <div className={styles.battlePosterContainer}>
            {movie.poster_path ? (
               <img
                  src={`https://image.tmdb.org/t/p/w780${movie.poster_path}`}
                  alt={movie.title}
                  className={styles.battlePosterImage}
               />
            ) : (
               <div className={styles.noImageText}>
                  Sem Imagem
               </div>
            )}
            <div className={`position-absolute bottom-0 start-0 w-100 p-3 ${styles.battleGradient}`}>
               <h5 className={`text-truncate ${styles.battleTitle}`}>{movie.title}</h5>
               <small className={styles.battleRating}>Nota Original: {movie.rating}</small>
            </div>
         </div>
      </div>
   );
}