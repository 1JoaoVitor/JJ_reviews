import { useState, useEffect } from "react";
import {
   Modal,
   Button,
   Form,
   InputGroup,
   ListGroup,
   Image,
   Spinner,
} from "react-bootstrap";
import axios from "axios";
import { supabase } from "../supabaseClient";
import type { TmdbSearchResult, MovieData } from "../types";

interface AddMovieModalProps {
   show: boolean;
   onHide: () => void;
   onSuccess: () => void;
   movieToEdit?: MovieData | null; //Se vier preenchido, é edição
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

   // Dados do Formulário
   const [selectedMovie, setSelectedMovie] = useState<TmdbSearchResult | null>(
      null,
   );
   const [rating, setRating] = useState(5);
   const [review, setReview] = useState("");
   const [recommended, setRecommended] = useState("Vale a pena assistir");
   const [saving, setSaving] = useState(false);

   // Quando o modal abre, verifica se é Edição ou Adição
   useEffect(() => {
      if (show && movieToEdit) {
         // MODO EDIÇÃO (filme existe)
         setStep("form");
         setRating(movieToEdit.rating);
         setReview(movieToEdit.review);
         setRecommended(movieToEdit.recommended);
         // Simula o objeto da TMDB com os dados que já se tem
         setSelectedMovie({
            id: movieToEdit.tmdb_id,
            title: movieToEdit.title || "",
            poster_path: movieToEdit.poster_path || "",
            release_date: movieToEdit.release_date || "",
         });
      } else if (show) {
         // MODO NOVO FILME
         setStep("search");
         setSearchQuery("");
         setSearchResults([]);
         setSelectedMovie(null);
         setRating(5);
         setReview("");
         setRecommended("Vale a pena assistir");
      }
   }, [show, movieToEdit]);

   const handleSearch = async (e?: React.SyntheticEvent) => {
      if (e) e.preventDefault();
      if (!searchQuery.trim()) return;
      setLoadingSearch(true);
      try {
         const response = await axios.get(
            `https://api.themoviedb.org/3/search/movie?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=pt-BR&query=${searchQuery}`,
         );
         setSearchResults(response.data.results.slice(0, 5));
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
         if (movieToEdit) {
            // --- UPDATE ---
            const { error } = await supabase
               .from("reviews")
               .update({
                  rating: rating,
                  review: review,
                  recommended: recommended,
               })
               .eq("id", movieToEdit.id); // Busca pelo ID do banco (não do TMDB)

            if (error) throw error;
         } else {
            // --- INSERT ---
            const { error } = await supabase.from("reviews").insert([
               {
                  tmdb_id: selectedMovie.id,
                  rating: rating,
                  review: review,
                  recommended: recommended,
               },
            ]);
            if (error) throw error;
         }

         onSuccess();
         onHide();
      } catch (error) {
         alert("Erro ao salvar. Veja o console.");
         console.error(error);
      } finally {
         setSaving(false);
      }
   };

   return (
      <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
         <Modal.Header closeButton>
            <Modal.Title className="fw-bold">
               {movieToEdit
                  ? `Editar: ${selectedMovie?.title}`
                  : "Adicionar Novo Filme"}
            </Modal.Title>
         </Modal.Header>
         <Modal.Body>
            {/* BUSCA (Só aparece se NÃO for edição) */}
            {step === "search" && (
               <>
                  <Form onSubmit={handleSearch} className="mb-4">
                     <InputGroup>
                        <Form.Control
                           placeholder="Digite o nome do filme..."
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           autoFocus
                        />
                        <Button
                           variant="primary"
                           type="submit"
                           disabled={loadingSearch}
                        >
                           {loadingSearch ? (
                              <Spinner size="sm" animation="border" />
                           ) : (
                              "Buscar"
                           )}
                        </Button>
                     </InputGroup>
                  </Form>

                  <ListGroup variant="flush">
                     {searchResults.map((movie) => (
                        <ListGroup.Item
                           key={movie.id}
                           action
                           onClick={() => handleSelectMovie(movie)}
                           className="d-flex align-items-center gap-3 p-3"
                        >
                           {movie.poster_path && (
                              <Image
                                 src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                                 rounded
                                 style={{ width: 50 }}
                              />
                           )}
                           <div>
                              <div className="fw-bold">{movie.title}</div>
                              <small className="text-muted">
                                 {movie.release_date?.split("-")[0]}
                              </small>
                           </div>
                           <div className="ms-auto text-primary small">
                              Selecionar &rarr;
                           </div>
                        </ListGroup.Item>
                     ))}
                  </ListGroup>
               </>
            )}

            {/* FORMULÁRIO (Usado tanto para criar quanto editar) */}
            {step === "form" && (
               <Form>
                  <Form.Group className="mb-3">
                     <Form.Label className="fw-bold">
                        Sua Nota (0 a 10)
                     </Form.Label>
                     <div className="d-flex align-items-center gap-3">
                        <Form.Range
                           min={0}
                           max={10}
                           step={0.5}
                           value={rating}
                           onChange={(e) => setRating(Number(e.target.value))}
                        />
                        <span
                           className="h4 fw-bold text-warning border p-2 rounded bg-dark mb-0"
                           style={{ minWidth: "60px", textAlign: "center" }}
                        >
                           {rating}
                        </span>
                     </div>
                  </Form.Group>

                  <Form.Group className="mb-3">
                     <Form.Label className="fw-bold">Veredito</Form.Label>
                     <Form.Select
                        value={recommended}
                        onChange={(e) => setRecommended(e.target.value)}
                     >
                        <option value="Assista com certeza">
                           Assista com certeza
                        </option>
                        <option value="Vale a pena assistir">
                           Vale a pena assistir
                        </option>
                        <option value="tem filmes melhores, mas é legal">
                           Tem filmes melhores
                        </option>
                        <option value="não tão bom">Não tão bom</option>
                        <option value="Não perca seu tempo">
                           Não perca seu tempo
                        </option>
                     </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-3">
                     <Form.Label className="fw-bold">Nossa Análise</Form.Label>
                     <Form.Control
                        as="textarea"
                        rows={4}
                        value={review}
                        onChange={(e) => setReview(e.target.value)}
                     />
                  </Form.Group>
               </Form>
            )}
         </Modal.Body>
         <Modal.Footer>
            {step === "form" && !movieToEdit && (
               <Button variant="secondary" onClick={() => setStep("search")}>
                  ⬅ Buscar Outro
               </Button>
            )}
            <Button
               variant="link text-decoration-none text-muted"
               onClick={onHide}
            >
               Fechar
            </Button>
            {step === "form" && (
               <Button variant="success" onClick={handleSave} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar Review"}
               </Button>
            )}
         </Modal.Footer>
      </Modal>
   );
}
