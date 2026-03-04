import { useState, useEffect } from "react";
import { Modal, Form, Spinner} from "react-bootstrap";
import toast from "react-hot-toast";
import { Search, ArrowLeft } from "lucide-react";

import { StarRating } from "@/components/ui/StarRating/StarRating";
import { searchMovies } from "@/features/movies/services/tmdbService";

import { supabase } from "@/lib/supabase";
import type { TmdbSearchResult, MovieData } from "@/types";
import styles from "./AddMovieModal.module.css";

interface AddMovieModalProps {
   show: boolean;
   onHide: () => void;
   onSuccess: () => void;
   movieToEdit?: MovieData | null;
}

export function AddMovieModal({
   show,
   onHide,
   onSuccess,
   movieToEdit,
}: AddMovieModalProps) {
   const [step, setStep] = useState<"search" | "form">("search");
   const [searchQuery, setSearchQuery] = useState("");
   const [searchResults, setSearchResults] = useState<TmdbSearchResult[]>([]);
   const [loadingSearch, setLoadingSearch] = useState(false);

   const [selectedMovie, setSelectedMovie] = useState<TmdbSearchResult | null>(null);
   const [rating, setRating] = useState(5);
   const [review, setReview] = useState("");
   const [recommended, setRecommended] = useState("Vale a pena assistir");
   const [saving, setSaving] = useState(false);
   const [formStatus, setFormStatus] = useState<"watched" | "watchlist">("watched");

   useEffect(() => {
      if (show && movieToEdit) {
         setStep("form");
         setRating(movieToEdit.rating ?? 5);
         setReview(movieToEdit.review || "");
         setRecommended(movieToEdit.recommended || "Vale a pena assistir");
         setFormStatus(movieToEdit.status || "watched");
         setSelectedMovie({
            id: movieToEdit.tmdb_id,
            title: movieToEdit.title || "",
            poster_path: movieToEdit.poster_path || "",
            release_date: movieToEdit.release_date || "",
         });
      } else if (show) {
         setStep("search");
         setSearchQuery("");
         setSearchResults([]);
         setSelectedMovie(null);
         setRating(5);
         setReview("");
         setRecommended("Vale a pena assistir");
         setFormStatus("watched");
      }
   }, [show, movieToEdit]);

   const handleSearch = async (e?: React.SyntheticEvent) => {
      if (e) e.preventDefault();
      if (!searchQuery.trim()) return;
      setLoadingSearch(true);
      try {
         const results = await searchMovies(searchQuery);
         setSearchResults(results);
      } catch (error) {
         console.error(error);
      } finally {
         setLoadingSearch(false);
      }
   };

   const handleSelectMovie = (movie: TmdbSearchResult) => {
      setSelectedMovie(movie);
      setStep("form");
   };

   const handleSave = async () => {
      if (!selectedMovie) return;
      setSaving(true);

      try {
         const {
            data: { user },
            error: userError,
         } = await supabase.auth.getUser();

         if (userError || !user) {
            toast.error("Você precisa estar logado para adicionar filmes.");
            setSaving(false);
            return;
         }

         if (!movieToEdit) {
            const { data: existingMovie } = await supabase
               .from("reviews")
               .select("id, status")
               .eq("user_id", user.id)
               .eq("tmdb_id", selectedMovie.id)
               .maybeSingle();

            if (existingMovie) {
               const statusNome = existingMovie.status === "watched" ? "Assistidos" : "Watchlist";
               toast.error(`Você já adicionou este filme! Ele está na aba "${statusNome}".`);
               setSaving(false);
               return;
            }
         }

         const payload = {
            tmdb_id: selectedMovie.id,
            rating: formStatus === "watched" ? rating : null,
            review: formStatus === "watched" ? review : null,
            recommended: formStatus === "watched" ? recommended : null,
            status: formStatus,
            user_id: user.id,
         };

         if (movieToEdit) {
            const { error } = await supabase
               .from("reviews")
               .update(payload)
               .eq("id", movieToEdit.id);
            if (error) throw error;
         } else {
            const { error } = await supabase.from("reviews").insert([payload]);
            if (error) throw error;
         }

         toast.success("Filme guardado com sucesso!");
         onSuccess();
         onHide();
      } catch (err) {
         toast.error("Erro ao salvar. Verifique sua conexão e tente novamente.");
         console.error(err);
      } finally {
         setSaving(false);
      }
   };

   return (
      <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
         <Modal.Header closeButton className="border-0 pb-0">
            <Modal.Title className="fw-bold">
               {movieToEdit
                  ? `Editar: ${selectedMovie?.title}`
                  : "Adicionar Novo Filme"}
            </Modal.Title>
         </Modal.Header>

         <Modal.Body>

            {step === "search" && (
               <>
                  <Form onSubmit={handleSearch}>
                     <div className={styles.searchRow}>
                        <Form.Control
                           placeholder="Digite o nome do filme..."
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           className={styles.searchInput}
                        />
                        <button type="submit" className={styles.searchBtn} disabled={loadingSearch}>
                           {loadingSearch ? <Spinner size="sm" animation="border" /> : <><Search size={16} /> Buscar</>}
                        </button>
                     </div>
                  </Form>

                  <div>
                     {searchResults.map((movie) => (
                        <div
                           key={movie.id}
                           className={styles.resultItem}
                           onClick={() => handleSelectMovie(movie)}
                        >
                           {movie.poster_path && (
                              <img
                                 src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                                 alt={movie.title}
                                 className={styles.resultPoster}
                              />
                           )}
                           <div>
                              <div className={styles.resultTitle}>{movie.title}</div>
                              <span className={styles.resultYear}>
                                 {movie.release_date?.split("-")[0]}
                              </span>
                           </div>
                           <span className={styles.resultSelect}>
                              Selecionar &rarr;
                           </span>
                        </div>
                     ))}
                  </div>
               </>
            )}

            {step === "form" && (
               <Form>
                  <div className="d-flex justify-content-center mb-4">
                     <div className={styles.statusToggle}>
                        <button
                           type="button"
                           className={`${styles.statusBtn} ${formStatus === "watched" ? styles.statusBtnActive : ""}`}
                           onClick={() => setFormStatus("watched")}
                        >
                           Já Assisti
                        </button>
                        <button
                           type="button"
                           className={`${styles.statusBtn} ${formStatus === "watchlist" ? styles.statusBtnActive : ""}`}
                           onClick={() => setFormStatus("watchlist")}
                        >
                           Quero Ver
                        </button>
                     </div>
                  </div>

                  {formStatus === "watched" ? (
                     <>
                        <Form.Group className="mb-3">
                           <Form.Label className={styles.formLabel}>Sua Nota (0 a 10)</Form.Label>
                           <StarRating 
                              value={rating || 0} 
                              onChange={setRating} 
                              max={10} 
                           />
                        </Form.Group>

                        <Form.Group className="mb-3">
                           <Form.Label className={styles.formLabel}>Veredito</Form.Label>
                           <Form.Select
                              value={recommended}
                              onChange={(e) => setRecommended(e.target.value)}
                           >
                              <option value="Assista com certeza">Assista com certeza</option>
                              <option value="Vale a pena assistir">Vale a pena assistir</option>
                              <option value="tem filmes melhores, mas é legal">Tem filmes melhores</option>
                              <option value="não tão bom">Não tão bom</option>
                              <option value="Não perca seu tempo">Não perca seu tempo</option>
                           </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                           <Form.Label className={styles.formLabel}>Sua Análise</Form.Label>
                           <Form.Control
                              as="textarea"
                              rows={4}
                              value={review}
                              onChange={(e) => setReview(e.target.value)}
                           />
                        </Form.Group>
                     </>
                  ) : (
                     <div className={styles.watchlistInfo}>
                        <h5>Salvar na Lista de Desejos?</h5>
                        <p>
                           Este filme ficará na aba "Watchlist" para ser avaliado mais tarde.
                        </p>
                     </div>
                  )}
               </Form>
            )}
         </Modal.Body>

         <Modal.Footer className="border-0">
            {step === "form" && !movieToEdit && (
               <button className={styles.backBtn} onClick={() => setStep("search")}>
                  <ArrowLeft size={16} /> Buscar Outro
               </button>
            )}
            <button className={styles.closeBtn} onClick={onHide}>
               Fechar
            </button>
            {step === "form" && (
               <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar Review"}
               </button>
            )}
         </Modal.Footer>
      </Modal>
   );
}
