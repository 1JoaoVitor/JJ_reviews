import { useState } from "react";
import { Container, Form, Row, Col, ProgressBar } from "react-bootstrap";
import { Swords, Trophy } from "lucide-react";
import type { MovieData } from "@/types";
import confetti from "canvas-confetti";
import toast from "react-hot-toast";
import styles from "./MovieBattle.module.css";

interface MovieBattleProps {
   allMovies: MovieData[];
   onExit: () => void;
}

type BattleStage = "setup" | "battle" | "winner";
type SelectionCriteria =
   | "random"
   | "top_rated"
   | "worst_rated"
   | "recent"
   | "oscar"
   | "national";

export function MovieBattle({ allMovies, onExit }: MovieBattleProps) {
   const [stage, setStage] = useState<BattleStage>("setup");
   const [quantity, setQuantity] = useState(8);
   const [criteria, setCriteria] = useState<SelectionCriteria>("random");

   const [currentRoundMovies, setCurrentRoundMovies] = useState<MovieData[]>([]);
   const [nextRoundMovies, setNextRoundMovies] = useState<MovieData[]>([]);
   const [pairIndex, setPairIndex] = useState(0);
   const [champion, setChampion] = useState<MovieData | null>(null);
   const [totalBracketSize, setTotalBracketSize] = useState(0);

   const watchedMovies = allMovies.filter(
      (m) => m.status === "watched" && m.rating !== null,
   );

   const nextPowerOfTwo = (n: number) => {
      if (n === 0) return 0;
      return Math.pow(2, Math.ceil(Math.log2(n)));
   };

   const getFilteredMovies = (targetCriteria: SelectionCriteria) => {
      switch (targetCriteria) {
         case "oscar":
            return watchedMovies.filter((m) => m.isOscar);
         case "national":
            return watchedMovies.filter((m) => m.isNational);
         case "top_rated":
         case "worst_rated":
         case "recent":
         case "random":
         default:
            return watchedMovies;
      }
   };

   const availableMovies = getFilteredMovies(criteria);

   const handleCriteriaChange = (newCriteria: SelectionCriteria) => {
      const newList = getFilteredMovies(newCriteria);
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

   const handleStart = () => {
      const availableCount = availableMovies.length;
      if (availableCount < 2) {
         toast.error("Você precisa de pelo menos 2 filmes para uma batalha.");
         return;
      }

      let targetCount = quantity;
      if (quantity === -1) {
         targetCount = availableCount;
      } else {
         targetCount = Math.min(quantity, availableCount);
      }

      const selected = [...availableMovies];
      switch (criteria) {
         case "top_rated":
            selected.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            break;
         case "worst_rated":
            selected.sort((a, b) => (a.rating || 0) - (b.rating || 0));
            break;
         case "recent":
            selected.sort((a, b) => b.id - a.id);
            break;
         default:
            selected.sort(() => Math.random() - 0.5);
            break;
      }

      const participants = selected.slice(0, targetCount);
      const bracketSize = nextPowerOfTwo(participants.length);
      const byesCount = bracketSize - participants.length;
      const fightersCount = participants.length - byesCount;

      if (criteria !== "random") {
         participants.sort(() => Math.random() - 0.5);
      }

      const fighters = participants.slice(0, fightersCount);
      const byes = participants.slice(fightersCount);

      preloadImages(participants);

      setCurrentRoundMovies(fighters);
      setNextRoundMovies(byes);
      setTotalBracketSize(bracketSize);
      setPairIndex(0);
      setStage("battle");
   };

   const handleVote = (winner: MovieData) => {
      const newNextRound = [...nextRoundMovies, winner];
      setNextRoundMovies(newNextRound);

      if (pairIndex + 2 >= currentRoundMovies.length) {
         if (newNextRound.length === 1) {
            setChampion(newNextRound[0]);
            setStage("winner");
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
         } else {
            const shuffledNext = newNextRound.sort(() => Math.random() - 0.5);
            setCurrentRoundMovies(shuffledNext);
            setNextRoundMovies([]);
            setPairIndex(0);
            setTotalBracketSize((prev) => prev / 2);
         }
      } else {
         setPairIndex(pairIndex + 2);
      }
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
   const movieB = currentRoundMovies[pairIndex + 1];
   const totalMatchesInRound = currentRoundMovies.length / 2;
   const currentMatchNum = pairIndex / 2 + 1;
   const progress = (currentMatchNum / totalMatchesInRound) * 100;
   const byesWaiting = nextRoundMovies.length;

   return (
      <Container className={`py-4 py-md-5 ${styles.battleContainer}`}>
         <div className={styles.header}>
            <h4 className={styles.headerTitle}>
               <Swords size={20} /> Modo Batalha
            </h4>
            <button className={styles.exitBtn} onClick={onExit}>
               Sair
            </button>
         </div>

         {/* Setup */}
         {stage === "setup" && (
            <div className={styles.setupCard}>
               <h2 className={styles.setupTitle}>Configurar Torneio</h2>

               <Form>
                  <Row className="g-4">
                     <Col md={6}>
                        <div className={styles.sectionLabel}>Critério</div>
                        <div className="d-flex flex-column gap-2">
                           <Form.Check type="radio" label="Aleatório" name="c" checked={criteria === "random"} onChange={() => handleCriteriaChange("random")} />
                           <Form.Check type="radio" label="Melhores Notas" name="c" checked={criteria === "top_rated"} onChange={() => handleCriteriaChange("top_rated")} />
                           <Form.Check type="radio" label="Piores Notas" name="c" checked={criteria === "worst_rated"} onChange={() => handleCriteriaChange("worst_rated")} />
                           <Form.Check type="radio" label="Mais Recentes" name="c" checked={criteria === "recent"} onChange={() => handleCriteriaChange("recent")} />
                           <div style={{ borderTop: "1px solid var(--border-subtle)", margin: "0.5rem 0" }} />
                           <Form.Check type="radio" label="Indicados Oscar 2026" name="c" checked={criteria === "oscar"} onChange={() => handleCriteriaChange("oscar")} className="fw-bold" />
                           <Form.Check type="radio" label="Nacionais" name="c" checked={criteria === "national"} onChange={() => handleCriteriaChange("national")} className="fw-bold" />
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
                           <div style={{ marginTop: "0.5rem", fontSize: "var(--font-sm)", color: "var(--accent)" }}>
                              *Será completado com <strong>{quantity - availableMovies.length}</strong> folgas (byes).
                           </div>
                        )}
                     </Col>
                  </Row>

                  <div className="text-center mt-5">
                     <button
                        className={styles.startBtn}
                        onClick={handleStart}
                        disabled={availableMovies.length < 2}
                        type="button"
                     >
                        INICIAR COMBATE
                     </button>
                  </div>
               </Form>
            </div>
         )}

         {/* Battle */}
         {stage === "battle" && movieA && movieB && (
            <div>
               <div className="text-center mb-4">
                  <span className={styles.roundBadge}>{getRoundTitle()}</span>
                  {byesWaiting > 0 && currentRoundMovies.length > 0 && (
                     <div style={{ color: "var(--text-muted)", fontSize: "var(--font-sm)", marginBottom: "0.35rem" }}>
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
               <h2 className="fw-bold" style={{ color: "var(--text-primary)" }}>{champion.title}</h2>
               <p className={styles.championInfo}>
                  {champion.release_date?.split("-")[0]} &middot; Dir. {champion.director}
               </p>
               <button className={styles.replayBtn} onClick={() => setStage("setup")}>
                  Jogar Novamente
               </button>
            </div>
         )}
      </Container>
   );
}

/* ─── Sub-componente BattleCard (privado deste módulo) ─── */
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
               <div style={{ color: "var(--text-muted)", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
