import { useEffect, useMemo, useState } from "react";
import { Form, Modal } from "react-bootstrap";
import { Clapperboard, Gamepad2, HelpCircle } from "lucide-react";
import type { CustomList, MovieData } from "@/types";
import { MovieBattle } from "@/features/battle";
import { fetchListMovieIds } from "@/features/lists/services/listsService";
import { getDailyBattleTmdbPool, getMovieDetails, searchMovies } from "@/features/movies/services/tmdbService";
import {
   buildGuessSummary,
   compareMovieProfiles,
   getCoverRevealState,
   normalizeCountriesToPtBr,
   shouldUseTmdbSuggestions,
   type DailySourceMode,
   type GameMovieProfile,
   type GuessResult,
} from "@/features/games/logic/dailyGameLogic";
import styles from "./GamesHub.module.css";

type GameId = "menu" | "battle" | "daily_cover" | "daily_riddle";
type DailyMode = "cover" | "riddle";
type BattleSourceMode = "my_watched" | "list_scope" | "daily_16";

interface GamesHubProps {
   movies: MovieData[];
   lists: CustomList[];
   initialGame?: GameId;
}

interface GameHelp {
   title: string;
   content: string;
}

interface GuessSuggestion {
   id: number;
   title: string;
   localMovie?: MovieData;
}

interface TmdbCrewPerson {
   job?: string;
   name?: string;
}

interface TmdbCastPerson {
   name?: string;
}

interface TmdbNamedItem {
   name?: string;
}

interface TmdbMovieDetails {
   id: number;
   title?: string;
   release_date?: string;
   runtime?: number;
   poster_path?: string;
   genres?: TmdbNamedItem[];
   production_countries?: TmdbNamedItem[];
   credits?: {
      crew?: TmdbCrewPerson[];
      cast?: TmdbCastPerson[];
   };
}

interface TmdbSearchMovieResult {
   id: number;
   title?: string;
}

const MAX_LIVES = 6;
const GLOBAL_DAILY_TMDB_IDS = [
   157336, 27205, 238, 680, 496243, 550, 155, 13, 769, 11,
   603, 120, 129, 634649, 497, 372058, 637, 19404, 424, 122,
];

function buildDailySeed(dateKey: string, scopeKey: string, mode: DailyMode | "battle_daily_16"): number {
   const source = `${dateKey}|${scopeKey}|${mode}`;
   let hash = 0;

   for (let i = 0; i < source.length; i += 1) {
      hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
   }

   return hash;
}

function getTodayKey(): string {
   return new Date().toISOString().slice(0, 10);
}

function normalizeText(value?: string | null): string {
   if (!value) return "";
   return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
}

function parseYear(date?: string): number | undefined {
   if (!date || date.length < 4) return undefined;
   const year = Number(date.slice(0, 4));
   return Number.isFinite(year) ? year : undefined;
}

function toMovieProfileFromApp(movie: MovieData): GameMovieProfile {
   return {
      tmdbId: movie.tmdb_id,
      title: movie.title || "Sem titulo",
      releaseYear: parseYear(movie.release_date),
      director: movie.director,
      genres: movie.genres || [],
      countries: normalizeCountriesToPtBr(movie.countries || []),
      cast: (movie.cast || []).slice(0, 5),
      runtime: movie.runtime,
      posterPath: movie.poster_path || undefined,
   };
}

function toMovieProfileFromTmdb(details: TmdbMovieDetails): GameMovieProfile {
   const crew = Array.isArray(details.credits?.crew) ? details.credits?.crew || [] : [];
   const cast = Array.isArray(details.credits?.cast) ? details.credits?.cast || [] : [];
   const director = crew.find((person) => person?.job === "Director")?.name;

   return {
      tmdbId: Number(details.id),
      title: details.title || "Sem titulo",
      releaseYear: parseYear(details.release_date),
      director,
      genres: (details.genres || []).map((genre) => genre.name).filter(Boolean) as string[],
      countries: normalizeCountriesToPtBr((details.production_countries || []).map((country) => country.name).filter(Boolean) as string[]),
      cast: cast.map((actor) => actor.name).filter(Boolean).slice(0, 5) as string[],
      runtime: details.runtime || undefined,
      posterPath: details.poster_path || undefined,
   };
}

