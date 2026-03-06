import { useState, useEffect, useCallback } from "react";
import { Spinner } from "react-bootstrap";
import { ArrowLeft, Pencil, Trash2, Plus, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MovieCard } from "@/features/movies";
import { ConfirmModal } from "@/components/ui/ConfirmModal/ConfirmModal";
import { EditListModal } from "../EditListModal/EditListModal";
import toast from "react-hot-toast";
import type { CustomList, MovieData } from "@/types";
import styles from "./ListDetails.module.css";

interface ListDetailsProps {
   list: CustomList;
   allMovies: MovieData[]; // 👈 RECEBEMOS TODOS OS FILMES AQUI
   currentUserId?: string;
   onBack: () => void;
   onListDeleted: () => void;
   onListUpdated: (updatedList: CustomList) => void;
   onUpdateList: (id: string, name: string, description: string) => Promise<boolean>;
   onRemoveMovie: (listId: string, tmdbId: number) => Promise<boolean>; // 👈 FUNÇÃO DE REMOVER
   onAddMovieClick: () => void;
   onMovieClick: (movie: MovieData) => void;
}

export function ListDetails({ 
   list, 
   allMovies,
   currentUserId,
   onBack, 
   onListDeleted,
   onListUpdated,
   onUpdateList,
   onRemoveMovie,
   onAddMovieClick,
   onMovieClick,
}: ListDetailsProps) {
   const [listMovies, setListMovies] = useState<MovieData[]>([]);
   const [loading, setLoading] = useState(true);
   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
   const [showEditModal, setShowEditModal] = useState(false);
   const [isDeleting, setIsDeleting] = useState(false);
   const [movieToRemove, setMovieToRemove] = useState<number | null>(null);
   const [isRemovingMovie, setIsRemovingMovie] = useState(false);

   const isOwner = currentUserId === list.owner_id;

   const fetchListMovies = useCallback(async () => {
      setLoading(true);
      try {
         // 1. Pega apenas os IDs que pertencem a esta lista
         const { data, error } = await supabase
            .from("list_movies")
            .select("tmdb_id")
            .eq("list_id", list.id);

         if (error) throw error;

         // 2. Filtra os filmes do App.tsx que batem com estes IDs!
         // Adeus chamadas desnecessárias ao TMDB e adeus filmes sem nota!
         const tmdbIds = data?.map(d => d.tmdb_id) || [];
         const populatedMovies = allMovies.filter(m => tmdbIds.includes(m.tmdb_id));
         
         setListMovies(populatedMovies);
      } catch (error) {
         console.error("Erro ao buscar filmes da lista:", error);
         toast.error("Não foi possível carregar os filmes desta lista.");
      } finally {
         setLoading(false);
      }
   }, [list.id, allMovies]);

   useEffect(() => {
      fetchListMovies();
   }, [fetchListMovies]);

   const handleDeleteList = async () => {
      setIsDeleting(true);
      try {
         const { error } = await supabase.from("lists").delete().eq("id", list.id);
         if (error) throw error;
         toast.success("Lista eliminada com sucesso!");
         onListDeleted();
      } catch (err) {
        if (err instanceof Error){
            toast.error("Erro ao eliminar a lista." + err.message);
        } else {
            toast.error("Erro ao eliminar a lista. Ocorreu um erro desconhecido.");
        }
        } 
        finally {
         setIsDeleting(false);
         setShowDeleteConfirm(false);
        }
      };
   

   const confirmRemoveMovie = async () => {
      if (!movieToRemove) return;
      setIsRemovingMovie(true);
      const success = await onRemoveMovie(list.id, movieToRemove);
      setIsRemovingMovie(false);
      
      if (success) {
         setMovieToRemove(null);
         fetchListMovies();
      }
   };

   return (
      <div className={styles.container}>
         <div className={styles.header}>
            <button onClick={onBack} className={styles.backBtn}>
               <ArrowLeft size={20} />
               <span>Voltar às listas</span>
            </button>

            <div className={styles.titleSection}>
               <div>
                  <h1 className={styles.title}>{list.name}</h1>
                  {list.description && <p className={styles.description}>{list.description}</p>}
                  <p className={styles.metaInfo}>{listMovies.length} filmes na lista</p>
               </div>

               {isOwner && (
                  <div className={styles.actions}>
                     <button className={styles.actionBtn} onClick={() => setShowEditModal(true)} title="Editar Lista">
                        <Pencil size={18} />
                     </button>
                     <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => setShowDeleteConfirm(true)} title="Eliminar Lista">
                        <Trash2 size={18} />
                     </button>
                  </div>
               )}
            </div>
         </div>

         <div className={styles.toolbar}>
            {isOwner && (
               <button className={styles.addBtn} onClick={onAddMovieClick}>
                  <Plus size={18} /> Adicionar Filme
               </button>
            )}
         </div>

         {loading ? (
            <div className="text-center py-5"><Spinner animation="border" variant="light" /></div>
         ) : listMovies.length === 0 ? (
            <div className={styles.emptyState}>
               <p>Esta lista ainda não tem filmes.</p>
               {isOwner && (
                  <button className={styles.emptyAddBtn} onClick={onAddMovieClick}>
                     Procurar um filme para adicionar
                  </button>
               )}
            </div>
         ) : (
            <div className="movie-grid">
               {listMovies.map((movie) => (
                  <div key={movie.id} className={styles.movieWrapper}>
                     <MovieCard movie={movie} onClick={() => onMovieClick(movie)} />
                     {isOwner && (
                        <button 
                           className={styles.removeMovieBtn} 
                           onClick={(e) => {
                              e.stopPropagation();
                              setMovieToRemove(movie.tmdb_id);
                           }}
                           title="Remover da lista"
                        >
                           <X size={14} />
                        </button>
                     )}
                  </div>
               ))}
            </div>
         )}

         <EditListModal
            show={showEditModal}
            onHide={() => setShowEditModal(false)}
            list={list}
            onUpdate={async (id, name, desc) => {
               const success = await onUpdateList(id, name, desc);
               if (success) onListUpdated({ ...list, name, description: desc });
               return success;
            }}
         />

        <ConfirmModal
            show={showDeleteConfirm}
            onHide={() => setShowDeleteConfirm(false)}
            onConfirm={handleDeleteList}
            title="Eliminar Lista"
            message={`Tem a certeza que deseja eliminar a lista "${list.name}"? Os filmes não serão apagados do seu perfil.`}
            confirmText="Sim, eliminar"
            isProcessing={isDeleting}
         />

         <ConfirmModal
            show={movieToRemove !== null}
            onHide={() => setMovieToRemove(null)}
            onConfirm={confirmRemoveMovie}
            title="Remover Filme"
            message="Tem a certeza que deseja remover este filme desta lista? (Ele continuará na sua coleção principal)."
            confirmText="Sim, remover"
            isProcessing={isRemovingMovie}
         />
      </div>
   );
}