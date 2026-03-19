import { useState, useEffect } from "react";
import { Modal, Form, Spinner} from "react-bootstrap";
import toast from "react-hot-toast";
import { Search, ArrowLeft, ListPlus, ImagePlus, X } from "lucide-react"; 

import { StarRating } from "@/components/ui/StarRating/StarRating";
import { searchMovies, getMovieDetails} from "../../services/tmdbService";
import { CreateListModal } from "@/features/lists";
import {
   getAuthenticatedUser,
   getExistingProfileReview,
   hasUserReview,
   syncReviewToListMembers,
   uploadReviewAttachment,
   upsertFullSharedListReview,
   upsertPartialSharedListReview,
   upsertPersonalReview,
} from "../../services/moviePersistenceService";
import type { TmdbSearchResult, MovieData, CustomList } from "@/types";
import styles from "./AddMovieModal.module.css";
import { useModalBack } from "@/hooks/useModalBack";

interface AddMovieModalProps {
   show: boolean;
   onHide: () => void;
   onSuccess: () => void;
   movieToEdit?: MovieData | null;
   lists: CustomList[];
   addMovieToList: (listId: string, tmdbId: number) => Promise<{ success: boolean; error: string | null }>;
   createList: (name: string, description: string, type?: "private" | "partial_shared" | "full_shared", collaboratorIds?: string[], has_rating?: boolean, rating_type?: "manual" | "average" | null, manual_rating?: number | null, auto_sync?: boolean) => Promise<{ success: boolean; data: CustomList | null; error: string | null }>;
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

   useModalBack(show, onHide);
   const [step, setStep] = useState<"search" | "form">("search");
   const [searchQuery, setSearchQuery] = useState("");
   const [searchResults, setSearchResults] = useState<TmdbSearchResult[]>([]);
   const [loadingSearch, setLoadingSearch] = useState(false);

   const [selectedMovie, setSelectedMovie] = useState<TmdbSearchResult | null>(null);
   const [rating, setRating] = useState(5);
   const [review, setReview] = useState("");
   const [recommended, setRecommended] = useState("Vale a pena assistir");
   const [location, setLocation] = useState("");
   const [saving, setSaving] = useState(false);
   const [formStatus, setFormStatus] = useState<"watched" | "watchlist">("watched");

