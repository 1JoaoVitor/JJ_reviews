import { useState, useEffect } from "react";
import { Modal, Form, Spinner} from "react-bootstrap";
import toast from "react-hot-toast";
import { Search, ArrowLeft, ListPlus } from "lucide-react";

import { StarRating } from "@/components/ui/StarRating/StarRating";
import { searchMovies } from "../../services/tmdbService";
import { CreateListModal } from "@/features/lists";

import { supabase } from "@/lib/supabase";
import type { TmdbSearchResult, MovieData, CustomList } from "@/types";
import styles from "./AddMovieModal.module.css";

interface AddMovieModalProps {
   show: boolean;
   onHide: () => void;
   onSuccess: () => void;
   movieToEdit?: MovieData | null;
   lists: CustomList[];
   addMovieToList: (listId: string, tmdbId: number) => Promise<boolean>;
   createList: (name: string, description: string, type?: "private" | "partial_shared" | "full_shared", collaboratorIds?: string[]) => Promise<CustomList | null>;
   preselectedListId?: string;
}

export function AddMovieModal({
   show,
   onHide,
   onSuccess,
   movieToEdit,
   lists,
   addMovieToList,
   createList,
   preselectedListId
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

   const [selectedListId, setSelectedListId] = useState<string>("");
   const [showCreateList, setShowCreateList] = useState(false);
   
   const [exclusiveToList, setExclusiveToList] = useState(false);

   const selectedListDetails = lists.find(l => l.id === selectedListId);
   const isSharedList = selectedListDetails && selectedListDetails.type !== "private";

   // Inicializa os dados do modal
   useEffect(() => {
      if (show) {
         setSelectedListId(preselectedListId || "");
      }

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
         setExclusiveToList(false);
      }
   }, [show, movieToEdit, preselectedListId]); 

   // Verifica se o filme já existe no perfil privado 
   useEffect(() => {
      const checkProfileExistence = async () => {
         if (step === "form" && selectedMovie) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
               const { data } = await supabase
                  .from("reviews")
                  .select("id")
                  .eq("user_id", user.id)
                  .eq("tmdb_id", selectedMovie.id)
                  .maybeSingle();
               
               setExclusiveToList(!data);
            }
         }
      };

      // Só faz essa checagem se estiver editando em uma lista compartilhada
      if (show && isSharedList && selectedMovie) {
         checkProfileExistence();
      }
   }, [step, selectedMovie, show, isSharedList]);

   // Reseta o toggle se trocar para uma lista não-compartilhada
   useEffect(() => {
      if (!isSharedList) {
         setExclusiveToList(false);
      }
   }, [isSharedList]);


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

   // ─── Lógica Atualizada com o parâmetro keepOpen ───
   const handleSave = async (keepOpen = false) => {
      if (!selectedMovie) return;
      setSaving(true);

      try {
         const { data: { user }, error: userError } = await supabase.auth.getUser();

         if (userError || !user) {
            toast.error("Você precisa estar logado para adicionar filmes.");
            setSaving(false);
            return;
         }

         // Verifica duplicatas apenas se estiver criando um filme NOVO no perfil pessoal
         if (!exclusiveToList && !movieToEdit) {
            const { data: existingMovie } = await supabase
               .from("reviews")
               .select("id, status")
               .eq("user_id", user.id)
               .eq("tmdb_id", selectedMovie.id)
               .maybeSingle();

            if (existingMovie) {
               const statusNome = existingMovie.status === "watched" ? "Assistidos" : "Watchlist";
               toast.error(`Este filme já está no seu perfil na aba "${statusNome}".`);
               setSaving(false);
               return;
            }
         }

         // SALVAR NO PERFIL PESSOAL (Se o toggle estiver desligado)
         if (!exclusiveToList) {
            const payload = {
               tmdb_id: selectedMovie.id,
               rating: formStatus === "watched" ? rating : null,
               review: formStatus === "watched" ? review : null,
               recommended: formStatus === "watched" ? recommended : null,
               status: formStatus,
               user_id: user.id,
            };

            const { data: existingPersonalReview } = await supabase
               .from("reviews")
               .select("id")
               .eq("user_id", user.id)
               .eq("tmdb_id", selectedMovie.id)
               .maybeSingle();

            if (existingPersonalReview) {
               await supabase.from("reviews").update(payload).eq("id", existingPersonalReview.id);
            } else {
               await supabase.from("reviews").insert([payload]);
            }
         }

         // SALVAR NA LISTA (Se houver alguma selecionada)
         if (selectedListId && selectedListDetails) {
            const added = await addMovieToList(selectedListId, selectedMovie.id);
            if (!added) {
               throw new Error("Sem permissão para adicionar filmes nesta lista.");
            }

            if (isSharedList && formStatus === "watched") {
               if (selectedListDetails.type === "full_shared") {
                  const { data: existingGroupReview } = await supabase
                     .from('list_reviews')
                     .select('id')
                     .eq('list_id', selectedListId)
                     .eq('tmdb_id', selectedMovie.id)
                     .is('user_id', null)
                     .maybeSingle();

                  if (existingGroupReview) {
                     await supabase.from('list_reviews').update({ rating, review, recommended }).eq('id', existingGroupReview.id);
                  } else {
                     await supabase.from('list_reviews').insert({ list_id: selectedListId, tmdb_id: selectedMovie.id, user_id: null, rating, review, recommended });
                  }
               } else {
                  const { data: existingUserReview } = await supabase
                     .from('list_reviews')
                     .select('id')
                     .eq('list_id', selectedListId)
                     .eq('tmdb_id', selectedMovie.id)
                     .eq('user_id', user.id)
                     .maybeSingle();

                  if (existingUserReview) {
                     await supabase.from('list_reviews').update({ rating, review, recommended }).eq('id', existingUserReview.id);
                  } else {
                     await supabase.from('list_reviews').insert({ list_id: selectedListId, tmdb_id: selectedMovie.id, user_id: user.id, rating, review, recommended });
                  }
               }

               // ─── LÓGICA DE AUTO-SINCRONIZAÇÃO ───
               // Se a lista tiver o auto-sync ligado e o utilizador NÃO marcou como exclusivo da lista,
               // o banco de dados para clona a review para todos os amigos.
               if (selectedListDetails.auto_sync && !exclusiveToList) {
                  const { error: syncError } = await supabase.rpc('sync_review_to_list_members', {
                     p_list_id: selectedListId,
                     p_tmdb_id: selectedMovie.id,
                     p_rating: rating,
                     p_review: review,
                     p_recommended: recommended,
                     p_status: formStatus,
                     p_added_by: user.id
                  });

                  if (syncError) {
                     console.error("Erro ao sincronizar filme com membros da lista:", syncError);
                  }
               }
            }
         }

         // Feedbacks visuais
         if (exclusiveToList) {
            toast.success(`Filme guardado exclusivamente na lista "${selectedListDetails?.name}"!`);
         } else if (selectedListId) {
            toast.success("Filme guardado no seu perfil e na lista!");
         } else {
            toast.success("Filme guardado no seu diário com sucesso!");
         }

         onSuccess();
         
         if (movieToEdit) {
            onHide(); // Edição sempre fecha o modal
         } else if (keepOpen) {
            // Volta para a barra de pesquisa limpinha
            setStep("search");
            setSearchQuery("");
            setSearchResults([]);
            setSelectedMovie(null);
            setRating(5);
            setReview("");
            setRecommended("Vale a pena assistir");
         } else {
            onHide(); // Adição normal também fecha o modal
         }

      } catch (err) {
         toast.error("Erro ao salvar. Verifique a sua conexão.");
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
                              <option value="Tem filmes melhores, mas é legal">Tem filmes melhores</option>
                              <option value="Não tão bom">Não tão bom</option>
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

                  <Form.Group className="mt-4 mb-2">
                     <Form.Label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                        Adicionar a uma lista personalizada (Opcional)
                     </Form.Label>
                     {lists.length > 0 ? (
                        <Form.Select 
                           value={selectedListId} 
                           onChange={(e) => setSelectedListId(e.target.value)}
                           style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                        >
                           <option value="">Nenhuma lista selecionada</option>
                           {lists.map(list => (
                              <option key={list.id} value={list.id}>{list.name}</option>
                           ))}
                        </Form.Select>
                     ) : (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                           Você ainda não tem listas.
                        </p>
                     )}

                     {isSharedList && (
                        <div className="mt-3 p-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--gold)', borderRadius: 'var(--radius-md)' }}>
                           <Form.Check 
                              type="switch"
                              id="exclusive-to-list-switch"
                              className={styles.customSwitch}
                              label={<span style={{ fontWeight: 600, color: 'var(--gold)' }}>Salvar exclusivamente nesta lista compartilhada</span>}
                              checked={exclusiveToList}
                              onChange={(e) => setExclusiveToList(e.target.checked)}
                           />
                           <Form.Text style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginTop: '0.25rem' }}>
                              {exclusiveToList 
                                 ? "Este filme NÃO vai aparecer no seu perfil pessoal." 
                                 : "Este filme será adicionado ao seu perfil pessoal E também nesta lista."}
                           </Form.Text>
                        </div>
                     )}

                     <button
                        type="button"
                        onClick={() => setShowCreateList(true)}
                        style={{
                           background: 'none',
                           border: 'none',
                           color: 'var(--gold)',
                           fontSize: '0.85rem',
                           fontWeight: 600,
                           padding: '0.8rem 0 0',
                           cursor: 'pointer',
                           display: 'flex',
                           alignItems: 'center',
                           gap: '0.3rem',
                        }}
                     >
                        <ListPlus size={14} /> Criar nova lista
                     </button>
                  </Form.Group>

                  <CreateListModal
                     show={showCreateList}
                     onHide={() => setShowCreateList(false)}
                     onCreate={createList}
                  />
               </Form>
            )}
         </Modal.Body>

         <Modal.Footer className="border-0">
            {step === "form" && !movieToEdit && (
               <button className={styles.backBtn} onClick={() => setStep("search")}>
                  <ArrowLeft size={16} /> Buscar Outro
               </button>
            )}
            
            <div className="ms-auto d-flex gap-2 align-items-center">
               <button className={styles.closeBtn} onClick={onHide}>
                  Cancelar
               </button>
               
               {/* Só mostra o botão duplo se for um NOVO filme */}
               {step === "form" && !movieToEdit && (
                  <button 
                     className={styles.saveAndAddBtn} 
                     onClick={() => handleSave(true)} 
                     disabled={saving}
                     title="Salva este filme e volta para buscar o próximo"
                  >
                     {saving ? "..." : "Salvar e Adicionar Outro"}
                  </button>
               )}
               
               {step === "form" && (
                  <button className={styles.saveBtn} onClick={() => handleSave(false)} disabled={saving}>
                     {saving ? "Salvando..." : "Salvar"}
                  </button>
               )}
            </div>
         </Modal.Footer>
      </Modal>
   );
}