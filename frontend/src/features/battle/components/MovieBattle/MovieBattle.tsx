import { useState } from "react";
import {
   Container,
   Card,
   Button,
   Form,
   Row,
   Col,
   Alert,
   ProgressBar,
   Badge,
} from "react-bootstrap";
import type { MovieData } from "@/types";
import confetti from "canvas-confetti";
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
   const [error, setError] = useState("");

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
      setError("");
      const availableCount = availableMovies.length;
      if (availableCount < 2) {
         setError("Você precisa de pelo menos 2 filmes para uma batalha.");
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
         <div className="d-flex justify-content-between align-items-center mb-4">
            <h4 className="fw-bold mb-0 text-muted">⚔️ Modo Batalha</h4>
            <Button variant="outline-secondary" size="sm" onClick={onExit}>
               Sair
            </Button>
         </div>

         {/* Setup */}
         {stage === "setup" && (
            <Card className="shadow-sm border-0">
               <Card.Body className="p-4 p-md-5">
                  <h2 className="mb-4 text-center fw-bold">Configurar Torneio</h2>
                  {error && <Alert variant="warning">{error}</Alert>}

                  <Form>
                     <Row className="g-4">
                        <Col md={6}>
                           <Form.Label className="fw-bold">Critério</Form.Label>
                           <div className="d-flex flex-column gap-2">
                              <Form.Check type="radio" label="Aleatório" name="c" checked={criteria === "random"} onChange={() => handleCriteriaChange("random")} />
                              <Form.Check type="radio" label="Melhores Notas" name="c" checked={criteria === "top_rated"} onChange={() => handleCriteriaChange("top_rated")} />
                              <Form.Check type="radio" label="Piores Notas" name="c" checked={criteria === "worst_rated"} onChange={() => handleCriteriaChange("worst_rated")} />
                              <Form.Check type="radio" label="Mais Recentes" name="c" checked={criteria === "recent"} onChange={() => handleCriteriaChange("recent")} />
                              <div className="border-top my-2 pt-2"></div>
                              <Form.Check type="radio" label="Indicados Oscar 2026" name="c" checked={criteria === "oscar"} onChange={() => handleCriteriaChange("oscar")} className="fw-bold" />
                              <Form.Check type="radio" label="Nacionais" name="c" checked={criteria === "national"} onChange={() => handleCriteriaChange("national")} className="fw-bold" />
                           </div>
                           <div className="mt-3 text-muted small p-2 bg-light rounded">
                              Disponíveis: <strong>{availableMovies.length}</strong>
                           </div>
                        </Col>

                        <Col md={6}>
                           <Form.Label className="fw-bold">Tamanho do Torneio</Form.Label>
                           <div className="d-grid gap-2">
                              <Button
                                 variant={quantity === -1 ? "primary" : "outline-primary"}
                                 onClick={() => setQuantity(-1)}
                                 className="fw-bold mb-2"
                              >
                                 Todos os Filmes ({availableMovies.length})
                              </Button>
                              {[4, 8, 16, 32, 64].map((qtd) => {
                                 const maxBracket = nextPowerOfTwo(availableMovies.length);
                                 const isDisabled = qtd > maxBracket;
                                 if (qtd > maxBracket * 2) return null;
                                 return (
                                    <Button
                                       key={qtd}
                                       variant={quantity === qtd ? "dark" : "outline-light text-dark border"}
                                       onClick={() => setQuantity(qtd)}
                                       disabled={isDisabled}
                                       className={isDisabled ? styles.disabledButton : ""}
                                    >
                                       {qtd} Filmes
                                    </Button>
                                 );
                              })}
                           </div>
                           {quantity !== -1 && quantity > availableMovies.length && (
                              <div className="mt-2 small text-primary">
                                 *Será completado com <strong>{quantity - availableMovies.length}</strong> folgas (byes).
                              </div>
                           )}
                        </Col>
                     </Row>

                     <div className="text-center mt-5">
                        <Button
                           variant="dark"
                           size="lg"
                           className="px-5 rounded-pill fw-bold"
                           onClick={handleStart}
                           disabled={availableMovies.length < 2}
                        >
                           INICIAR COMBATE
                        </Button>
                     </div>
                  </Form>
               </Card.Body>
            </Card>
         )}

         {/* Battle */}
         {stage === "battle" && movieA && movieB && (
            <div>
               <div className="text-center mb-4">
                  <Badge bg="warning" text="dark" className="fs-6 mb-2 text-uppercase px-3 py-2">
                     {getRoundTitle()}
                  </Badge>
                  {byesWaiting > 0 && currentRoundMovies.length > 0 && (
                     <div className="mb-2 text-muted small">
                        (+{byesWaiting} filmes aguardando na próxima fase)
                     </div>
                  )}
                  <h5 className="text-muted">
                     Duelo {currentMatchNum} de {totalMatchesInRound}
                  </h5>
                  <ProgressBar now={progress} variant="success" className={styles.progressBar} />
               </div>

               <Row className="align-items-center g-4">
                  <Col xs={12} md={5}>
                     <BattleCard movie={movieA} onClick={() => handleVote(movieA)} />
                  </Col>
                  <Col xs={12} md={2} className="text-center">
                     <div className="fw-bold display-6 text-muted py-2 py-md-0">VS</div>
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
               <h1 className="fw-bold mb-4">GRANDE CAMPEÃO 🏆</h1>
               <div className="d-flex justify-content-center mb-4">
                  <img
                     src={`https://image.tmdb.org/t/p/w500${champion.poster_path}`}
                     alt={champion.title}
                     className={`rounded shadow-lg ${styles.championImage}`}
                  />
               </div>
               <h2 className="fw-bold">{champion.title}</h2>
               <p className="text-muted fs-5">
                  {champion.release_date?.split("-")[0]} • Dir. {champion.director}
               </p>
               <div className="mt-5">
                  <Button variant="dark" size="lg" onClick={() => setStage("setup")}>
                     Jogar Novamente
                  </Button>
               </div>
            </div>
         )}
      </Container>
   );
}

/* ─── Sub-componente BattleCard (privado deste módulo) ─── */
function BattleCard({ movie, onClick }: { movie: MovieData; onClick: () => void }) {
   return (
      <Card
         className={`h-100 shadow border-0 overflow-hidden ${styles.battleCard}`}
         onClick={onClick}
      >
         <div className={styles.battlePosterContainer}>
            {movie.poster_path ? (
               <Card.Img
                  variant="top"
                  src={`https://image.tmdb.org/t/p/w780${movie.poster_path}`}
                  className={styles.battlePosterImage}
               />
            ) : (
               <div className="text-white h-100 d-flex align-items-center justify-content-center">
                  Sem Imagem
               </div>
            )}
            <div className={`position-absolute bottom-0 start-0 w-100 p-3 ${styles.battleGradient}`}>
               <h5 className="text-white fw-bold mb-0 text-truncate">{movie.title}</h5>
               <small className="text-warning">Nota Original: {movie.rating}</small>
            </div>
         </div>
      </Card>
   );
}