   const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
   const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);

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
         setLocation(movieToEdit.location || "");
         setFormStatus(movieToEdit.status || "watched");
         
         // Se estiver editando e já tiver uma imagem, mostra o preview
         setAttachmentPreview(movieToEdit.attachment_url || null);
         setAttachmentFile(null);

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
         setLocation("");
         setFormStatus("watched");
         setExclusiveToList(false);
         
         // Limpa os anexos
         setAttachmentPreview(null);
         setAttachmentFile(null);
      }
   }, [show, movieToEdit, preselectedListId]); 

   // Verifica se o filme já existe no perfil privado 
   useEffect(() => {
      const checkProfileExistence = async () => {
         if (step === "form" && selectedMovie) {
            const user = await getAuthenticatedUser();
            if (user) {
               const hasReview = await hasUserReview(user.id, selectedMovie.id);
               setExclusiveToList(!hasReview);
            }
         }
      };

      if (show && isSharedList && selectedMovie) {
         checkProfileExistence();
      }
   }, [step, selectedMovie, show, isSharedList]);

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

   // Funções de manipulação de arquivo
   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
         // Validação extra de segurança para garantir que é imagem
         if (!file.type.startsWith("image/")) {
            toast.error("Por favor, selecione apenas imagens.");
            return;
         }
         setAttachmentFile(file);
         setAttachmentPreview(URL.createObjectURL(file)); // Gera URL temporária para miniatura
      }
   };

   const handleRemoveAttachment = () => {
      setAttachmentFile(null);
      setAttachmentPreview(null);
   };

   const handleSave = async (keepOpen = false) => {
      if (!selectedMovie) return;
      setSaving(true);

      try {
         let movieRuntime = 0;
         if (!movieToEdit) {
            const details = await getMovieDetails(selectedMovie.id);
            if (details && details.runtime) {
               movieRuntime = details.runtime;
            }
         }

         const user = await getAuthenticatedUser();
         if (!user) {
            toast.error("Você precisa estar logado para adicionar filmes.");
            setSaving(false);
            return;
         }

         if (!exclusiveToList && !movieToEdit) {
            const existingMovie = await getExistingProfileReview(user.id, selectedMovie.id);

            if (existingMovie) {
               const statusNome = existingMovie.status === "watched" ? "Assistidos" : "Watchlist";
               toast.error(`Este filme já está no seu perfil na aba "${statusNome}".`);
               setSaving(false);
               return;
            }
         }

         // UPLOAD DA IMAGEM
         let finalAttachmentUrl = movieToEdit?.attachment_url || null; // Começa com o antigo

         if (attachmentFile) {
            finalAttachmentUrl = await uploadReviewAttachment(user.id, attachmentFile);
         } else if (!attachmentPreview) {
            // Se não tem arquivo novo e apagaram o preview, limpa do banco
            finalAttachmentUrl = null; 
         }

         // SALVAR NO PERFIL PESSOAL
         if (!exclusiveToList) {
            await upsertPersonalReview(user.id, selectedMovie.id, {
               rating: formStatus === "watched" ? rating : null,
               review: formStatus === "watched" ? review : null,
               recommended: formStatus === "watched" ? recommended : null,
               runtime: movieRuntime,
               location: formStatus === "watched" ? location : null,
               status: formStatus,
               attachment_url: formStatus === "watched" ? finalAttachmentUrl : null, // 👈 Anexo aqui!
            });
         }

         // SALVAR NA LISTA
         if (selectedListId && selectedListDetails) {
            const added = await addMovieToList(selectedListId, selectedMovie.id);
            if (!added) {
               throw new Error("Sem permissão para adicionar filmes nesta lista.");
            }

            if (isSharedList && formStatus === "watched") {
               if (selectedListDetails.type === "full_shared") {
                  await upsertFullSharedListReview(selectedListId, selectedMovie.id, { rating, review, recommended });
               } else {
                  await upsertPartialSharedListReview(selectedListId, selectedMovie.id, user.id, {
                     rating,
                     review,
                     recommended,
                     location,
                     runtime: movieRuntime,
                  });
               }

               if (selectedListDetails.auto_sync && !exclusiveToList) {
                  try {
                     await syncReviewToListMembers({
                        listId: selectedListId,
                        tmdbId: selectedMovie.id,
                        rating,
                        review,
                        recommended,
                        status: formStatus,
                        addedBy: user.id,
                        location,
                        runtime: movieRuntime,
                     });
                  } catch (syncError) {
                     console.error("Erro ao sincronizar filme com membros da lista:", syncError);
                  }
               }
            }
         }

         if (exclusiveToList) {
            toast.success(`Filme guardado exclusivamente na lista "${selectedListDetails?.name}"!`);
         } else if (selectedListId) {
            toast.success("Filme guardado no seu perfil e na lista!");
         } else {
            toast.success("Filme guardado no seu diário com sucesso!");
         }

         onSuccess();
         
         if (movieToEdit) {
            onHide(); 
         } else if (keepOpen) {
            setStep("search");
            setSearchQuery("");
            setSearchResults([]);
            setSelectedMovie(null);
            setRating(5);
            setReview("");
            setRecommended("Vale a pena assistir");
            setAttachmentFile(null);
            setAttachmentPreview(null);
         } else {
            onHide();
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
                           <Form.Label className={styles.formLabel}>Onde Assistiu? (Opcional)</Form.Label>
                           <Form.Control
                              type="text"
                              placeholder="Ex: Cinemark, Netflix, Em casa..."
                              value={location}
                              onChange={(e) => setLocation(e.target.value)}
                              maxLength={50}
                              list="locations-list"
                           />
                           <datalist id="locations-list">
                              <option value="Em casa" />
                              <option value="Netflix" />
                              <option value="Amazon Prime" />
                              <option value="Max" />
                              <option value="Disney+" />
                              <option value="Cinemark" />
                              <option value="Cinépolis" />
                           </datalist>
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

                        <Form.Group className="mb-4">
                           <Form.Label className={styles.formLabel}>Anexar Imagem (Opcional)</Form.Label>
                           {attachmentPreview ? (
                              <div className={styles.attachmentPreviewWrapper}>
                                 <img 
                                    src={attachmentPreview} 
                                    alt="Anexo" 
                                    className={styles.attachmentPreviewImage}
                                 />
                                 <button 
                                    type="button" 
                                    onClick={handleRemoveAttachment} 
                                    className={styles.attachmentRemoveBtn}
                                 >
                                    <X size={16} />
                                 </button>
                              </div>
                           ) : (
                              <div>
                                 <input 
                                    type="file" 
                                    id="attachment-upload" 
                                    accept="image/*" 
                                    className={styles.fileInputHidden}
                                    onChange={handleFileChange} 
                                 />
                                 <label 
                                    htmlFor="attachment-upload" 
                                    className={styles.attachmentUploadLabel}
                                 >
                                    <ImagePlus size={18} /> Selecionar Foto (Bilhete, Coleção...)
                                 </label>
                              </div>
                           )}
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
                     <Form.Label className={styles.listLabel}>
                        Adicionar a uma lista personalizada (Opcional)
                     </Form.Label>
                     {lists.length > 0 ? (
                        <Form.Select 
                           value={selectedListId} 
                           onChange={(e) => setSelectedListId(e.target.value)}
                           className={styles.listSelect}
                        >
                           <option value="">Nenhuma lista selecionada</option>
                           {lists.map(list => (
                              <option key={list.id} value={list.id}>{list.name}</option>
                           ))}
                        </Form.Select>
                     ) : (
                        <p className={styles.noListsText}>
                           Você ainda não tem listas.
                        </p>
                     )}

                     {isSharedList && (
                        <div className={`mt-3 p-3 ${styles.sharedListCard}`}>
                           <Form.Check 
                              type="switch"
                              id="exclusive-to-list-switch"
                              className={styles.customSwitch}
                              label={<span className={styles.sharedListTitle}>Salvar exclusivamente nesta lista compartilhada</span>}
                              checked={exclusiveToList}
                              onChange={(e) => setExclusiveToList(e.target.checked)}
                           />
                           <Form.Text className={styles.sharedListText}>
                              {exclusiveToList 
                                 ? "Este filme NÃO vai aparecer no seu perfil pessoal." 
                                 : "Este filme será adicionado ao seu perfil pessoal E também nesta lista."}
                           </Form.Text>
                        </div>
                     )}

                     <button
                        type="button"
                        onClick={() => setShowCreateList(true)}
                        className={styles.createListInlineBtn}
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