function pickDeterministicMovie<T>(pool: T[], seed: number): T | null {
   if (pool.length === 0) return null;
   const idx = seed % pool.length;
   return pool[idx] || null;
}

function getListLabel(value: string[]): string {
   return value.length > 0 ? value.join(", ") : "Nao informado";
}

function DailyMovieGame({
   mode,
   source,
   watchedMovies,
   listMovies,
   selectedListId,
   setSelectedListId,
   lists,
}: {
   mode: DailyMode;
   source: DailySourceMode;
   watchedMovies: MovieData[];
   listMovies: MovieData[];
   selectedListId: string;
   setSelectedListId: (value: string) => void;
   lists: CustomList[];
}) {
   const [helpOpen, setHelpOpen] = useState(false);
   const [guessText, setGuessText] = useState("");
   const [selectedGuess, setSelectedGuess] = useState<GuessSuggestion | null>(null);
   const [suggestions, setSuggestions] = useState<GuessSuggestion[]>([]);
   const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
   const [isSubmittingGuess, setIsSubmittingGuess] = useState(false);
   const [lives, setLives] = useState(MAX_LIVES);
   const [guesses, setGuesses] = useState<GuessResult[]>([]);
   const [targetMovie, setTargetMovie] = useState<GameMovieProfile | null>(null);
   const [targetLoading, setTargetLoading] = useState(false);
   const [targetError, setTargetError] = useState<string | null>(null);
   const [runId, setRunId] = useState(0);

   const dateKey = getTodayKey();

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

   useEffect(() => {
      let ignore = false;

      async function loadTargetMovie() {
         setTargetLoading(true);
         setTargetError(null);
         setTargetMovie(null);
         setLives(MAX_LIVES);
         setGuesses([]);
         setGuessText("");
         setSelectedGuess(null);

         try {
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

               if (!ignore) setTargetMovie(toMovieProfileFromTmdb(details as TmdbMovieDetails));
               return;
            }

            if (customPool.length === 0) {
               if (!ignore) setTargetError("Nao ha filmes suficientes nesse escopo.");
               return;
            }

            const chosen = customPool[Math.floor(Math.random() * customPool.length)];
            if (!chosen) {
               if (!ignore) setTargetError("Nao foi possivel sortear um filme nesse escopo.");
               return;
            }

            if (!ignore) setTargetMovie(toMovieProfileFromApp(chosen));
         } catch {
            if (!ignore) setTargetError("Falha ao preparar o jogo.");
         } finally {
            if (!ignore) setTargetLoading(false);
         }
      }

      loadTargetMovie();
      return () => {
         ignore = true;
      };
   }, [source, mode, dateKey, runId, customPool]);

   useEffect(() => {
      let ignore = false;

      async function loadSuggestions() {
         const query = guessText.trim();
         if (query.length < 2 || selectedGuess?.title === guessText) {
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
         loadSuggestions();
      }, 220);

      return () => {
         ignore = true;
         clearTimeout(timer);
      };
   }, [guessText, customPool, selectedGuess, source]);

   const isWon = guesses.some((guess) => guess.isCorrect);
   const isGameOver = isWon || lives <= 0;

   const summary = useMemo(() => buildGuessSummary(guesses, lives), [guesses, lives]);

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
            return;
         }

         const comparison = compareMovieProfiles(guessedProfile, targetMovie);
         setGuesses((prev) => [comparison, ...prev]);
         if (!comparison.isCorrect) {
            setLives((prev) => Math.max(0, prev - 1));
         }

         setSelectedGuess(null);
         setGuessText("");
         setSuggestions([]);
      } finally {
         setIsSubmittingGuess(false);
      }
   };

   return (
      <div className={styles.gamePanel}>
         <div className={styles.gameHeader}>
            <div>
               <h3 className={styles.gameTitle}>
                  <Clapperboard size={18} /> Filme do Dia {mode === "cover" ? "(Capa)" : "(Enigma)"}
               </h3>
               <p className={styles.gameSubtitle}>Fonte: {sourceLabel} {source === "global_daily" ? `• ${dateKey}` : ""}</p>
            </div>
            <button className={styles.helpBtn} onClick={() => setHelpOpen(true)} type="button" aria-label="Como jogar filme do dia">
               <HelpCircle size={16} /> ?
            </button>
         </div>

         {source === "list_scope" && (
            <div className={styles.inlineFilter}>
               <label htmlFor={`daily-list-${mode}`}>Lista do jogo</label>
               <Form.Select
                  id={`daily-list-${mode}`}
                  className={styles.inlineSelect}
                  value={selectedListId}
                  onChange={(event) => setSelectedListId(event.target.value)}
               >
                  <option value="all">Todas as listas</option>
                  {lists.map((list) => (
                     <option key={list.id} value={list.id}>{list.name}</option>
                  ))}
               </Form.Select>
            </div>
         )}

         <div className={styles.livesRow}>
            <span>Vidas:</span>
            {[...Array(MAX_LIVES)].map((_, idx) => (
               <span key={idx} className={`${styles.lifeDot} ${idx < lives ? styles.lifeDotOn : styles.lifeDotOff}`} />
            ))}
            <button type="button" className={styles.newRoundBtn} onClick={() => setRunId((value) => value + 1)}>
               Novo jogo
            </button>
         </div>

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
                              {[...Array(coverReveal.totalTiles)].map((_, idx) => (
                                 <div
                                    key={idx}
                                    className={`${styles.revealTile} ${idx < coverReveal.revealTiles ? styles.revealTileOff : ""}`}
                                    style={{ backdropFilter: `blur(${coverReveal.blurPx}px)` }}
                                 />
                              ))}
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
                        Selecione um filme da sugestao e confira os atributos. Ano: amarelo quando estiver dentro de ±5 anos e a seta mostra se o alvo e mais atual ou mais antigo.
                     </p>
                  </div>
               )}

               <div className={styles.guessRow}>
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
                                    setSuggestions([]);
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
                     {isSubmittingGuess ? "Conferindo..." : "Confirmar chute"}
                  </button>
               </div>

               {!selectedGuess && !isGameOver && (
                  <p className={styles.selectionHint}>Selecione uma opção da lista para validar o chute.</p>
               )}

               {isWon && <p className={styles.successMsg}>Acertou! O filme era {targetMovie.title}.</p>}
               {!isWon && isGameOver && <p className={styles.errorMsg}>Fim de jogo! O filme era {targetMovie.title}.</p>}

               {isGameOver && (
                  <div className={styles.finalReveal}>
                     <h4 className={styles.finalTitle}>Filme revelado</h4>
                     <div className={styles.finalLayout}>
                        {targetMovie.posterPath ? (
                           <img
                              src={`https://image.tmdb.org/t/p/w500${targetMovie.posterPath}`}
                              alt={targetMovie.title}
                              className={styles.finalPoster}
                           />
                        ) : (
                           <div className={styles.noPoster}>Sem poster</div>
                        )}

                        <div className={styles.finalInfo}>
                           <strong>{targetMovie.title}</strong>
                           <p>Ano: {targetMovie.releaseYear || "Nao informado"}</p>
                           <p>Diretor: {targetMovie.director || "Nao informado"}</p>
                           <p>Generos: {getListLabel(targetMovie.genres)}</p>
                           <p>Paises: {getListLabel(targetMovie.countries)}</p>
                           <p>Elenco principal: {getListLabel(targetMovie.cast)}</p>
                           <p>Duracao: {targetMovie.runtime ? `${targetMovie.runtime} min` : "Nao informada"}</p>
                        </div>
                     </div>
                  </div>
               )}

               {summary.attempts > 0 && (
                  <div className={styles.summaryCard}>
                     <h4 className={styles.summaryTitle}>Resumo das informacoes obtidas</h4>
                     <div className={styles.summaryMeta}>
                        <span>Tentativas: {summary.attempts}</span>
                        <span>Vidas restantes: {summary.livesLeft}</span>
                     </div>
                     <div className={styles.summaryGrid}>
                        {summary.fields.map((field) => (
                           <div
                              key={`summary-${field.label}`}
                              className={`${styles.summaryItem} ${styles[`status${field.status.charAt(0).toUpperCase()}${field.status.slice(1)}`]}`}
                           >
                              <span className={styles.fieldLabel}>{field.label}</span>
                              <span className={styles.fieldValue}>{field.guessed}</span>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               <div className={styles.resultsList}>
                  {guesses.map((guess, idx) => (
                     <div key={`${guess.guessTitle}-${idx}`} className={styles.resultCard}>
                        <strong className={styles.resultTitle}>{guess.guessTitle}</strong>
                        <div className={styles.resultFields}>
                           {guess.fields.map((field) => (
                              <div
                                 key={`${guess.guessTitle}-${field.label}`}
                                 className={`${styles.resultField} ${styles[`status${field.status.charAt(0).toUpperCase()}${field.status.slice(1)}`]}`}
                              >
                                 <span className={styles.fieldLabel}>{field.label}</span>
                                 <span className={styles.fieldValue}>{field.guessed}</span>
                              </div>
                           ))}
                        </div>
                     </div>
                  ))}
               </div>
            </>
         )}

         <Modal show={helpOpen} onHide={() => setHelpOpen(false)} centered>
            <Modal.Header closeButton>
               <Modal.Title>Como jogar: Filme do Dia</Modal.Title>
            </Modal.Header>
            <Modal.Body>
               <p>1. Escolha a fonte: global, assistidos ou lista.</p>
               <p>2. Digite o nome e escolha uma sugestao (nao vale texto livre sem selecionar).</p>
               <p>3. Verde = certo, amarelo = perto, vermelho = errado.</p>
               <p>4. Ano: amarelo quando estiver em ±5 anos. Se houver seta: ↑ o alvo é mais atual, ↓ o alvo é mais antigo.</p>
               <p>5. Paises: verde quando todos os paises batem; amarelo quando houver correspondencia parcial.</p>
               <p>6. Elenco principal: correto apenas se acertar os 5 principais; perto quando acertar pelo menos 1.</p>
               <p>7. Voce tem vidas limitadas. No modo Capa, cada erro revela mais o poster.</p>
            </Modal.Body>
         </Modal>
      </div>
   );
}

export function GamesHub({ movies, lists, initialGame = "menu" }: GamesHubProps) {
   const [activeGame, setActiveGame] = useState<GameId>(initialGame);
   const [dailySourceMode, setDailySourceMode] = useState<DailySourceMode>("global_daily");
   const [battleSourceMode, setBattleSourceMode] = useState<BattleSourceMode>("my_watched");
   const [battleListId, setBattleListId] = useState<string>("all");
   const [dailyListId, setDailyListId] = useState<string>("all");

   const [battleListMovieIds, setBattleListMovieIds] = useState<Set<number> | null>(null);
   const [dailyListMovieIds, setDailyListMovieIds] = useState<Set<number> | null>(null);
   const [battleDailyTmdbMovies, setBattleDailyTmdbMovies] = useState<MovieData[]>([]);
   const [battleDailyLoading, setBattleDailyLoading] = useState(false);
   const [battleScopeError, setBattleScopeError] = useState<string | null>(null);
   const [dailyScopeError, setDailyScopeError] = useState<string | null>(null);
   const [battleHelpOpen, setBattleHelpOpen] = useState(false);

   useEffect(() => {
      let ignore = false;

      async function loadBattleListScope() {
         if (battleListId === "all") {
            setBattleListMovieIds(null);
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

      loadBattleListScope();
      return () => {
         ignore = true;
      };
   }, [battleListId]);

   useEffect(() => {
      let ignore = false;

      async function loadDailyListScope() {
         if (dailyListId === "all") {
            setDailyListMovieIds(null);
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

      loadDailyListScope();
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

      loadBattleDailyTmdb();
      return () => {
         ignore = true;
      };
   }, [battleSourceMode]);

   const watchedAllMovies = useMemo(
      () => movies.filter((movie) => movie.status === "watched" && movie.rating !== null),
      [movies]
   );

   const battleScopedMovies = useMemo(() => {
      if (battleListId === "all") {
         return watchedAllMovies;
      }

      if (!battleListMovieIds) {
         return [] as MovieData[];
      }

      return watchedAllMovies.filter((movie) => battleListMovieIds.has(movie.tmdb_id));
   }, [watchedAllMovies, battleListId, battleListMovieIds]);

   const dailyScopedMovies = useMemo(() => {
      if (dailyListId === "all") {
         return watchedAllMovies;
      }

      if (!dailyListMovieIds) {
         return [] as MovieData[];
      }

      return watchedAllMovies.filter((movie) => dailyListMovieIds.has(movie.tmdb_id));
   }, [watchedAllMovies, dailyListId, dailyListMovieIds]);

   const battlePlayableMovies = useMemo(() => {
      if (battleSourceMode === "daily_16") {
         return battleDailyTmdbMovies;
      }

      if (battleSourceMode === "list_scope") {
         return battleScopedMovies;
      }

      return watchedAllMovies;
   }, [battleSourceMode, battleDailyTmdbMovies, battleScopedMovies, watchedAllMovies]);

   const gameHelpMap: Record<Exclude<GameId, "menu">, GameHelp> = {
      battle: {
         title: "Como jogar: Modo Batalha",
         content:
         "Escolha a fonte da batalha: seus assistidos, lista selecionada ou rodada diaria de 16 (modo exclusivo). Em cada duelo, selecione seu favorito até restar o campeão.",
      },
      daily_cover: {
         title: "Como jogar: Filme do Dia (Capa)",
         content:
            "No modo global, todos os usuários recebem o mesmo filme do dia. Você também pode jogar com assistidos ou lista. As respostas são por seleção de sugestão.",
      },
      daily_riddle: {
         title: "Como jogar: Filme do Dia (Enigma)",
         content:
            "Escolha uma sugestão de título para chutar. O sistema retorna feedback por atributo, incluindo ano com faixa de ±5 e seta de direção.",
      },
   };

   const headerHelp = activeGame !== "menu" ? gameHelpMap[activeGame as Exclude<GameId, "menu">] : null;

   return (
      <section className={styles.page}>
         <div className={styles.container}>
            <div className={styles.headerRow}>
               <div>
                  <h1 className={styles.title}>Central de Jogos</h1>
                  <p className={styles.subtitle}>Escolha um jogo no menu e configure os detalhes dentro do próprio jogo.</p>
               </div>
               {headerHelp && (
                  <button type="button" className={styles.helpBtn} onClick={() => setBattleHelpOpen(true)}>
                     <HelpCircle size={16} /> ?
                  </button>
               )}
            </div>

            {activeGame === "menu" && (
               <div className={styles.menuGrid}>
                  <button type="button" className={styles.menuCard} onClick={() => setActiveGame("battle")}>
                     <h3><Gamepad2 size={18} /> Modo Batalha</h3>
                     <p>Torneio mata-mata com critérios e opção de rodada diária de 16.</p>
                  </button>

                  <button type="button" className={styles.menuCard} onClick={() => setActiveGame("daily_cover")}>
                     <h3><Clapperboard size={18} /> Filme do Dia: Capa</h3>
                     <p>Sistema de vidas, resposta por sugestão e revelação progressiva da capa.</p>
                  </button>

                  <button type="button" className={styles.menuCard} onClick={() => setActiveGame("daily_riddle")}>
                     <h3><Clapperboard size={18} /> Filme do Dia: Enigma</h3>
                     <p>Resposta por sugestão com comparação de atributos e direção do ano.</p>
                  </button>
               </div>
            )}

            {activeGame !== "menu" && (
               <div className={styles.gameActions}>
                  <button type="button" className={styles.backBtn} onClick={() => setActiveGame("menu")}>
                     Voltar para jogos
                  </button>
               </div>
            )}

            {activeGame === "battle" && (
               <>
                  <div className={styles.modeCard}>
                     <strong className={styles.modeTitle}>Configuração da batalha</strong>
                     <div className={styles.modeOptions}>
                        <button
                           type="button"
                           className={`${styles.modeBtn} ${battleSourceMode === "my_watched" ? styles.modeBtnActive : ""}`}
                           onClick={() => setBattleSourceMode("my_watched")}
                        >
                           Meus assistidos
                        </button>
                        <button
                           type="button"
                           className={`${styles.modeBtn} ${battleSourceMode === "list_scope" ? styles.modeBtnActive : ""}`}
                           onClick={() => setBattleSourceMode("list_scope")}
                        >
                           Lista selecionada
                        </button>
                        <button
                           type="button"
                           className={`${styles.modeBtn} ${battleSourceMode === "daily_16" ? styles.modeBtnActive : ""}`}
                           onClick={() => setBattleSourceMode("daily_16")}
                        >
                           Rodada diária de 16
                        </button>
                     </div>

                     {battleSourceMode === "list_scope" && (
                        <div className={styles.inlineFilter}>
                           <label htmlFor="battle-list-scope">Lista da batalha</label>
                           <Form.Select
                              id="battle-list-scope"
                              className={styles.inlineSelect}
                              value={battleListId}
                              onChange={(event) => setBattleListId(event.target.value)}
                           >
                              <option value="all">Todas as listas</option>
                              {lists.map((list) => (
                                 <option key={list.id} value={list.id}>{list.name}</option>
                              ))}
                           </Form.Select>
                        </div>
                     )}

                     <small className={styles.scopeHint}>Filmes disponíveis: <strong>{battlePlayableMovies.length}</strong></small>
                     {battleSourceMode === "daily_16" && <small className={styles.scopeHint}>Fonte diária: TMDB (seleção automática do dia)</small>}
                     {battleDailyLoading && battleSourceMode === "daily_16" && <p className={styles.emptyMsg}>Montando rodada diária...</p>}
                     {battleScopeError && <p className={styles.errorMsg}>{battleScopeError}</p>}
                  </div>

                  <MovieBattle
                     allMovies={battlePlayableMovies}
                     onExit={() => setActiveGame("menu")}
                     presetMode={battleSourceMode === "daily_16" ? {
                        criteria: "random",
                        quantity: 16,
                        hideSetup: true,
                        label: `Rodada diária TMDB (${getTodayKey()})`,
                     } : undefined}
                  />
               </>
            )}

            {(activeGame === "daily_cover" || activeGame === "daily_riddle") && (
               <div className={styles.modeCard}>
                  <strong className={styles.modeTitle}>Fonte do desafio</strong>
                  <div className={styles.modeOptions}>
                     <button
                        type="button"
                        className={`${styles.modeBtn} ${dailySourceMode === "global_daily" ? styles.modeBtnActive : ""}`}
                        onClick={() => setDailySourceMode("global_daily")}
                     >
                        Filme do dia (global)
                     </button>
                     <button
                        type="button"
                        className={`${styles.modeBtn} ${dailySourceMode === "my_watched" ? styles.modeBtnActive : ""}`}
                        onClick={() => setDailySourceMode("my_watched")}
                     >
                        Meus assistidos
                     </button>
                     <button
                        type="button"
                        className={`${styles.modeBtn} ${dailySourceMode === "list_scope" ? styles.modeBtnActive : ""}`}
                        onClick={() => setDailySourceMode("list_scope")}
                     >
                        Lista selecionada
                     </button>
                  </div>
                  {dailyScopeError && <p className={styles.errorMsg}>{dailyScopeError}</p>}
               </div>
            )}

            {activeGame === "daily_cover" && (
               <DailyMovieGame
                  key={`daily-cover-${dailySourceMode}-${dailyListId}`}
                  mode="cover"
                  source={dailySourceMode}
                  watchedMovies={watchedAllMovies}
                  listMovies={dailyScopedMovies}
                  selectedListId={dailyListId}
                  setSelectedListId={setDailyListId}
                  lists={lists}
               />
            )}

            {activeGame === "daily_riddle" && (
               <DailyMovieGame
                  key={`daily-riddle-${dailySourceMode}-${dailyListId}`}
                  mode="riddle"
                  source={dailySourceMode}
                  watchedMovies={watchedAllMovies}
                  listMovies={dailyScopedMovies}
                  selectedListId={dailyListId}
                  setSelectedListId={setDailyListId}
                  lists={lists}
               />
            )}
         </div>

         <Modal show={battleHelpOpen} onHide={() => setBattleHelpOpen(false)} centered>
            <Modal.Header closeButton>
               <Modal.Title>{headerHelp?.title || "Como jogar"}</Modal.Title>
            </Modal.Header>
            <Modal.Body>{headerHelp?.content}</Modal.Body>
         </Modal>
      </section>
   );
}
